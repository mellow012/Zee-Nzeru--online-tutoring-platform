import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MessagesClient } from '@/components/shared/Messages-client';

export default async function StudentMessagesPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground mt-1">Chat directly with your tutors regarding your upcoming sessions.</p>
      </div>

      <MessagesClient currentUserId={user.id} />
    </div>
  );
}
