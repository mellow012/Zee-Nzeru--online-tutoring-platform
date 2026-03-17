'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import {
  Calendar, Star, Clock, Video, X, CreditCard,
  CheckCircle2, ChevronRight, Sparkles, Users,
  GraduationCap, Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookingDialog } from '@/components/dialogs/Booking-dialog';
import { ReviewDialog } from '@/components/dialogs/Review-dialog';
import { PaymentDialog } from '@/components/dialogs/Payment-dialog';
import { useToast } from '@/hooks/use-toast';
import { cancelSessionAction } from './action';
import type { StudentDashboardData, SessionWithTutor, TutorCard } from './action';
import type { Session } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatSessionTime(startTime: string, endTime: string) {
  const start = new Date(startTime);
  const end   = new Date(endTime);
  if (isToday(start))    return `Today, ${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;
  if (isTomorrow(start)) return `Tomorrow, ${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;
  return `${format(start, 'EEE d MMM, HH:mm')} – ${format(end, 'HH:mm')}`;
}

/** Maps SessionWithTutor → Session shape expected by dialogs */
function toSession(s: SessionWithTutor): Session {
  return {
    ...s,
    title: s.title ?? undefined,
    tutor: s.tutorProfile
      ? { full_name: s.tutorProfile.full_name, avatar_url: s.tutorProfile.avatar_url }
      : undefined,
  } as Session;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:     { label: 'Pending',     className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:   { label: 'Confirmed',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'Live',        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' },
  completed:   { label: 'Completed',   className: 'bg-gray-50 text-gray-600 border-gray-200' },
  cancelled:   { label: 'Cancelled',   className: 'bg-red-50 text-red-600 border-red-200' },
  no_show:     { label: 'No-show',     className: 'bg-orange-50 text-orange-600 border-orange-200' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StudentDashboard({ data }: { data: StudentDashboardData }) {
  const router   = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  // Dialog state
  const [bookingTutor,  setBookingTutor]  = useState<TutorCard | null>(null);
  const [reviewSession, setReviewSession] = useState<SessionWithTutor | null>(null);
  const [paymentSession,setPaymentSession]= useState<Session | null>(null);
  const [cancellingId,  setCancellingId]  = useState<string | null>(null);

  const { stats, upcomingSessions, sessionsNeedingReview, suggestedTutors } = data;

  // ── Handlers ──────────────────────────────────────────────────────────────

  // onSuccess for BookingDialog is now () => void — no session argument
  const handleBookingSuccess = () => {
    toast({ title: 'Session requested!', description: 'Waiting for tutor confirmation.' });
    startTransition(() => router.refresh());
  };

  const handlePaymentSuccess = () => {
    toast({ title: 'Session confirmed!', description: 'Your booking is now confirmed.' });
    startTransition(() => router.refresh());
  };

  const handleReviewSubmitted = () => {
    toast({ title: 'Review submitted. Thank you!' });
    startTransition(() => router.refresh());
  };

  const handleCancelSession = async (sessionId: string) => {
    setCancellingId(sessionId);
    const result = await cancelSessionAction(sessionId);
    setCancellingId(null);
    if (result.success) {
      toast({ title: 'Session cancelled.' });
      startTransition(() => router.refresh());
    } else {
      toast({ variant: 'destructive', title: 'Could not cancel', description: result.error });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
            <p className="text-muted-foreground mt-1 text-sm">Here&apos;s your learning overview.</p>
          </div>
          <Button
            onClick={() => router.push('/student/tutors')}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 hidden sm:flex"
          >
            <GraduationCap className="w-4 h-4" /> Find a Tutor
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Calendar}     label="Upcoming"    value={stats.upcomingCount}  sub="sessions scheduled"       color="bg-blue-50 text-blue-600" />
          <StatCard icon={CheckCircle2} label="Completed"   value={stats.completedCount} sub="sessions total"           color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Wallet}       label="Total Spent" value={`MWK ${stats.totalSpent.toLocaleString()}`} sub="lifetime" color="bg-purple-50 text-purple-600" />
          <StatCard icon={Users}        label="Favourites"  value={stats.favoriteTutorsCount} sub="saved tutors"        color="bg-amber-50 text-amber-600" />
        </div>

        {/* Sessions needing review */}
        {sessionsNeedingReview.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-medium">Leave a review</h2>
              <Badge variant="secondary" className="text-xs">{sessionsNeedingReview.length}</Badge>
            </div>
            {sessionsNeedingReview.map((session) => (
              <Card key={session.id} className="border border-amber-100 bg-amber-50/40 shadow-none">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={session.tutorProfile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                        {getInitials(session.tutorProfile?.full_name ?? 'TU')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{session.tutorProfile?.full_name ?? 'Your tutor'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {session.subject} · {session.actual_end_time
                          ? formatDistanceToNow(new Date(session.actual_end_time), { addSuffix: true })
                          : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm" variant="outline"
                    className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => setReviewSession(session)}
                  >
                    <Star className="w-3.5 h-3.5 mr-1.5" /> Rate Session
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upcoming sessions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <h2 className="text-base font-medium">Upcoming Sessions</h2>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={() => router.push('/student/sessions')}>
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {upcomingSessions.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
                <div className="p-3 rounded-full bg-blue-50"><Calendar className="w-5 h-5 text-blue-500" /></div>
                <div>
                  <p className="text-sm font-medium">No upcoming sessions</p>
                  <p className="text-xs text-muted-foreground mt-1">Find a tutor and book your first session</p>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 mt-1" onClick={() => router.push('/student/tutors')}>
                  Browse Tutors
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {upcomingSessions.map((session) => (
                <UpcomingSessionCard
                  key={session.id}
                  session={session}
                  isCancelling={cancellingId === session.id}
                  onCancel={handleCancelSession}
                  onJoin={() => router.push(`/student/sessions/${session.id}`)}
                  onPay={() => setPaymentSession(toSession(session))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Suggested tutors */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <h2 className="text-base font-medium">Top Tutors</h2>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={() => router.push('/student/tutors')}>
              See all <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {suggestedTutors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No tutors available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedTutors.map((tutor) => (
                <TutorCardWidget key={tutor.userId} tutor={tutor} onBook={() => setBookingTutor(tutor)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      {/* BookingDialog now takes TutorCard directly — no conversion needed */}
      <BookingDialog
        tutor={bookingTutor}
        open={!!bookingTutor}
        onClose={() => setBookingTutor(null)}
        onSuccess={handleBookingSuccess}
      />

      {reviewSession && (
        <ReviewDialog
          session={toSession(reviewSession)}
          open={!!reviewSession}
          onClose={() => setReviewSession(null)}
          onSubmit={handleReviewSubmitted}
        />
      )}

      {paymentSession && (
        <PaymentDialog
          session={paymentSession}
          open={!!paymentSession}
          onClose={() => setPaymentSession(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UpcomingSessionCard({ session, isCancelling, onCancel, onJoin, onPay }: {
  session: SessionWithTutor; isCancelling: boolean;
  onCancel: (id: string) => void; onJoin: () => void; onPay: () => void;
}) {
  const start   = new Date(session.scheduled_start_time);
  const isLive  = session.status === 'in_progress';
  const canPay  = session.status === 'confirmed';
  const canJoin = isLive;

  return (
    <Card className="shadow-sm border-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className={`w-1 shrink-0 ${isLive ? 'bg-emerald-500' : session.status === 'confirmed' ? 'bg-blue-400' : 'bg-amber-400'}`} />
          <div className="flex items-center gap-4 p-4 flex-1 min-w-0">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={session.tutorProfile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                {getInitials(session.tutorProfile?.full_name ?? 'TU')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium truncate">{session.tutorProfile?.full_name ?? 'Your tutor'}</p>
                <StatusBadge status={session.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{session.subject}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatSessionTime(session.scheduled_start_time, session.scheduled_end_time)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canPay && (
                <Button size="sm" onClick={onPay} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <CreditCard className="w-3.5 h-3.5" /> Pay & Join
                </Button>
              )}
              {canJoin && (
                <Button size="sm" onClick={onJoin} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                  <Video className="w-3.5 h-3.5" /> Join
                </Button>
              )}
              {['pending', 'confirmed'].includes(session.status) && (
                <Button size="sm" variant="ghost" onClick={() => onCancel(session.id)} disabled={isCancelling} className="text-muted-foreground hover:text-red-600 hover:bg-red-50 px-2">
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TutorCardWidget({ tutor, onBook }: { tutor: TutorCard; onBook: () => void }) {
  return (
    <Card className="shadow-sm border-0 hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarImage src={tutor.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-emerald-50 text-emerald-700 font-medium text-sm">
              {getInitials(tutor.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold truncate">{tutor.fullName}</p>
              {tutor.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium">{tutor.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">· {tutor.totalSessions} sessions</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tutor.subjects.slice(0, 3).map((s) => (
            <span key={s} className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{s}</span>
          ))}
          {tutor.subjects.length > 3 && <span className="text-xs text-muted-foreground">+{tutor.subjects.length - 3} more</span>}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <div>
            <span className="text-base font-semibold text-emerald-600">MWK {tutor.hourlyRate.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground"> /hr</span>
          </div>
          <Button size="sm" onClick={onBook} className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs">
            Book Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}