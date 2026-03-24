'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import AgoraProvider from '@/components/classroom/AgoraProvider';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

const VirtualClassroom = dynamic(
  () => import('@/components/classroom/Virtual-classroom').then((mod) => mod.VirtualClassroom),
  { ssr: false, loading: () => <div className="h-screen bg-gray-950 flex items-center justify-center text-white">Loading Classroom...</div> }
);

export default function ClassroomClient({ sessionId }: { sessionId: string }) {
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    // Listen for pings sent to ME in this specific session
    const setupListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`pings-${sessionId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_pings',
          filter: `receiver_id=eq.${user.id}`
        }, (payload) => {
          toast({
            title: "🔔 Connection Nudge",
            description: "The other person is waiting for you! Join the room now.",
            duration: 6000,
          });
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    setupListener();
  }, [sessionId, supabase, toast]);

  return (
    <AgoraProvider>
      <div className="h-screen w-full bg-gray-950 overflow-hidden">
        <VirtualClassroom sessionId={sessionId} />
        <Toaster />
      </div>
    </AgoraProvider>
  );
}