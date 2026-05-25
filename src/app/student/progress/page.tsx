import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProgressClient } from './ProgressClient';

export default async function StudentProgressPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  // Fetch student's completed sessions
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      id,
      subject,
      actual_start_time,
      actual_end_time,
      status,
      duration_minutes,
      rating:reviews!session_id(rating),
      tutor:profiles!tutor_id(full_name)
    `)
    .eq('student_id', user.id)
    .eq('status', 'completed')
    .order('actual_start_time', { ascending: false });

  const completedSessions = sessions || [];
  
  // Calculate stats
  const totalCompleted = completedSessions.length;
  const totalMinutes = completedSessions.reduce((acc, s) => acc + (s.duration_minutes || 60), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  
  // Get unique subjects
  const subjectCounts = completedSessions.reduce((acc, s) => {
    if (s.subject) {
      acc[s.subject] = (acc[s.subject] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const mostLearnedSubject = Object.entries(subjectCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

  return (
    <ProgressClient 
      completedSessions={completedSessions}
      totalCompleted={totalCompleted}
      totalHours={totalHours}
      mostLearnedSubject={mostLearnedSubject}
    />
  );
}
