'use client';

import { use } from 'react'; 
import dynamic from 'next/dynamic';
import AgoraProvider from '@/components/classroom/AgoraProvider';
import { Toaster } from '@/components/ui/toaster';

const VirtualClassroom = dynamic(
  () => import('@/components/classroom/Virtual-classroom').then((mod) => mod.VirtualClassroom),
  { ssr: false }
);

export default function ClassroomClient({ params }: { params: Promise<{ sessionId: string }> }) {
  // Use React.use() to unwrap the async params
  const { sessionId } = use(params);

  return (
    <AgoraProvider>
      <div className="h-screen w-full bg-gray-950 overflow-hidden">
        <VirtualClassroom sessionId={sessionId} />
        <Toaster />
      </div>
    </AgoraProvider>
  );
}