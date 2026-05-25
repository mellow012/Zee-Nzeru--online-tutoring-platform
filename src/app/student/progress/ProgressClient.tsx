'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trophy, Clock, CheckCircle, TrendingUp, BookOpen, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid 
} from 'recharts';

interface ProgressClientProps {
  completedSessions: any[];
  totalCompleted: number;
  totalHours: number;
  mostLearnedSubject: string;
}

export function ProgressClient({ completedSessions, totalCompleted, totalHours, mostLearnedSubject }: ProgressClientProps) {
  
  // Data for Subject Distribution (Bar Chart)
  const subjectData = useMemo(() => {
    const counts = completedSessions.reduce((acc, s) => {
      const subject = s.subject || 'Unknown';
      acc[subject] = (acc[subject] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.keys(counts).map(key => ({
      name: key,
      sessions: counts[key]
    })).sort((a, b) => b.sessions - a.sessions).slice(0, 5); // top 5
  }, [completedSessions]);

  // Data for Learning Trend (Line Chart) over recent months
  const trendData = useMemo(() => {
    const months = completedSessions.reduce((acc, s) => {
      if (s.actual_start_time) {
        const month = format(parseISO(s.actual_start_time), 'MMM yyyy');
        acc[month] = (acc[month] || 0) + (s.duration_minutes || 60);
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(months).reverse().map(key => ({
      month: key,
      hours: Math.round((months[key] / 60) * 10) / 10
    }));
  }, [completedSessions]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Progress</h1>
          <p className="text-muted-foreground mt-2 text-lg">Track your learning journey and milestones.</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl flex items-center gap-4 border border-emerald-100 shadow-sm">
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
        <Card className="shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Sessions Completed</p>
              <p className="text-4xl font-bold text-slate-900">{totalCompleted}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-purple-50 text-purple-600 rounded-xl">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Hours Learned</p>
              <p className="text-4xl font-bold text-slate-900">{totalHours}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-100 bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Top Subject</p>
              <p className="text-2xl font-bold text-slate-900 truncate max-w-[140px]">{mostLearnedSubject}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-0">
          <CardHeader>
            <CardTitle className="text-lg">Study Hours Over Time</CardTitle>
            <CardDescription>Your learning consistency tracked monthly</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-gray-400">Not enough data to show trends</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardHeader>
            <CardTitle className="text-lg">Top Subjects</CardTitle>
            <CardDescription>Where you spend most of your learning time</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
             {subjectData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#334155', fontWeight: 500}} width={100} />
                    <Tooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="sessions" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-gray-400">No subject data available</div>
             )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedSessions.slice(0, 6).map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{session.subject}</p>
                      <p className="text-xs text-gray-500 truncate">with {session.tutor?.full_name}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-gray-900">
                      {session.actual_start_time ? format(parseISO(session.actual_start_time), 'MMM d') : 'Recent'}
                    </p>
                    <p className="text-xs text-emerald-600 font-bold bg-emerald-100 px-1.5 py-0.5 rounded mt-1 inline-block">+{session.duration_minutes || 60}m</p>
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
