'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  UserCheck, UserX, Clock, CheckCircle, XCircle,
  Mail, Phone, BookOpen, Calendar, Search,
  RefreshCw, ChevronRight, GraduationCap,
} from 'lucide-react';

type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

interface TutorApplication {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  subjects: string[];
  bio: string;
  experience_years: number;
  education_background: string | null;
  verification_documents: string[];
  status: ApplicationStatus;
  rejection_reason: string | null;
  invite_sent_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; classes: string }> = {
  pending:      { label: 'Pending',      classes: 'text-amber-700 bg-amber-50 border-amber-200'  },
  under_review: { label: 'Under Review', classes: 'text-blue-700 bg-blue-50 border-blue-200'     },
  approved:     { label: 'Approved',     classes: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  rejected:     { label: 'Rejected',     classes: 'text-red-700 bg-red-50 border-red-200'        },
};

interface Props {
  /** Called after approve/reject so the parent can refresh counters */
  onUpdate?: () => void;
}

export function AdminApplicationsPanel({ onUpdate }: Props) {
  const { toast } = useToast();
  const [applications, setApplications]   = useState<TutorApplication[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [statusFilter, setStatusFilter]   = useState<ApplicationStatus | 'all'>('pending');

  const router = useRouter();

  // Reject dialog
  const [rejectTarget, setRejectTarget]   = useState<TutorApplication | null>(null);
  const [rejectReason, setRejectReason]   = useState('');
  const [isRejecting, setIsRejecting]     = useState(false);

  // Approve dialog
  const [approveTarget, setApproveTarget] = useState<TutorApplication | null>(null);
  const [isApproving, setIsApproving]     = useState(false);

  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/tutor-applications${params}`);
      const data = await res.json();
      if (data.success) setApplications(data.applications);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to load applications' });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!approveTarget) return;
    setIsApproving(true);
    try {
      const res = await fetch(`/api/tutor-applications/${approveTarget.id}/approve`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Application approved!',
        description: `An invite email has been sent to ${approveTarget.email}.`,
      });
      setApproveTarget(null);
      await loadApplications();
      onUpdate?.();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Approval failed', description: err.message });
    } finally {
      setIsApproving(false);
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/tutor-applications/${rejectTarget.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      toast({ title: 'Application rejected' });
      setRejectTarget(null);
      setRejectReason('');
      await loadApplications();
      onUpdate?.();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Rejection failed', description: err.message });
    } finally {
      setIsRejecting(false);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = applications.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.full_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.subjects.some((s) => s.toLowerCase().includes(q))
    );
  });

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <>
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Tutor Applications</CardTitle>
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-[10px]">
                  {pendingCount} pending
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={loadApplications}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search applicants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all capitalize ${
                    statusFilter === s
                      ? 'bg-foreground text-background border-foreground'
                      : 'text-muted-foreground border-border hover:border-foreground/30'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No applications found</p>
            </div>
          ) : (
            filtered.map((app) => {
              const statusCfg = STATUS_CONFIG[app.status];

              return (
                <div
                  key={app.id}
                  className={`rounded-lg border transition-all hover:shadow-sm cursor-pointer ${
                    app.status === 'pending'
                      ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300 hover:bg-amber-50/50'
                      : 'border-border bg-background hover:border-foreground/20'
                  }`}
                  onClick={() => router.push(`/admin/applications/${app.id}`)}
                >
                  {/* Row header */}
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {app.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{app.full_name}</p>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${statusCfg.classes}`}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {app.subjects.slice(0, 3).join(', ')} · {app.experience_years}yr exp
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(app.created_at).toLocaleDateString()}
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground">
                        Review <ChevronRight size={14} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── Approve confirmation dialog ───────────────────────────────────── */}
      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck size={18} className="text-emerald-600" /> Approve Application
            </DialogTitle>
            <DialogDescription>
              This will send an invitation email to <strong>{approveTarget?.email}</strong> with
              a link to activate their tutor account.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2 text-sm">
            <p className="font-medium text-emerald-800">What happens next:</p>
            <ul className="text-emerald-700 space-y-1 pl-4 list-disc text-xs">
              <li>Supabase sends a magic-link email to the applicant</li>
              <li>They click the link and set a password</li>
              <li>Their tutor account is created with pre-filled profile data</li>
              <li>They can then configure their availability, rates, and teaching style</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? 'Sending invite…' : 'Confirm & Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!rejectTarget} onOpenChange={() => { setRejectTarget(null); setRejectReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX size={18} className="text-red-500" /> Reject Application
            </DialogTitle>
            <DialogDescription>
              Rejecting <strong>{rejectTarget?.full_name}</strong>&apos;s application. Optionally
              provide a reason (for internal records).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="e.g. Insufficient experience for our current tutor requirements..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This is stored internally. No automated email is sent on rejection — follow up
              manually if needed.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? 'Rejecting…' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
