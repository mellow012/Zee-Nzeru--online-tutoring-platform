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
import { completeSessionAction, sendSessionPing } from "../../app/actions/Session-actions";
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
  Pen, FileText, X, Send, Hand, CheckCircle, Camera, AlertCircle, Star, Loader2
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(16,185,129,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(20,184,166,0.06) 0%, transparent 50%), #0a0a0f' }}
      >
        {/* Ambient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-teal-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="max-w-lg w-full relative">
          {/* Subject pill */}
          <div className="flex justify-center mb-6">
            <span className="px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-xs font-medium text-gray-400 tracking-wide">
              {session?.subject || 'Preparing session…'}
            </span>
          </div>

          {/* Camera preview */}
          <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm relative shadow-2xl shadow-black/50 mb-6">
            {isVideoOn ? (
              <LocalVideoTrack track={localCameraTrack} play className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-white/10 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-600" />
                </div>
                <p className="mt-3 text-xs text-gray-600">Camera off</p>
              </div>
            )}
            {/* Floating name tag */}
            <div className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              {user?.fullName ?? 'You'}
            </div>
            {/* AV controls overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <button
                onClick={() => setIsAudioOn(!isAudioOn)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all backdrop-blur-md border ${isAudioOn ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' : 'bg-red-500/80 border-red-400/30 text-white'
                  }`}
              >
                {isAudioOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all backdrop-blur-md border ${isVideoOn ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' : 'bg-red-500/80 border-red-400/30 text-white'
                  }`}
              >
                {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-lg font-bold tracking-wide hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setIsJoined(true)}
              disabled={!agoraConfig}
            >
              {agoraConfig ? 'Enter Classroom' : 'Connecting…'}
            </button>

            <button
              className="w-full h-11 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-gray-400 text-sm font-medium hover:bg-white/10 hover:text-white transition-all disabled:opacity-30"
              onClick={handlePing}
              disabled={isPinging || !session}
            >
              <Hand className={`w-4 h-4 inline mr-2 ${isPinging ? 'animate-bounce' : ''}`} />
              {isPinging ? 'Nudging…' : `Nudge ${user?.role === 'tutor' ? 'Student' : 'Tutor'}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const submitReviewAndExit = async () => {
    setIsSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          rating,
          comment: reviewComment.trim(),
        }),
      });
      const data = await res.json();
      setIsSubmittingReview(false);
      if (data.success) {
        toast({ title: "Thank You!", description: "Your review has been saved." });
        router.push('/student');
      } else {
        toast({ variant: "destructive", title: "Failed to submit review", description: data.error });
      }
    } catch (err) {
      setIsSubmittingReview(false);
      toast({ variant: "destructive", title: "Error", description: "Network error occurred." });
    }
  };

  // --- END SESSION VIEW ---
  if (sessionEnded) {
    const isStudent = user?.role === 'student';
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(16,185,129,0.06) 0%, transparent 60%), #0a0a0f' }}
      >
        <div className="max-w-md w-full text-center space-y-8 bg-black/40 backdrop-blur-xl border border-white/5 p-8 rounded-2xl shadow-2xl">
          {/* Animated check */}
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.25em]">Session Complete</p>
            <p className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {formatTime(elapsedTime)}
            </p>
            <p className="text-xs text-gray-400 font-medium">{session?.subject || 'Tutoring Class'}</p>
          </div>

          {isStudent ? (
            <div className="space-y-4 text-left border-t border-white/5 pt-6">
              <div>
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-2.5">Rate your session</span>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const val = idx + 1;
                    const isLit = hoverRating !== null ? val <= hoverRating : val <= rating;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRating(val)}
                        onMouseEnter={() => setHoverRating(val)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="transition-all duration-150 transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 ${isLit ? 'fill-amber-400 text-amber-400' : 'text-gray-700'}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">Write a short review</span>
                <textarea
                  placeholder="Share your experience (e.g. Extremely helpful, explained tough formulas with ease!)"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  className="w-full text-xs bg-white/5 border border-white/10 rounded-xl p-3 text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={submitReviewAndExit}
                  disabled={isSubmittingReview}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isSubmittingReview && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  Submit Review & Exit
                </button>
                <button
                  onClick={() => router.push('/student')}
                  className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
                >
                  Skip & Go to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <button
              className="w-full h-12 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 transition-all shadow-lg mt-6"
              onClick={() => router.push('/tutor')}
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col font-sans" style={{ background: '#08080d' }}>
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-xl border-b border-white/5 px-5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-2 px-3">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
          </Badge>
          <h1 className="font-bold text-gray-200">{session?.subject || "Classroom"}</h1>
          <span className="text-xs font-mono text-emerald-500 bg-emerald-500/5 px-2 py-1 rounded">
            {formatTime(elapsedTime)}
          </span>
        </div>
        <nav className="flex items-center gap-1">
          {[
            { key: 'wb', icon: Pen, label: 'Board', open: whiteboardOpen, toggle: () => setWhiteboardOpen(!whiteboardOpen) },
            { key: 'mt', icon: FileText, label: 'Files', open: materialsOpen, toggle: () => setMaterialsOpen(!materialsOpen) },
            { key: 'ch', icon: MessageSquare, label: 'Chat', open: chatOpen, toggle: () => setChatOpen(!chatOpen) },
          ].map(({ key, icon: Icon, label, open, toggle }) => (
            <button key={key} onClick={toggle} title={label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${open ? 'bg-white/10 text-white border border-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Video Stage — PiP Layout */}
        <section className="flex-1 relative">
          {/* Remote user = full stage */}
          <div className="absolute inset-0">
            {remoteUsers.length > 0 ? (
              <RemoteUser user={remoteUsers[0]} playVideo={true} playAudio={true} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/8 animate-ping" style={{ animationDuration: '2.5s' }} />
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-white/5 flex items-center justify-center">
                    <span className="text-3xl text-gray-700 font-bold">?</span>
                  </div>
                </div>
                <p className="mt-6 text-sm text-gray-600 font-medium">Waiting for peer to join…</p>
                <button onClick={handlePing} disabled={isPinging || !session}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                >
                  <Hand className={`w-3 h-3 inline mr-1.5 ${isPinging ? 'animate-bounce' : ''}`} />
                  {isPinging ? 'Sent!' : 'Send Nudge'}
                </button>
              </div>
            )}
            {remoteUsers.length > 0 && (
              <div className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-emerald-500/15 backdrop-blur-md border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                Connected
              </div>
            )}
          </div>

          {/* Local PiP — floating bottom-right */}
          <div className="absolute bottom-24 right-4 w-48 h-36 rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 bg-gray-900 z-10">
            {isVideoOn ? (
              <LocalVideoTrack track={localCameraTrack} play className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-lg text-gray-700 font-bold">{user?.fullName?.[0]}</span>
              </div>
            )}
            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm border border-white/5">
              <span className="text-[9px] font-bold text-gray-400 uppercase">You</span>
              {isAudioOn ? <Mic className="w-2.5 h-2.5 text-emerald-400" /> : <MicOff className="w-2.5 h-2.5 text-red-400" />}
            </div>
          </div>

          {/* Floating controls dock */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/8 shadow-2xl">
              <button onClick={() => setIsAudioOn(!isAudioOn)} title={isAudioOn ? 'Mute' : 'Unmute'}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${isAudioOn ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-red-500/80 text-white'}`}
              >
                {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button onClick={() => setIsVideoOn(!isVideoOn)} title={isVideoOn ? 'Camera off' : 'Camera on'}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${isVideoOn ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-red-500/80 text-white'}`}
              >
                {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <button onClick={toggleHandRaise} title={isHandRaised ? 'Lower hand' : 'Raise hand'}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${isHandRaised ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-pulse' : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/15'}`}
              >
                <Hand className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <button onClick={endSession} title="End session"
                className="w-11 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-lg shadow-red-600/20"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
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
              <div className="flex-1 overflow-hidden"><Whiteboard onSave={() => { }} /></div>
            </div>
          )}

          {chatOpen && (
            <div className="w-80 bg-gray-950 border-l border-white/5 flex flex-col animate-in slide-in-from-right duration-300">
              <header className="p-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-gray-300 text-xs uppercase tracking-widest">Chat</h3>
                <button onClick={() => setChatOpen(false)} className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </header>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.sender === user?.fullName ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-gray-600 font-medium mb-1">{msg.sender} · {msg.time}</span>
                      <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${msg.sender === user?.fullName
                        ? 'bg-emerald-600 text-white rounded-br-sm'
                        : 'bg-white/5 text-gray-300 border border-white/5 rounded-bl-sm'
                        }`}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <footer className="p-3 border-t border-white/5 flex gap-2">
                <Input
                  className="rounded-xl h-9 text-sm bg-white/5 border-white/10 text-gray-200 placeholder:text-gray-600"
                  placeholder="Type a message…"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button onClick={handleSendMessage}
                  className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </footer>
            </div>
          )}

          {materialsOpen && (
            <div className="w-80 bg-gray-950 border-l border-white/5 flex flex-col animate-in slide-in-from-right duration-300">
              <header className="p-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-gray-300 text-xs uppercase tracking-widest">Resources</h3>
                <button onClick={() => setMaterialsOpen(false)} className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </header>
              <div className="flex-1 overflow-auto"><MaterialsPanel sessionId={sessionId} /></div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}