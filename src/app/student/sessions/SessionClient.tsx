'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatSessionDateTime, formatDuration } from '@/lib/session-time';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar, Clock, Video, Star, X, ChevronRight, CreditCard,
  BookOpen, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ReviewDialog } from '@/components/dialogs/Review-dialog';
import { PaymentDialog } from '@/components/dialogs/Payment-dialog';
import { useToast } from '@/hooks/use-toast';
import { cancelSessionAction } from '../action';
import type { SessionWithTutor } from '../action';
import type { Session } from '@/lib/types';

// ─── Filter tab config ────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',        label: 'All' },
  { key: 'pending',    label: 'Pending' },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'completed',  label: 'Completed' },
  { key: 'cancelled',  label: 'Cancelled' },
] as const;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:     { label: 'Pending',     className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:   { label: 'Confirmed',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'Live Now',    className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed:   { label: 'Completed',   className: 'bg-gray-50 text-gray-600 border-gray-200' },
  cancelled:   { label: 'Cancelled',   className: 'bg-red-50 text-red-600 border-red-200' },
  no_show:     { label: 'No-show',     className: 'bg-orange-50 text-orange-600 border-orange-200' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function toSession(s: SessionWithTutor): Session {
  return {
    ...s,
    title: s.title ?? undefined,
    tutor: s.tutorProfile
      ? { full_name: s.tutorProfile.full_name, avatar_url: s.tutorProfile.avatar_url }
      : undefined,
  } as Session;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  sessions: SessionWithTutor[];
  activeStatus: string;
}

export function SessionsClient({ sessions, activeStatus }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [reviewSession,  setReviewSession]  = useState<SessionWithTutor | null>(null);
  const [paymentSession, setPaymentSession] = useState<Session | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleFilterChange = (key: string) => {
    const params = key === 'all' ? '/student/sessions' : `/student/sessions?status=${key}`;
    router.push(params);
  };

  const handleCancel = async (sessionId: string) => {
    setCancellingId(sessionId);
    const result = await cancelSessionAction(sessionId);
    setCancellingId(null);

    if (result.success) {
      toast({ title: 'Session cancelled.' });
      startTransition(() => router.refresh());
    } else {
      toast({ variant: 'destructive', title: 'Failed to cancel', description: result.error });
    }
  };

  const handleReviewSubmitted = () => {
    toast({ title: 'Review submitted. Thank you!' });
    startTransition(() => router.refresh());
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">My Sessions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} found
          </p>
        </div>

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

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
              <div className="p-3 rounded-full bg-gray-100">
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">No sessions found</p>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => router.push('/student/tutors')}
              >
                Book a Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const cfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.pending;
              const canCancel = ['pending', 'confirmed'].includes(session.status);
              const canReview = session.status === 'completed' && !session.hasReview;
              const canJoin = session.status === 'in_progress';
              const canPay  = session.status === 'confirmed'; // pay at session start

              return (
                <Card key={session.id} className="shadow-sm border-0">
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      {/* Status accent */}
                      <div className={`w-1 shrink-0 rounded-l-lg ${
                        session.status === 'confirmed' ? 'bg-blue-400' :
                        session.status === 'in_progress' ? 'bg-emerald-500' :
                        session.status === 'completed' ? 'bg-gray-300' :
                        session.status === 'cancelled' ? 'bg-red-300' : 'bg-amber-400'
                      }`} />

                      <div className="p-4 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: tutor info */}
                          <div className="flex items-start gap-3 min-w-0">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={session.tutorProfile?.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                                {getInitials(session.tutorProfile?.full_name ?? 'TU')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">
                                  {session.tutorProfile?.full_name ?? 'Your tutor'}
                                </p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
                                  {cfg.label}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{session.subject}</p>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground">
                                  {formatSessionDateTime(session.scheduled_start_time, session.scheduled_end_time).fullLabel}
                                </span>
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                                  {formatDuration(formatSessionDateTime(session.scheduled_start_time, session.scheduled_end_time).duration)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: price + actions */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-sm font-semibold text-emerald-600">
                              MWK {session.price.toLocaleString()}
                            </span>
                            <div className="flex gap-2">
                              {canPay && (
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 h-8 text-xs"
                                  onClick={() => setPaymentSession(toSession(session))}
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Pay & Join
                                </Button>
                              )}
                              {canJoin && (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-8 text-xs"
                                  onClick={() => router.push(`/student/sessions/${session.id}`)}
                                >
                                  <Video className="w-3.5 h-3.5" /> Join
                                </Button>
                              )}
                              {canReview && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-amber-300 text-amber-700 hover:bg-amber-50 h-8 text-xs gap-1"
                                  onClick={() => setReviewSession(session)}
                                >
                                  <Star className="w-3.5 h-3.5" /> Review
                                </Button>
                              )}
                              {session.hasReview && (
                                <span className="flex items-center gap-1 text-xs text-emerald-600">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                                </span>
                              )}
                              {canCancel && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancel(session.id)}
                                  disabled={cancellingId === session.id}
                                  className="text-muted-foreground hover:text-red-600 hover:bg-red-50 h-8 px-2"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <PaymentDialog
        session={paymentSession}
        open={!!paymentSession}
        onClose={() => setPaymentSession(null)}
      />

      {reviewSession && (
        <ReviewDialog
          session={toSession(reviewSession)}
          open={!!reviewSession}
          onClose={() => setReviewSession(null)}
          onSubmit={handleReviewSubmitted}
        />
      )}
    </div>
  );
}