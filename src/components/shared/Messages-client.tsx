'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, UserCircle2 } from 'lucide-react';
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
  lastMessage: string;
}

export function MessagesClient({ currentUserId }: { currentUserId: string }) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [activePeer, setActivePeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load initial feed
    fetch('/api/messages')
      .then(r => r.json())
      .then(data => {
        if (!data.messages) return;
        const msgList: Message[] = data.messages;
        
        // Extract unique peers
        const peerMap = new Map<string, Peer>();
        msgList.forEach(m => {
          const isSender = m.sender_id === currentUserId;
          const peerId = isSender ? m.receiver_id : m.sender_id;
          const peerProfile = isSender ? m.receiver : m.sender;
          
          if (!peerMap.has(peerId)) {
            peerMap.set(peerId, {
              id: peerId,
              full_name: peerProfile.full_name || 'Unknown User',
              avatar_url: peerProfile.avatar_url,
              lastMessage: m.content
            });
          } else {
            // update last message (since ordered ascending, the latest loop overrides)
            const p = peerMap.get(peerId)!;
            p.lastMessage = m.content;
          }
        });
        
        setPeers(Array.from(peerMap.values()));
      });
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
    const interval = setInterval(loadConversation, 5000); // Simple polling MVP
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
    <div className="flex h-[80vh] border rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Sidebar - Contacts */}
      <div className="w-1/3 border-r flex flex-col bg-gray-50/50">
        <div className="p-4 border-b bg-white">
          <h2 className="font-bold text-lg">Inbox</h2>
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
  );
}
