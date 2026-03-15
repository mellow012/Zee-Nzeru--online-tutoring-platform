'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import {
  UserCheck, UserX, CheckCircle2, XCircle, Clock,
  ExternalLink, FileText, ChevronDown, ChevronUp,
  Star, Briefcase, BookOpen, Globe, DollarSign,
  GraduationCap, MessageSquare, Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { approveTutorAction, rejectTutorAction } from '../actions';
import type { FullTutorRow } from './page';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending_review: { label: 'Pending Review', icon: Clock,        cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  approved:       { label: 'Approved',        icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  rejected:       { label: 'Rejected',        icon: XCircle,      cls: 'text-red-700 bg-red-50 border-red-200' },
  not_submitted:  { label: 'Not Submitted',   icon: Clock,        cls: 'text-gray-600 bg-gray-50 border-gray-200' },
} as const;

const TABS = [
  { key: 'pending_review', label: 'Pending' },
  { key: 'approved',       label: 'Approved' },
  { key: 'rejected',       label: 'Rejected' },
  { key: 'all',            label: 'All' },
];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-900 leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

// ─── Document preview panel ───────────────────────────────────────────────────

function DocPreview({ doc }: {
  doc: FullTutorRow['docMeta'][number];
}) {
  const [loaded, setLoaded] = useState(false);

  if (!doc.signedUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="text-xs text-gray-500 truncate">{doc.name}</span>
        <span className="text-xs text-red-400 ml-auto shrink-0">URL expired</span>
      </div>
    );
  }

  if (doc.isPdf) {
    return (
      <a
        href={doc.signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 p-3 bg-red-50 rounded-xl border border-red-100 hover:border-red-300 transition-colors group"
      >
        <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-red-800 truncate">{doc.name}</p>
          <p className="text-[10px] text-red-500">PDF Document · Click to open</p>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-red-400 group-hover:text-red-600 shrink-0" />
      </a>
    );
  }

  // Image — show inline with click-to-open
  return (
    <a
      href={doc.signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl overflow-hidden border border-gray-200 hover:border-emerald-300 transition-colors group relative"
    >
      {!loaded && (
        <div className="w-full h-40 bg-gray-100 animate-pulse flex items-center justify-center">
          <FileText className="w-6 h-6 text-gray-400" />
        </div>
      )}
      <img
        src={doc.signedUrl}
        alt={doc.name}
        className={`w-full object-cover max-h-64 transition-opacity ${loaded ? 'opacity-100' : 'opacity-0 h-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
      </div>
      <p className="px-2.5 py-1.5 text-[10px] text-gray-500 bg-white border-t border-gray-100 truncate">{doc.name}</p>
    </a>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function TutorDetailPanel({ tutor }: { tutor: FullTutorRow }) {
  return (
    <div className="border-t border-gray-100 bg-gray-50/40">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

        {/* ── Left: Tutor info ── */}
        <div className="p-5 space-y-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Tutor Information
          </p>

          {/* Subjects */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Subjects</p>
            <div className="flex flex-wrap gap-1.5">
              {tutor.subjects.length > 0
                ? tutor.subjects.map((s) => (
                    <span key={s} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                      {s}
                    </span>
                  ))
                : <span className="text-xs text-gray-400 italic">None listed</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={DollarSign}   label="Hourly Rate"  value={tutor.hourlyRate > 0 ? `${tutor.currency} ${tutor.hourlyRate.toLocaleString()}` : null} />
            <InfoRow icon={Briefcase}    label="Experience"   value={tutor.experienceYears > 0 ? `${tutor.experienceYears} year${tutor.experienceYears !== 1 ? 's' : ''}` : null} />
          </div>

          <InfoRow icon={GraduationCap}  label="Education"    value={tutor.educationBackground} />
          <InfoRow icon={BookOpen}       label="Teaching Style" value={tutor.teachingStyle} />

          {/* Languages */}
          {tutor.languages.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Languages
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tutor.languages.map((l) => (
                  <span key={l} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {tutor.bio && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Bio
              </p>
              <p className="text-sm text-gray-700 leading-relaxed bg-white rounded-lg p-3 border border-gray-100">
                {tutor.bio}
              </p>
            </div>
          )}

          {/* Rejection reason */}
          {tutor.rejectionReason && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1">Previous Rejection Reason</p>
              <p className="text-sm text-red-800">{tutor.rejectionReason}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="pt-2 border-t border-gray-100 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Submitted: {format(new Date(tutor.submittedAt), 'dd MMM yyyy, HH:mm')}
            </p>
            {tutor.reviewedAt && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                Last reviewed: {format(new Date(tutor.reviewedAt), 'dd MMM yyyy, HH:mm')}
              </p>
            )}
          </div>
        </div>

        {/* ── Right: Documents ── */}
        <div className="p-5 space-y-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Verification Documents ({tutor.docsCount})
          </p>

          {tutor.docMeta.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-200">
              <FileText className="w-6 h-6 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">No documents uploaded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tutor.docMeta.map((doc) => (
                <DocPreview key={doc.path} doc={doc} />
              ))}
            </div>
          )}

          {tutor.docsCount > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Documents are stored securely. Links expire in 2 hours.
              Images shown inline — click to open full size.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VerificationsClient({ tutors }: { tutors: FullTutorRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [activeTab,    setActiveTab]    = useState('pending_review');
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<FullTutorRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingId,  setApprovingId]  = useState<string | null>(null);
  const [isRejecting,  startRejectTransition] = useTransition();

  const refresh = () => startTransition(() => router.refresh());

  const filtered = activeTab === 'all'
    ? tutors
    : tutors.filter((t) => t.verificationStatus === activeTab);

  const pendingCount = tutors.filter((t) => t.verificationStatus === 'pending_review').length;

  const handleApprove = async (userId: string) => {
    setApprovingId(userId);
    const result = await approveTutorAction(userId);
    setApprovingId(null);
    if (result.success) {
      toast({ title: 'Tutor approved!', description: 'They can now access the full platform.' });
      refresh();
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
  };

  const handleRejectConfirm = () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    startRejectTransition(async () => {
      const result = await rejectTutorAction(rejectTarget.userId, rejectReason.trim());
      if (result.success) {
        toast({ title: 'Application rejected.', description: 'The tutor has been notified.' });
        setRejectTarget(null);
        setRejectReason('');
        refresh();
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: result.error });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Tutor Verifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCount > 0
              ? `${pendingCount} application${pendingCount !== 1 ? 's' : ''} awaiting review`
              : 'All caught up — no pending applications'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(({ key, label }) => {
            const count = key === 'all'
              ? tutors.length
              : tutors.filter((t) => t.verificationStatus === key).length;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${
                    activeTab === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="py-14 flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <p className="text-sm text-muted-foreground">Nothing here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((tutor) => {
              const isExpanded  = expandedId === tutor.userId;
              const cfg         = STATUS_CONFIG[tutor.verificationStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.not_submitted;
              const StatusIcon  = cfg.icon;
              const isPending   = tutor.verificationStatus === 'pending_review';
              const isApproving = approvingId === tutor.userId;

              return (
                <Card key={tutor.userId} className="shadow-sm border-0 overflow-hidden">
                  {/* Summary row */}
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage src={tutor.avatarUrl ?? undefined} />
                        <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold text-sm">
                          {getInitials(tutor.fullName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-semibold text-sm">{tutor.fullName}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tutor.subjects.slice(0, 3).join(', ')}
                          {tutor.subjects.length > 3 && ` +${tutor.subjects.length - 3} more`}
                          {tutor.experienceYears > 0 && ` · ${tutor.experienceYears}y exp`}
                          {' · '}{tutor.docsCount} doc{tutor.docsCount !== 1 ? 's' : ''}
                          {' · '}submitted {formatDistanceToNow(new Date(tutor.submittedAt), { addSuffix: true })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPending && (
                          <>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 h-8 text-xs"
                              onClick={() => handleApprove(tutor.userId)}
                              disabled={isApproving}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              {isApproving ? 'Approving…' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5 h-8 text-xs"
                              onClick={() => { setRejectTarget(tutor); setRejectReason(''); }}
                              disabled={isApproving}
                            >
                              <UserX className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </>
                        )}
                        {/* Expand / collapse toggle */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : tutor.userId)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          {isExpanded ? (
                            <><ChevronUp className="w-4 h-4" /> Hide</>
                          ) : (
                            <><ChevronDown className="w-4 h-4" /> View Details</>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Detail panel */}
                    {isExpanded && <TutorDetailPanel tutor={tutor} />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {rejectTarget && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={rejectTarget.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-emerald-50 text-emerald-700 text-xs font-bold">
                    {getInitials(rejectTarget.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{rejectTarget.fullName}</p>
                  <p className="text-xs text-muted-foreground">{rejectTarget.subjects.slice(0, 2).join(', ')}</p>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              This reason will be shown to the tutor so they know what to fix before resubmitting.
            </p>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="e.g. Your degree certificate scan is unclear. Please resubmit with a higher quality photo showing your name and qualification."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim() || isRejecting}
            >
              {isRejecting ? 'Rejecting…' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}