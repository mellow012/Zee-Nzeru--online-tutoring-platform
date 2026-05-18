'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { approveTutorAction, rejectTutorAction } from '@/app/admin/actions';
import {
  UserCheck, UserX, Search, RefreshCw, BookOpen,
  GraduationCap, ChevronRight, Clock, CheckCircle, XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type VerificationStatus = 'pending_review' | 'approved' | 'rejected' | 'not_submitted';

interface TutorVerification {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  email: string;
  subjects: string[];
  experienceYears: number;
  educationBackground: string | null;
  verificationStatus: VerificationStatus;
  verificationDocuments: string[];
  rejectionReason: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<VerificationStatus, { label: string; classes: string }> = {
  pending_review: { label: 'Pending Review', classes: 'text-amber-700 bg-amber-50 border-amber-200' },
  approved:       { label: 'Approved',       classes: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  rejected:       { label: 'Rejected',       classes: 'text-red-700 bg-red-50 border-red-200' },
  not_submitted:  { label: 'Not Submitted',  classes: 'text-gray-500 bg-gray-50 border-gray-200' },
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

interface Props {
  onUpdate?: () => void;
}

export function AdminVerificationsPanel({ onUpdate }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [verifications, setVerifications] = useState<TutorVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'all'>('pending_review');

  // Approve state
  const [approveTarget, setApproveTarget] = useState<TutorVerification | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Reject state
  const [rejectTarget, setRejectTarget] = useState<TutorVerification | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const loadVerifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // Get tutor profiles
      let q = supabase
        .from('tutor_profiles')
        .select('user_id, subjects, experience_years, education_background, verification_status, verification_documents, rejection_reason, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (statusFilter !== 'all') {
        q = q.eq('verification_status', statusFilter);
      }

      const { data: tutorProfiles } = await q;
      if (!tutorProfiles?.length) {
        setVerifications([]);
        setIsLoading(false);
        return;
      }

      // Get display profiles
      const userIds = tutorProfiles.map((t) => t.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, email')
        .in('user_id', userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      setVerifications(
        tutorProfiles.map((tp) => {
          const p = profileMap.get(tp.user_id);
          return {
            userId: tp.user_id,
            fullName: p?.full_name ?? 'Unknown Tutor',
            avatarUrl: p?.avatar_url ?? null,
            email: p?.email ?? '',
            subjects: tp.subjects ?? [],
            experienceYears: tp.experience_years ?? 0,
            educationBackground: tp.education_background ?? null,
            verificationStatus: tp.verification_status as VerificationStatus,
            verificationDocuments: tp.verification_documents ?? [],
            rejectionReason: tp.rejection_reason ?? null,
            createdAt: tp.created_at,
          };
        })
      );
    } catch {
      toast({ variant: 'destructive', title: 'Failed to load verifications' });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => { loadVerifications(); }, [loadVerifications]);

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!approveTarget) return;
    setIsApproving(true);
    try {
      const result = await approveTutorAction(approveTarget.userId);
      if (!result.success) throw new Error(result.error);
      toast({ title: 'Tutor approved!', description: 'They can now accept bookings.' });
      setApproveTarget(null);
      await loadVerifications();
      onUpdate?.();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Approval failed', description: err.message });
    } finally {
      setIsApproving(false);
    }
  };

  // ── Reject ───────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      const result = await rejectTutorAction(rejectTarget.userId, rejectReason || 'Profile does not meet requirements');
      if (!result.success) throw new Error(result.error);
      toast({ title: 'Verification rejected' });
      setRejectTarget(null);
      setRejectReason('');
      await loadVerifications();
      onUpdate?.();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Rejection failed', description: err.message });
    } finally {
      setIsRejecting(false);
    }
  };

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = verifications.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.fullName.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      v.subjects.some((s) => s.toLowerCase().includes(q))
    );
  });

  const pendingCount = verifications.filter((v) => v.verificationStatus === 'pending_review').length;

  return (
    <>
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Tutor Verifications</CardTitle>
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
              onClick={loadVerifications}
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
                placeholder="Search tutors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'pending_review', 'approved', 'rejected'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                    statusFilter === s
                      ? 'bg-foreground text-background border-foreground'
                      : 'text-muted-foreground border-border hover:border-foreground/30'
                  }`}
                >
                  {s === 'pending_review' ? 'Pending' : s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
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
              <GraduationCap size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No verifications found</p>
            </div>
          ) : (
            filtered.map((v) => {
              const statusCfg = STATUS_CONFIG[v.verificationStatus];
              return (
                <div
                  key={v.userId}
                  className={`rounded-lg border transition-all hover:shadow-sm ${
                    v.verificationStatus === 'pending_review'
                      ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300 hover:bg-amber-50/50'
                      : 'border-border bg-background hover:border-foreground/20'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={v.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-xs">
                        {getInitials(v.fullName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{v.fullName}</p>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${statusCfg.classes}`}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {v.subjects.slice(0, 3).join(', ')} · {v.experienceYears}yr exp · {v.verificationDocuments.length} docs
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {v.verificationStatus === 'pending_review' && (
                        <>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={(e) => { e.stopPropagation(); setApproveTarget(v); }}
                          >
                            <UserCheck size={12} className="mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); setRejectTarget(v); }}
                          >
                            <UserX size={12} className="mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {v.verificationStatus === 'approved' && (
                        <CheckCircle size={16} className="text-emerald-500" />
                      )}
                      {v.verificationStatus === 'rejected' && (
                        <XCircle size={16} className="text-red-500" />
                      )}
                    </div>
                  </div>

                  {v.rejectionReason && v.verificationStatus === 'rejected' && (
                    <div className="px-3 pb-3">
                      <p className="text-xs text-red-600 bg-red-50 rounded-md px-2.5 py-1.5 border border-red-100">
                        Reason: {v.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── Approve confirmation dialog ─────────────────────────────────────── */}
      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck size={18} className="text-emerald-600" /> Approve Tutor
            </DialogTitle>
            <DialogDescription>
              Approve <strong>{approveTarget?.fullName}</strong>&apos;s profile. They will be able to accept bookings immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2 text-sm">
            <p className="font-medium text-emerald-800">This will:</p>
            <ul className="text-emerald-700 space-y-1 pl-4 list-disc text-xs">
              <li>Set their profile as verified and approved</li>
              <li>Allow them to appear in student search results</li>
              <li>Send them a notification that they can start accepting bookings</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? 'Approving…' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!rejectTarget} onOpenChange={() => { setRejectTarget(null); setRejectReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX size={18} className="text-red-500" /> Reject Verification
            </DialogTitle>
            <DialogDescription>
              Rejecting <strong>{rejectTarget?.fullName}</strong>&apos;s profile verification. Provide a reason below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label>Reason <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="e.g. Documents are unclear, please resubmit..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? 'Rejecting…' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
