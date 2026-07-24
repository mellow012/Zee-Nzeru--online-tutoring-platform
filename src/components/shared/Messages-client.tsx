'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, UserCircle2, Plus, Search, MessageSquare, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

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
  role?: string;
  lastMessage: string;
}

export function MessagesClient({ currentUserId }: { currentUserId: string }) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [activePeer, setActivePeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadFeed = async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      if (!data.success && !data.messages) return;

      const msgList: Message[] = data.messages ?? [];
      const contactList = data.contacts ?? [];
      setAvailableContacts(contactList);

      const peerMap = new Map<string, Peer>();

      // Seed with contacts
      contactList.forEach((c: any) => {
        peerMap.set(c.user_id, {
          id: c.user_id,
          full_name: c.full_name || 'User',
          avatar_url: c.avatar_url,
          role: c.role,
          lastMessage: 'Tap to open conversation...'
        });
      });

      // Overlay actual messages
      msgList.forEach((m) => {
        const isSender = m.sender_id === currentUserId;
        const peerId = isSender ? m.receiver_id : m.sender_id;
        const peerProfile = isSender ? m.receiver : m.sender;

        if (!peerMap.has(peerId)) {
          peerMap.set(peerId, {
            id: peerId,
            full_name: peerProfile?.full_name || 'User',
            avatar_url: peerProfile?.avatar_url || null,
            lastMessage: m.content
          });
        } else {
          const p = peerMap.get(peerId)!;
          p.lastMessage = m.content;
          if (peerProfile) {
            if (peerProfile.full_name) p.full_name = peerProfile.full_name;
            if (peerProfile.avatar_url) p.avatar_url = peerProfile.avatar_url;
          }
        }
      });

      setPeers(Array.from(peerMap.values()));
    } catch (err) {
      console.error('Failed to load message feed:', err);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [currentUserId]);

  useEffect(() => {
    if (!activePeer) return;
    const loadConversation = () => {
      fetch(`/api/messages?peerId=${activePeer.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.messages) {
            setMessages(data.messages);
            scrollToBottom();
          }
        });
    };
    loadConversation();
    const interval = setInterval(loadConversation, 5000);
    return () => clearInterval(interval);
  }, [activePeer]);

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

    const msgText = newMessage.trim();
    setNewMessage('');

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId: activePeer.id, content: msgText })
    });

    if (res.ok) {
      fetch(`/api/messages?peerId=${activePeer.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.messages) {
            setMessages(data.messages);
            scrollToBottom();
            loadFeed();
          }
        });
    }
  };

  const startNewChat = (contact: { user_id: string; full_name: string; avatar_url: string | null; role?: string }) => {
    const newPeer: Peer = {
      id: contact.user_id,
      full_name: contact.full_name,
      avatar_url: contact.avatar_url,
      role: contact.role,
      lastMessage: 'Tap to start chatting...'
    };

    setPeers((prev) => {
      if (prev.some(p => p.id === contact.user_id)) return prev;
      return [newPeer, ...prev];
    });

    setActivePeer(newPeer);
    setNewChatOpen(false);
  };

  const filteredContacts = availableContacts.filter((c) =>
    (c.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[80vh] border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
      {/* Sidebar - Contacts */}
      <div className="w-1/3 border-r border-border flex flex-col bg-accent/20">
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <MessageSquare size={18} className="text-emerald-600" />
            Inbox
          </h2>
          <Button
            size="sm"
            onClick={() => setNewChatOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1 text-xs px-2.5 h-8"
          >
            <Plus size={14} /> New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {peers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm space-y-3">
              <p>No active conversations yet.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setNewChatOpen(true)}
                className="rounded-xl border-border text-xs gap-1.5"
              >
                <Sparkles size={14} className="text-emerald-600" /> Start a Conversation
              </Button>
            </div>
          ) : (
            peers.map((peer) => (
              <div
                key={peer.id}
                onClick={() => setActivePeer(peer)}
                className={`p-4 border-b border-border flex items-center gap-3 cursor-pointer transition-colors ${
                  activePeer?.id === peer.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                    : 'hover:bg-accent/50'
                }`}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={peer.avatar_url || ''} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold">
                    {peer.full_name ? peer.full_name[0].toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm truncate text-foreground">{peer.full_name}</p>
                    {peer.role && (
                      <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                        {peer.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{peer.lastMessage}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col bg-card">
        {activePeer ? (
          <>
            <div className="p-4 border-b border-border flex items-center gap-3 shadow-xs z-10 bg-card">
              <Avatar className="w-10 h-10">
                <AvatarImage src={activePeer.avatar_url || ''} />
                <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold">
                  {activePeer.full_name ? activePeer.full_name[0].toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-foreground text-sm sm:text-base">{activePeer.full_name}</h3>
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span> Active Now
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-accent/10" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs py-12">
                  No messages yet. Send a message below to start chatting!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                          isMe
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-accent/80 text-foreground border border-border rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {format(new Date(msg.created_at), 'h:mm a')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-card border-t border-border">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  className="rounded-xl bg-accent/30 text-sm"
                  placeholder={`Message ${activePeer.full_name.split(' ')[0]}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
              <MessageSquare size={32} />
            </div>
            <h3 className="font-bold text-foreground text-lg">Your Messages</h3>
            <p className="text-sm max-w-sm">Select an existing contact from the left or click "New Chat" to connect with tutors or students.</p>
            <Button
              onClick={() => setNewChatOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 mt-2"
            >
              <Plus size={16} /> Start a New Conversation
            </Button>
          </div>
        )}
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Start a New Conversation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {filteredContacts.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">No matching contacts found.</p>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.user_id}
                    onClick={() => startNewChat(contact)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={contact.avatar_url || ''} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold text-xs">
                          {contact.full_name ? contact.full_name[0].toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{contact.full_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{contact.role || 'Member'}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs text-emerald-600 font-semibold">
                      Chat
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
