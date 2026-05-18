import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trophy, Clock, CheckCircle, TrendingUp, BookOpen, Star } from 'lucide-react';
import { format } from 'date-fns';

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
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Progress</h1>
          <p className="text-muted-foreground mt-2">Track your learning journey and milestones.</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl flex items-center gap-4 border border-emerald-100">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800">Learning Streak</p>
            <p className="text-2xl font-bold text-emerald-900">{totalCompleted > 0 ? 'Active' : 'Get Started'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-0 bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Sessions Completed</p>
              <p className="text-3xl font-bold">{totalCompleted}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-0 bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-purple-50 text-purple-600 rounded-xl">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Hours Learned</p>
              <p className="text-3xl font-bold">{totalHours}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-0 bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Top Subject</p>
              <p className="text-xl font-bold truncate max-w-[120px]">{mostLearnedSubject}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg">Recent Achievements</CardTitle>
          <CardDescription>Your latest completed learning sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          {completedSessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p>Complete your first session to see it here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedSessions.slice(0, 5).map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{session.subject}</p>
                      <p className="text-sm text-gray-500">with {session.tutor?.full_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {session.actual_start_time ? format(new Date(session.actual_start_time), 'MMM d, yyyy') : 'Recently'}
                    </p>
                    <p className="text-xs text-emerald-600 font-medium">+{session.duration_minutes || 60} mins</p>
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
