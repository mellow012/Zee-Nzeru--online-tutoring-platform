import { VirtualClassroom } from '@/components/classroom/Virtual-classroom';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from '@/components/ui/toaster';

interface ClassroomPageProps {
  params: { sessionId: string };
}

export default function ClassroomPage({ params }: ClassroomPageProps) {
  return (
    <AuthProvider>
      <VirtualClassroom sessionId={params.sessionId} />
      <Toaster />
    </AuthProvider>
  );
}