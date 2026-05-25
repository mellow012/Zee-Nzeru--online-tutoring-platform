'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, UserCircle2, Plus, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender: { full_name: string; avatar_url: string | null };
  receiver: { full_name: string; avatar_url: string | null };
}

interface Peer {
  id: string;
  full_name: string;
  avatar_url: string | null;
  lastMessage: string;
  updatedAt: number; // to sort by recent
}

export function MessagesClient({ currentUserId }: { currentUserId: string }) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [activePeer, setActivePeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Search/New Chat Modal States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // 1. Initial Load of Feed
  const loadFeed = () => {
    fetch('/api/messages')
      .then(r => r.json())
      .then(data => {
        const msgList: Message[] = data.messages ?? [];
        const contactList = data.contacts ?? [];
        
        const peerMap = new Map<string, Peer>();

        // Seed contacts
        contactList.forEach((c: any) => {
          peerMap.set(c.user_id, {
            id: c.user_id,
            full_name: c.full_name || 'Unknown User',
            avatar_url: c.avatar_url,
            lastMessage: 'Click to start chatting...',
            updatedAt: 0,
          });
        });
        
        // Overlay latest messages
        msgList.forEach(m => {
          const isSender = m.sender_id === currentUserId;
          const peerId = isSender ? m.receiver_id : m.sender_id;
          const peerProfile = isSender ? m.receiver : m.sender;
          const msgTime = new Date(m.created_at).getTime();
          
          if (!peerMap.has(peerId)) {
            peerMap.set(peerId, {
              id: peerId,
              full_name: peerProfile?.full_name || 'Unknown User',
              avatar_url: peerProfile?.avatar_url || null,
              lastMessage: m.content,
              updatedAt: msgTime,
            });
          } else {
            const p = peerMap.get(peerId)!;
            // only update if this message is newer
            if (msgTime >= p.updatedAt) {
              p.lastMessage = m.content;
              p.updatedAt = msgTime;
              if (peerProfile) {
                if (peerProfile.full_name) p.full_name = peerProfile.full_name;
                if (peerProfile.avatar_url) p.avatar_url = peerProfile.avatar_url;
              }
            }
          }
        });
        
        const sortedPeers = Array.from(peerMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
        setPeers(sortedPeers);
      });
  };

  useEffect(() => {
    loadFeed();
  }, [currentUserId]);

  // 2. Load Active Conversation
  const loadConversation = (peerId: string) => {
    fetch(`/api/messages?peerId=${peerId}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages) {
          setMessages(data.messages);
          scrollToBottom();
        }
      });
  };

  useEffect(() => {
    if (!activePeer) return;
    loadConversation(activePeer.id);
  }, [activePeer]);

  // 3. Setup Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase.channel('realtime:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as any;
          // Check if message is relevant to us
          if (newMsg.sender_id === currentUserId || newMsg.receiver_id === currentUserId) {
            
            // If it belongs to active conversation, fetch to get relations (profiles) or append directly
            // Appending directly is faster, but we lack `sender.full_name` etc. So we just reload the conversation
            if (activePeer && (newMsg.sender_id === activePeer.id || newMsg.receiver_id === activePeer.id)) {
               loadConversation(activePeer.id);
            }
            
            // Reload the feed to update "Last Message" and sorting
            loadFeed();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activePeer]);

  // A. Search Profiles client-side on debounced search query
  useEffect(() => {
    if (!dialogOpen) return;
    
    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true);
      try {
        let queryBuilder = supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role')
          .neq('user_id', currentUserId)
          .limit(10);
          
        if (searchQuery.trim()) {
          queryBuilder = queryBuilder.ilike('full_name', `%${searchQuery}%`);
        }
        
        const { data, error } = await queryBuilder;
        if (!error && data) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Error searching profiles:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, dialogOpen, currentUserId, supabase]);

  // B. Listen for peerId in URL search params to auto-open / initiate a chat
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const peerId = params.get('peerId');
    if (!peerId) return;

    const checkAndInitChat = async () => {
      if (peers.length === 0) return;

      const existing = peers.find(p => p.id === peerId);
      if (existing) {
        setActivePeer(existing);
        return;
      }

      // Load profile info for the user to initiate a new session/chat
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .eq('user_id', peerId)
        .single();

      if (!error && profile) {
        const newPeer: Peer = {
          id: profile.user_id,
          full_name: profile.full_name || 'Unknown User',
          avatar_url: profile.avatar_url,
          lastMessage: 'Click to start chatting...',
          updatedAt: Date.now(),
        };
        setPeers(prev => {
          if (prev.some(p => p.id === newPeer.id)) return prev;
          return [newPeer, ...prev];
        });
        setActivePeer(newPeer);
      }
    };
    
    checkAndInitChat();
  }, [peers, supabase]);

  // C. Start a new chat from search selection
  const handleStartChat = (user: any) => {
    const existing = peers.find(p => p.id === user.user_id);
    if (existing) {
      setActivePeer(existing);
    } else {
      const newPeer: Peer = {
        id: user.user_id,
        full_name: user.full_name || 'Unknown User',
        avatar_url: user.avatar_url,
        lastMessage: 'Click to start chatting...',
        updatedAt: Date.now()
      };
      setPeers(prev => [newPeer, ...prev]);
      setActivePeer(newPeer);
    }
    setDialogOpen(false);
    setSearchQuery('');
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activePeer) return;

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId: activePeer.id, content: newMessage })
    });
    
    if (res.ok) {
      setNewMessage('');
      fetch(`/api/messages?peerId=${activePeer.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.messages) {
            setMessages(data.messages);
            scrollToBottom();
          }
        });
    }
  };

  return (
    <>
      <div className="flex h-[80vh] border rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Sidebar - Contacts */}
      <div className="w-1/3 border-r flex flex-col bg-gray-50/50">
        <div className="p-4 border-b bg-white flex items-center justify-between">
          <h2 className="font-bold text-lg">Inbox</h2>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-8 gap-1"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Start Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {peers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No conversations yet.<br/>Book a session to start chatting!</div>
          ) : (
            peers.map(peer => (
              <div 
                key={peer.id} 
                onClick={() => setActivePeer(peer)}
                className={`p-4 border-b flex items-center gap-3 cursor-pointer transition-colors ${activePeer?.id === peer.id ? 'bg-emerald-50 border-emerald-100' : 'hover:bg-gray-100'}`}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={peer.avatar_url || ''} />
                  <AvatarFallback><UserCircle2 className="w-6 h-6 text-gray-400"/></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-gray-900">{peer.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{peer.lastMessage}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col bg-white">
        {activePeer ? (
          <>
            <div className="p-4 border-b flex items-center gap-3 shadow-sm z-10 bg-white">
               <Avatar className="w-10 h-10">
                  <AvatarImage src={activePeer.avatar_url || ''} />
                  <AvatarFallback><UserCircle2 className="w-6 h-6 text-gray-400"/></AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold">{activePeer.full_name}</h3>
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Online Platform
                  </p>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30" ref={scrollRef}>
              {messages.map(msg => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none'}`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-white border-t">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input 
                  className="rounded-full bg-gray-50"
                  placeholder="Type a message..." 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                />
                <Button type="submit" size="icon" className="rounded-full bg-emerald-600 hover:bg-emerald-700 shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
             <div className="p-4 bg-gray-50 rounded-full">
               <Send className="w-8 h-8 text-gray-300" />
             </div>
             <p>Select a contact to view your conversation</p>
          </div>
        )}
      </div>
    </div>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a New Chat</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {searchLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                No users found matching your search.
              </div>
            ) : (
              searchResults.map((u) => (
                <div
                  key={u.user_id}
                  onClick={() => handleStartChat(u)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-100 transition-all"
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={u.avatar_url || ''} />
                    <AvatarFallback>
                      <UserCircle2 className="w-6 h-6 text-gray-400" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{u.full_name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium capitalize">
                      {u.role}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
