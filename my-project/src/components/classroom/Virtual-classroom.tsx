'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Whiteboard } from '@/components/shared/White-board';
import { MaterialsPanel } from '@/components/shared/Materials-panel';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
  Pen, FileText, X, Send, Hand, CheckCircle,
} from 'lucide-react';
import type { Session } from '@/lib/types';

interface VirtualClassroomProps {
  sessionId: string;
}

interface ChatMessage {
  sender: string;
  message: string;
  time: string;
}

export function VirtualClassroom({ sessionId }: VirtualClassroomProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sessionEnded, setSessionEnded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const res = await fetch(`/api/classroom?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setSession(data.session);
    };
    fetchSession();

    // Join
    fetch('/api/classroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: 'join' }),
    });

    timerRef.current = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sessionId]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { sender: user?.fullName ?? 'You', message: newMessage, time: new Date().toLocaleTimeString() },
    ]);
    setNewMessage('');
  };

  const endSession = async () => {
    await fetch('/api/classroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: 'end' }),
    });
    if (timerRef.current) clearInterval(timerRef.current);
    setSessionEnded(true);
    toast({ title: 'Session ended', description: 'Thank you for the session!' });
  };

  const saveWhiteboard = async (data: string) => {
    await fetch('/api/classroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: 'save_whiteboard', whiteboardData: data }),
    });
    toast({ title: 'Whiteboard saved!' });
  };

  if (sessionEnded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-center">Session Completed</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <p className="text-gray-500">Duration: {formatTime(elapsedTime)}</p>
            <p className="text-gray-500">Subject: {session?.subject}</p>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => router.push(user?.role === 'tutor' ? '/tutor' : '/student')}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge className="bg-red-500 animate-pulse">● LIVE</Badge>
          <span>{session?.subject ?? 'Loading...'}</span>
          <span className="text-gray-400">|</span>
          <span>{formatTime(elapsedTime)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-white border-gray-600" onClick={() => setWhiteboardOpen(!whiteboardOpen)}>
            <Pen className="w-4 h-4 mr-1" /> Whiteboard
          </Button>
          <Button variant="outline" size="sm" className="text-white border-gray-600" onClick={() => setMaterialsOpen(!materialsOpen)}>
            <FileText className="w-4 h-4 mr-1" /> Materials
          </Button>
          <Button variant="outline" size="sm" className="text-white border-gray-600" onClick={() => setChatOpen(!chatOpen)}>
            <MessageSquare className="w-4 h-4 mr-1" /> Chat
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex-1 grid grid-cols-2 gap-4">
            {[
              { name: session?.tutor?.full_name ?? 'Tutor', label: 'Tutor', color: 'bg-teal-600' },
              { name: session?.student?.full_name ?? 'Student', label: 'Student', color: 'bg-emerald-600' },
            ].map(({ name, label, color }) => (
              <div key={label} className="bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center text-white">
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarFallback className={`${color} text-2xl`}>{name[0]}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-gray-400">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <Button
              variant={isAudioOn ? 'default' : 'destructive'}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={() => setIsAudioOn(!isAudioOn)}
            >
              {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </Button>
            <Button
              variant={isVideoOn ? 'default' : 'destructive'}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={() => setIsVideoOn(!isVideoOn)}
            >
              {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>
            <Button
              variant={isHandRaised ? 'default' : 'outline'}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={() => setIsHandRaised(!isHandRaised)}
            >
              <Hand className="w-6 h-6" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={() => setChatOpen(!chatOpen)}
            >
              <MessageSquare className="w-6 h-6" />
            </Button>
            <Button variant="destructive" size="lg" className="rounded-full w-14 h-14" onClick={endSession}>
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Side panels */}
        {whiteboardOpen && (
          <div className="w-[500px] bg-white border-l p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Whiteboard</h3>
              <Button variant="ghost" size="sm" onClick={() => setWhiteboardOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <Whiteboard onSave={saveWhiteboard} />
          </div>
        )}

        {chatOpen && (
          <div className="w-80 bg-white border-l flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Chat</h3>
              <Button variant="ghost" size="sm" onClick={() => setChatOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className="mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{msg.sender}</span>
                    <span className="text-gray-400 text-xs">{msg.time}</span>
                  </div>
                  <p className="text-gray-700 bg-gray-100 rounded-lg px-3 py-2 mt-1">{msg.message}</p>
                </div>
              ))}
            </ScrollArea>
            <div className="p-4 border-t flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button size="icon" onClick={sendMessage}><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {materialsOpen && (
          <div className="w-80 bg-white border-l overflow-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Materials</h3>
              <Button variant="ghost" size="sm" onClick={() => setMaterialsOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <MaterialsPanel sessionId={sessionId} />
          </div>
        )}
      </div>
    </div>
  );
}