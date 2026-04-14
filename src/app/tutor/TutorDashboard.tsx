'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, isToday, isTomorrow } from 'date-fns';
import {
  Calendar, Clock, Star, Wallet, Users, CheckCircle2,
  ClipboardList, ChevronRight, Video, Check, X,
  TrendingUp, Sparkles, AlertCircle, BookOpen,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { acceptBookingAction, declineBookingAction, completeSessionAction } from './actions';
import type { TutorDashboardData, TutorSessionRow } from './actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatSessionTime(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const prefix = isToday(s) ? 'Today' : isTomorrow(s) ? 'Tomorrow' : format(s, 'EEE d MMM');
  return `${prefix}, ${format(s, 'HH:mm')} – ${format(e, 'HH:mm')}`;
}

function formatDateHeading(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEEE, d MMMM');
}

const STATUS_PILL: Record<string, string> = {
  pending:     'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:   'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed:   'bg-gray-50 text-gray-600 border-gray-200',
  cancelled:   'bg-red-50 text-red-600 border-red-200',
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
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

// ─── Decline dialog ───────────────────────────────────────────────────────────

function DeclineDialog({
  session, open, onClose, onDeclined,
}: {
  session: TutorSessionRow | null; open: boolean;
  onClose: () => void; onDeclined: () => void;
}) {
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDecline = () => {
    if (!session) return;
    startTransition(async () => {
      const result = await declineBookingAction(session.id, reason.trim() || undefined);
      if (result.success) {
        toast({ title: 'Request declined.' });
        onDeclined();
        onClose();
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: result.error });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline Booking Request</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Optionally let the student know why you're declining.
          </p>
          <Textarea
            placeholder="e.g. Not available at this time"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleDecline}
            disabled={isPending}
          >
            {isPending ? 'Declining…' : 'Decline Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Session action row ───────────────────────────────────────────────────────

function SessionRow({
  session,
  showActions = false,
  onAccept,
  onDecline,
  onComplete,
  onJoin,
}: {
  session: TutorSessionRow;
  showActions?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onComplete?: () => void;
  onJoin?: () => void;
}) {
  const isLive = session.status === 'in_progress';
  const isConfirmed = session.status === 'confirmed';

  return (
    <Card className="shadow-sm border-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className={`w-1 shrink-0 ${
            isLive       ? 'bg-emerald-500' :
            isConfirmed  ? 'bg-blue-400' :
            session.status === 'pending' ? 'bg-amber-400' : 'bg-gray-200'
          }`} />
          <div className="flex items-center gap-4 p-4 flex-1 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
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
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatSessionTime(session.scheduled_start_time, session.scheduled_end_time)}
                </span>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {showActions && session.status === 'pending' && (
                <>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 px-3 text-xs gap-1" onClick={onAccept}>
                    <Check className="w-3.5 h-3.5" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3 text-xs gap-1" onClick={onDecline}>
                    <X className="w-3.5 h-3.5" /> Decline
                  </Button>
                </>
              )}
              {(isLive || isConfirmed) && (
                <Button size="sm" className={`gap-1.5 h-8 text-xs ${isLive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`} onClick={onJoin}>
                  <Video className="w-3.5 h-3.5" /> {isLive ? 'Join' : 'Start'}
                </Button>
              )}
              {isConfirmed && onComplete && (
                <Button size="sm" variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50 h-8 px-2 text-xs" onClick={onComplete}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TutorDashboard({ data }: { data: TutorDashboardData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningSession, setDecliningSession] = useState<TutorSessionRow | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const refresh = () => startTransition(() => router.refresh());

  const handleAccept = async (sessionId: string) => {
    setAcceptingId(sessionId);
    const result = await acceptBookingAction(sessionId);
    setAcceptingId(null);
    if (result.success) { toast({ title: 'Session confirmed!' }); refresh(); }
    else toast({ variant: 'destructive', title: 'Failed', description: result.error });
  };

  const handleComplete = async (sessionId: string) => {
    setCompletingId(sessionId);
    const result = await completeSessionAction(sessionId);
    setCompletingId(null);
    if (result.success) { toast({ title: 'Session marked as complete.' }); refresh(); }
    else toast({ variant: 'destructive', title: 'Failed', description: result.error });
  };

  const { stats, todaySessions, pendingRequests, upcomingByDay } = data;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Tutor Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 hidden sm:flex"
            onClick={() => router.push('/tutor/sessions')}
          >
            <Calendar className="w-4 h-4" /> View Calendar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ClipboardList} label="Pending Requests" value={stats.pendingRequestsCount}
            sub="awaiting response" color="bg-amber-50 text-amber-600"
          />
          <StatCard icon={Calendar} label="This Week" value={stats.upcomingCount}
            sub="upcoming sessions" color="bg-blue-50 text-blue-600"
          />
          <StatCard icon={Wallet} label="This Month" value={`MWK ${stats.monthEarnings.toLocaleString()}`}
            sub="earnings released" color="bg-emerald-50 text-emerald-600"
          />
          <StatCard icon={Star} label="Rating" value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
            sub={`${stats.completedTotal} sessions total`} color="bg-purple-50 text-purple-600"
          />
        </div>

        {/* Pending booking requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-medium">Booking Requests</h2>
                <Badge variant="secondary">{pendingRequests.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1"
                onClick={() => router.push('/tutor/requests')}>
                See all <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {pendingRequests.slice(0, 3).map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  showActions
                  onAccept={() => handleAccept(s.id)}
                  onDecline={() => setDecliningSession(s)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Today's schedule */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h2 className="text-base font-medium">Today's Schedule</h2>
          </div>
          {todaySessions.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="py-8 flex flex-col items-center gap-2 text-center">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No sessions scheduled for today.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  onJoin={() => router.push(`/tutor/sessions/${s.id}`)}
                  onComplete={() => handleComplete(s.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming week */}
        {upcomingByDay.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <h2 className="text-base font-medium">Coming Up</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1"
                onClick={() => router.push('/tutor/sessions')}>
                Full calendar <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
            {upcomingByDay.map(({ date, sessions }) => (
              <div key={date} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {formatDateHeading(date)}
                </p>
                {sessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    onAccept={() => handleAccept(s.id)}
                    onDecline={() => setDecliningSession(s)}
                    onJoin={() => router.push(`/classroom/${s.id}`)}
                    showActions={s.status === 'pending'}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <DeclineDialog
        session={decliningSession}
        open={!!decliningSession}
        onClose={() => setDecliningSession(null)}
        onDeclined={refresh}
      />
    </div>
  );
}