'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatSessionDateTime, formatDuration } from '@/lib/session-time';
import { format } from 'date-fns';
import { Check, X, Clock, Calendar, User, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { acceptBookingAction, declineBookingAction } from '../actions';
import type { TutorSessionRow } from '../actions';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

interface Props {
  pendingSessions: TutorSessionRow[];
  confirmedSessions: TutorSessionRow[];
}

export function RequestsClient({ pendingSessions, confirmedSessions }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [decliningSession, setDecliningSession] = useState<TutorSessionRow | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isDeclining, startDeclineTransition] = useTransition();

  const refresh = () => startTransition(() => router.refresh());

  const handleAccept = async (sessionId: string) => {
    setProcessingId(sessionId);
    const result = await acceptBookingAction(sessionId);
    setProcessingId(null);
    if (result.success) {
      toast({ title: 'Session confirmed!', description: 'The student has been notified.' });
      refresh();
    } else {
      toast({ variant: 'destructive', title: 'Failed to confirm', description: result.error });
    }
  };

  const handleDeclineConfirm = () => {
    if (!decliningSession) return;
    const id = decliningSession.id;
    const reason = declineReason.trim();
    startDeclineTransition(async () => {
      const result = await declineBookingAction(id, reason || undefined);
      if (result.success) {
        toast({ title: 'Request declined.' });
        setDecliningSession(null);
        setDeclineReason('');
        refresh();
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: result.error });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Booking Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and respond to student session requests
          </p>
        </div>

        {/* Pending section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-medium">Awaiting Response</h2>
            <Badge variant="secondary">{pendingSessions.length}</Badge>
          </div>

          {pendingSessions.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="py-10 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-muted-foreground">No pending requests right now.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingSessions.map((session) => {
                const start = new Date(session.scheduled_start_time);
                const end = new Date(session.scheduled_end_time);
                const durationHrs = (end.getTime() - start.getTime()) / 3_600_000;
                const isProcessing = processingId === session.id;

                return (
                  <Card key={session.id} className="shadow-sm border-0 border-l-4 border-l-amber-400">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-11 w-11 shrink-0">
                          <AvatarImage src={session.studentProfile?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-amber-50 text-amber-700 font-medium">
                            {getInitials(session.studentProfile?.full_name ?? 'ST')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <p className="font-semibold text-sm">
                              {session.studentProfile?.full_name ?? 'Student'}
                            </p>
                            <p className="text-sm text-muted-foreground">{session.subject}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(start, 'EEE, d MMM yyyy')}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                              <span className="text-gray-400">({durationHrs}h)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5" />
                              <span className="font-medium text-emerald-600">
                                MWK {session.price.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-400">Received</span>
                              {format(new Date(session.created_at), 'd MMM, HH:mm')}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                          onClick={() => { setDecliningSession(session); setDeclineReason(''); }}
                          disabled={isProcessing}
                        >
                          <X className="w-3.5 h-3.5" /> Decline
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                          onClick={() => handleAccept(session.id)}
                          disabled={isProcessing}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isProcessing ? 'Confirming…' : 'Accept & Confirm'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmed section */}
        {confirmedSessions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              <h2 className="text-base font-medium">Confirmed Upcoming</h2>
            </div>
            <div className="space-y-2">
              {confirmedSessions.map((session) => {
                const start = new Date(session.scheduled_start_time);
                const end = new Date(session.scheduled_end_time);
                return (
                  <Card key={session.id} className="shadow-sm border-0">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={session.studentProfile?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-blue-50 text-blue-700 text-xs font-medium">
                          {getInitials(session.studentProfile?.full_name ?? 'ST')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {session.studentProfile?.full_name ?? 'Student'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.subject} · {formatSessionDateTime(session.scheduled_start_time, session.scheduled_end_time).fullLabel}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-emerald-600 shrink-0">
                        MWK {session.price.toLocaleString()}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Decline dialog */}
      <Dialog
        open={!!decliningSession}
        onOpenChange={(open) => { if (!open) setDecliningSession(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {decliningSession && (
              <p className="text-sm text-muted-foreground">
                Declining {decliningSession.subject} session with{' '}
                <span className="font-medium text-foreground">
                  {decliningSession.studentProfile?.full_name ?? 'Student'}
                </span>{' '}
                on {format(new Date(decliningSession.scheduled_start_time), 'EEE d MMM, HH:mm')}.
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="e.g. Not available at this time, please try a different slot"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecliningSession(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineConfirm}
              disabled={isDeclining}
            >
              {isDeclining ? 'Declining…' : 'Confirm Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}   