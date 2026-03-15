'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { formatSessionDateTime, formatDuration } from '@/lib/session-time';
import { Calendar, List, Clock, Video, CheckCircle2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarView } from '@/components/shared/Calendar-view';
import { useToast } from '@/hooks/use-toast';
import { completeSessionAction } from '../actions';
import type { TutorSessionRow } from '../actions';
import type { Session } from '@/lib/types';

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

const STATUS_PILL: Record<string, string> = {
  pending:     'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:   'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed:   'bg-gray-50 text-gray-600 border-gray-200',
  cancelled:   'bg-red-50 text-red-600 border-red-200',
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// Maps TutorSessionRow → Session shape CalendarView expects
function toCalendarSession(s: TutorSessionRow): Session {
  return {
    id: s.id,
    tutor_id: '',
    student_id: s.student_id,
    subject: s.subject,
    title: s.title ?? undefined,
    scheduled_start_time: s.scheduled_start_time,
    scheduled_end_time: s.scheduled_end_time,
    status: s.status as any,
    price: s.price,
    currency: s.currency,
    created_at: s.created_at,
    student: s.studentProfile
      ? { full_name: s.studentProfile.full_name, avatar_url: s.studentProfile.avatar_url }
      : undefined,
  };
}

interface Props {
  sessions: TutorSessionRow[];
  activeStatus: string;
  activeView: string;
}

export function TutorSessionsClient({ sessions, activeStatus, activeView }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>(activeView === 'calendar' ? 'calendar' : 'list');

  const handleFilterChange = (key: string) => {
    const url = key === 'all' ? '/tutor/sessions' : `/tutor/sessions?status=${key}`;
    router.push(url);
  };

  const handleComplete = async (sessionId: string) => {
    setCompletingId(sessionId);
    const result = await completeSessionAction(sessionId);
    setCompletingId(null);
    if (result.success) {
      toast({ title: 'Session marked as complete.' });
      startTransition(() => router.refresh());
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">My Sessions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          {/* List / Calendar toggle */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === 'calendar' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>
        </div>

        {/* Calendar view */}
        {view === 'calendar' ? (
          <CalendarView
            sessions={sessions.map(toCalendarSession)}
            onSessionClick={(s) => router.push(`/tutor/sessions/${s.id}`)}
          />
        ) : (
          <>
            {/* Filter tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => handleFilterChange(f.key)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeStatus === f.key
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Session list */}
            {sessions.length === 0 ? (
              <Card className="border-dashed shadow-none">
                <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No sessions found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => {
                  const start = new Date(session.scheduled_start_time);
                  const end = new Date(session.scheduled_end_time);
                  const isConfirmed = session.status === 'confirmed';
                  const isLive = session.status === 'in_progress';
                  const isCompleting = completingId === session.id;

                  return (
                    <Card key={session.id} className="shadow-sm border-0">
                      <CardContent className="p-0">
                        <div className="flex items-stretch">
                          <div className={`w-1 shrink-0 rounded-l-lg ${
                            isLive ? 'bg-emerald-500' :
                            isConfirmed ? 'bg-blue-400' :
                            session.status === 'pending' ? 'bg-amber-400' :
                            session.status === 'cancelled' ? 'bg-red-300' : 'bg-gray-300'
                          }`} />
                          <div className="p-4 flex items-center gap-4 flex-1 min-w-0">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={session.studentProfile?.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                                {getInitials(session.studentProfile?.full_name ?? 'ST')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium truncate">
                                  {session.studentProfile?.full_name ?? 'Student'}
                                </p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_PILL[session.status] ?? STATUS_PILL.pending}`}>
                                  {session.status === 'in_progress' ? 'Live' : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{session.subject}</p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground">
                                  {formatSessionDateTime(session.scheduled_start_time, session.scheduled_end_time).fullLabel}
                                </span>
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                                  {formatDuration(formatSessionDateTime(session.scheduled_start_time, session.scheduled_end_time).duration)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-semibold text-emerald-600">
                                MWK {session.price.toLocaleString()}
                              </span>
                              {(isLive || isConfirmed) && (
                                <Button
                                  size="sm"
                                  className={`gap-1.5 h-8 text-xs ${isLive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                  onClick={() => router.push(`/tutor/sessions/${session.id}`)}
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  {isLive ? 'Join' : 'Start'}
                                </Button>
                              )}
                              {isConfirmed && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-xs border-gray-200 text-gray-500 hover:bg-gray-50"
                                  onClick={() => handleComplete(session.id)}
                                  disabled={isCompleting}
                                  title="Mark as complete"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}