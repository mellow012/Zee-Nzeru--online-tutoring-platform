'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquare, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender: { full_name: string; avatar_url: string | null };
  receiver: { full_name: string; avatar_url: string | null };
  content: string;
  created_at: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/messages?admin=true')
      .then(res => res.json())
      .then(data => {
        if (data.messages) setMessages(data.messages);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-emerald-500 w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Message Moderation</h1>
        <p className="text-muted-foreground mt-2">Global overview of all communications on the platform for dispute resolution.</p>
      </div>

      <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <strong>Privacy Notice:</strong> As an admin, you have access to read all private communications. 
          Only use this tool to resolve reported disputes or investigate terms of service violations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Communications Feed</CardTitle>
          <CardDescription>Live feed of the latest 200 messages exchanged.</CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-10 text-gray-500 flex flex-col items-center">
              <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
              <p>No messages sent yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={msg.sender?.avatar_url || ''} />
                        <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-800">S</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold">{msg.sender?.full_name}</span>
                      <span className="text-xs text-gray-400">sent to</span>
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={msg.receiver?.avatar_url || ''} />
                        <AvatarFallback className="text-[10px] bg-blue-100 text-blue-800">R</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold">{msg.receiver?.full_name}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      {format(new Date(msg.created_at), 'MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-800 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
