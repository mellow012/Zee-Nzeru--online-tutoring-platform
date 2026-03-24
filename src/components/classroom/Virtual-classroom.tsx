'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AgoraRTC, { 
  useJoin, 
  useLocalCameraTrack, 
  useLocalMicrophoneTrack, 
  useRemoteUsers,
  LocalVideoTrack,
  RemoteUser,
  LocalAudioTrack
} from "agora-rtc-react";
import { completeSessionAction, sendSessionPing } from"../../app/actions/Session-actions";
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
import { createClient } from '@/lib/supabase/client';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare,
  Pen, FileText, X, Send, Hand, CheckCircle, Camera, AlertCircle
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
  const supabase = createClient();

  // --- STATE ---
  const [session, setSession] = useState<Session | null>(null);
  const [agoraConfig, setAgoraConfig] = useState<{
    appId: string;
    channel: string;
    token: string;
  } | null>(null);

  const [isJoined, setIsJoined] = useState(false);
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
  const [isPinging, setIsPinging] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- AGORA HOOKS ---
  useJoin({
    appid: agoraConfig?.appId || "",
    channel: agoraConfig?.channel || "",
    token: agoraConfig?.token || null,
  }, !!agoraConfig && isJoined);

  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isAudioOn);
  const { localCameraTrack } = useLocalCameraTrack(isVideoOn);
  const remoteUsers = useRemoteUsers();

  // --- EFFECT 1: INITIAL DATA & CONNECTION MONITORING ---
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/classroom?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success) {
          setSession(data.session);
          setAgoraConfig({
            appId: data.classroom.agoraAppId,
            channel: data.classroom.agoraChannel,
            token: data.classroom.agoraToken,
          });
        }
      } catch (err) {
        console.error("Session fetch error:", err);
      }
    };
    
    fetchSession();

    // Stability Monitoring for patchy internet
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    const handleStateChange = (curState: string) => {
      if (curState === "RECONNECTING") {
        toast({ 
          title: "Network Unstable", 
          description: "Attempting to reconnect...", 
          variant: "destructive" 
        });
      }
    };
    client.on("connection-state-change", handleStateChange);

    // Update DB with join timestamp
    fetch('/api/classroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, action: 'join' }),
    });

    timerRef.current = setInterval(() => setElapsedTime((t) => t + 1), 1000);

    return () => { 
      if (timerRef.current) clearInterval(timerRef.current); 
      client.off("connection-state-change", handleStateChange);
    };
  }, [sessionId, toast]);

  // --- EFFECT 2: REALTIME BROADCAST & PING LISTENER ---
  useEffect(() => {
    if (!sessionId || !user) return;

    // Listen for nudges from the other person
    const pingChannel = supabase
      .channel(`pings-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_pings',
        filter: `receiver_id=eq.${user.userId}`
      }, () => {
        toast({
          title: "🔔 Connection Nudge",
          description: "The other person is waiting for you!",
          duration: 6000,
        });
      })
      .subscribe();

    // Broadcast channel for chat and UI interactions
    const roomChannel = supabase.channel(`room_${sessionId}`, {
      config: { broadcast: { self: true } }
    });

    roomChannel
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setChatMessages((prev) => [...prev, payload]);
        if (!chatOpen) toast({ title: `Message from ${payload.sender}` });
      })
      .on('broadcast', { event: 'hand-raise' }, ({ payload }) => {
        toast({ 
          title: payload.isRaised ? "✋ Hand Raised" : "Hand Lowered", 
          description: `${payload.user} needs attention.` 
        });
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(pingChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [sessionId, user, chatOpen, toast, supabase]);

  // --- HANDLERS ---
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handlePing = async () => {
    if (!session || isPinging) return;
    setIsPinging(true);

    const isTutor = user?.role === 'tutor';
    const receiverId = isTutor ? session.student_id : session.tutor_id;

    const result = await sendSessionPing(sessionId, receiverId);
    if (result.success) {
      toast({ title: "Nudge Sent", description: "They have been notified." });
    }
    
    setTimeout(() => setIsPinging(false), 20000); // 20s cooldown
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const msg = { 
      sender: user?.fullName ?? 'User', 
      message: newMessage, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    await supabase.channel(`room_${sessionId}`).send({
      type: 'broadcast',
      event: 'chat',
      payload: msg,
    });
    setNewMessage('');
  };

  const toggleHandRaise = async () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    await supabase.channel(`room_${sessionId}`).send({
      type: 'broadcast',
      event: 'hand-raise',
      payload: { user: user?.fullName, isRaised: newState },
    });
  };

  const endSession = async () => {
    if (user?.role !== 'tutor') {
      setSessionEnded(true);
      return;
    }

    const notes = prompt("Briefly summarize today's lesson (optional):");
    const result = await completeSessionAction(sessionId, notes || "");
    
    if (result.success) {
      setSessionEnded(true);
      toast({ title: "Session Saved", description: "Class summary has been recorded." });
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
  };

  // --- LOBBY VIEW ---
  if (!isJoined) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-[60] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-800 border-gray-700 text-white shadow-2xl">
          <CardHeader className="border-b border-gray-700">
            <CardTitle className="text-center">Classroom Lobby</CardTitle>
            <p className="text-center text-gray-400 text-xs">{session?.subject || "Preparing your session..."}</p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="aspect-video bg-gray-950 rounded-xl overflow-hidden border-2 border-gray-700 relative">
              {isVideoOn ? (
                <LocalVideoTrack track={localCameraTrack} play className="w-full h-full object-cover scale-x-[-1]" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-700"><Camera className="w-12 h-12" /></div>
              )}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                 <Button variant={isAudioOn ? "secondary" : "destructive"} size="icon" className="rounded-full" onClick={() => setIsAudioOn(!isAudioOn)}>
                   {isAudioOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                 </Button>
                 <Button variant={isVideoOn ? "secondary" : "destructive"} size="icon" className="rounded-full" onClick={() => setIsVideoOn(!isVideoOn)}>
                   {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                 </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button 
                className="w-full bg-emerald-600 h-14 text-lg font-bold"
                onClick={() => setIsJoined(true)}
                disabled={!agoraConfig}
              >
                {agoraConfig ? "Enter Classroom" : "Connecting..."}
              </Button>

              <Button 
                variant="outline" 
                className="w-full border-gray-600 text-gray-400 hover:text-white"
                onClick={handlePing}
                disabled={isPinging || !session}
              >
                <Hand className={`w-4 h-4 mr-2 ${isPinging ? 'animate-bounce' : ''}`} />
                {isPinging ? "Nudging..." : `Nudge ${user?.role === 'tutor' ? 'Student' : 'Tutor'}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- END SESSION VIEW ---
  if (sessionEnded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-gray-800 bg-gray-900 text-white">
          <CardHeader><CardTitle className="text-center">Session Complete</CardTitle></CardHeader>
          <CardContent className="text-center space-y-8 py-10">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-black text-emerald-400">{formatTime(elapsedTime)}</p>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Recorded Duration</p>
            </div>
            <Button className="w-full bg-white text-black hover:bg-gray-100 h-12 font-bold" onClick={() => router.push(user?.role === 'tutor' ? '/tutor' : '/student')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-md border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-2 px-3">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
          </Badge>
          <h1 className="font-bold text-gray-200">{session?.subject || "Classroom"}</h1>
          <span className="text-xs font-mono text-emerald-500 bg-emerald-500/5 px-2 py-1 rounded">
            {formatTime(elapsedTime)}
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className={whiteboardOpen ? 'bg-white text-black' : 'text-gray-400'} onClick={() => setWhiteboardOpen(!whiteboardOpen)}>
            <Pen className="w-4 h-4 mr-2" /> Whiteboard
          </Button>
          <Button variant="ghost" size="sm" className={materialsOpen ? 'bg-white text-black' : 'text-gray-400'} onClick={() => setMaterialsOpen(!materialsOpen)}>
            <FileText className="w-4 h-4 mr-2" /> Materials
          </Button>
          <Button variant="ghost" size="sm" className={chatOpen ? 'bg-white text-black' : 'text-gray-400'} onClick={() => setChatOpen(!chatOpen)}>
            <MessageSquare className="w-4 h-4 mr-2" /> Chat
          </Button>
        </nav>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Video Stage */}
        <section className="flex-1 p-6 flex flex-col gap-6">
          <div className="flex-1 grid grid-cols-2 gap-6">
            {/* Local View */}
            <article className="bg-gray-900 rounded-2xl overflow-hidden relative border border-gray-800 shadow-xl">
              {isVideoOn ? (
                <LocalVideoTrack track={localCameraTrack} play className="w-full h-full object-cover scale-x-[-1]" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-gray-900">
                  <Avatar className="w-24 h-24 border-2 border-emerald-500/20">
                    <AvatarFallback className="bg-emerald-950 text-emerald-400 text-2xl">{user?.fullName?.[0]}</AvatarFallback>
                  </Avatar>
                  <p className="mt-4 text-sm text-gray-500">{user?.fullName} (You)</p>
                </div>
              )}
              <footer className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
                 <span className="text-[10px] font-bold text-gray-300 uppercase">You</span>
                 {isAudioOn ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-red-500" />}
              </footer>
            </article>

            {/* Remote View */}
            <article className="bg-gray-900 rounded-2xl overflow-hidden relative border border-gray-800 shadow-xl">
              {remoteUsers.length > 0 ? (
                <RemoteUser user={remoteUsers[0]} playVideo={true} playAudio={true} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-gray-900/50">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
                    <Avatar className="w-24 h-24 border-2 border-gray-800">
                      <AvatarFallback className="bg-gray-800 text-gray-600 text-2xl">?</AvatarFallback>
                    </Avatar>
                  </div>
                  <p className="mt-6 text-sm text-gray-600 animate-pulse">Waiting for peer...</p>
                </div>
              )}
              {remoteUsers.length > 0 && (
                <footer className="absolute bottom-4 left-4 bg-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-widest shadow-lg">
                  Connected
                </footer>
              )}
            </article>
          </div>

          {/* Controls */}
          <div className="flex justify-center pb-2">
            <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-800 p-4 rounded-3xl flex items-center gap-6 shadow-2xl">
              <Button variant={isAudioOn ? 'secondary' : 'destructive'} size="icon" className="rounded-full w-12 h-12" onClick={() => setIsAudioOn(!isAudioOn)}>
                {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
              <Button variant={isVideoOn ? 'secondary' : 'destructive'} size="icon" className="rounded-full w-12 h-12" onClick={() => setIsVideoOn(!isVideoOn)}>
                {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
              <div className="w-px h-6 bg-gray-800 mx-1" />
              <Button 
                variant={isHandRaised ? 'default' : 'ghost'} 
                size="icon" 
                className={`rounded-full w-12 h-12 ${isHandRaised ? 'bg-amber-500 text-white shadow-lg' : 'text-gray-500'}`} 
                onClick={toggleHandRaise}
              >
                <Hand className="w-5 h-5" />
              </Button>
              <Button variant="destructive" size="icon" className="rounded-full w-12 h-12 bg-red-600 hover:bg-red-700" onClick={endSession}>
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Dynamic Panels */}
        <aside className="flex">
          {whiteboardOpen && (
            <div className="w-[600px] bg-white border-l flex flex-col animate-in slide-in-from-right duration-300">
              <header className="p-4 border-b flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-gray-800 text-xs uppercase tracking-widest">Whiteboard</h3>
                <Button variant="ghost" size="sm" onClick={() => setWhiteboardOpen(false)}><X className="w-4 h-4" /></Button>
              </header>
              <div className="flex-1 overflow-hidden"><Whiteboard onSave={() => {}} /></div>
            </div>
          )}

          {chatOpen && (
            <div className="w-80 bg-white border-l flex flex-col animate-in slide-in-from-right duration-300">
              <header className="p-4 border-b flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-xs uppercase tracking-widest">Chat</h3>
                <Button variant="ghost" size="sm" onClick={() => setChatOpen(false)}><X className="w-4 h-4" /></Button>
              </header>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === user?.fullName ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-gray-400 font-bold mb-1">{msg.sender}</span>
                      <div className={`px-3 py-2 rounded-xl text-sm ${msg.sender === user?.fullName ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <footer className="p-4 border-t flex gap-2">
                <Input 
                  className="rounded-xl h-10 text-sm" 
                  placeholder="Type here..." 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                />
                <Button size="icon" className="rounded-xl h-10 w-10 shrink-0" onClick={handleSendMessage}><Send className="w-4 h-4" /></Button>
              </footer>
            </div>
          )}

          {materialsOpen && (
            <div className="w-80 bg-white border-l flex flex-col animate-in slide-in-from-right duration-300">
              <header className="p-4 border-b flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-xs uppercase tracking-widest">Resources</h3>
                <Button variant="ghost" size="sm" onClick={() => setMaterialsOpen(false)}><X className="w-4 h-4" /></Button>
              </header>
              <div className="flex-1 overflow-auto"><MaterialsPanel sessionId={sessionId} /></div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}