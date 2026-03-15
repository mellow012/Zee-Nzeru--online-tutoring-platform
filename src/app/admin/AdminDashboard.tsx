'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  GraduationCap, TrendingUp, Star, ChevronRight, Bell,
  DollarSign, Users, CheckCircle, Home, Wallet, Menu, LogOut,
  Shield, Activity, Settings, Flag, Search, Eye, Ban,
  UserCheck, UserX, MoreVertical, RefreshCw, Download,
  Video, ArrowUpRight, BarChart2, X,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  approveTutorAction, rejectTutorAction, dismissFlagAction, removeReviewAction,
} from './actions';
import type { AdminDashboardData, PendingTutorRow, FlaggedReviewRow } from './actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const statusColors: Record<string, string> = {
  active:    'text-emerald-700 bg-emerald-50 border-emerald-200',
  suspended: 'text-red-700 bg-red-50 border-red-200',
  pending:   'text-amber-700 bg-amber-50 border-amber-200',
};

const navItems = [
  { id: 'home',     icon: Home,     label: 'Overview' },
  { id: 'users',    icon: Users,    label: 'Users' },
  { id: 'tutors',   icon: UserCheck,label: 'Tutor Approvals' },
  { id: 'sessions', icon: Video,    label: 'Sessions' },
  { id: 'revenue',  icon: DollarSign,label: 'Revenue' },
  { id: 'reports',  icon: BarChart2, label: 'Reports' },
  { id: 'flags',    icon: Flag,     label: 'Flags & Issues' },
  { id: 'settings', icon: Settings, label: 'App Settings' },
];

// ─── Reject dialog ────────────────────────────────────────────────────────────

function RejectDialog({
  tutor, open, onClose, onRejected,
}: {
  tutor: PendingTutorRow | null;
  open: boolean;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState('');
  const [isPending, start] = useTransition();
  const { toast } = useToast();

  const handleReject = () => {
    if (!tutor || !reason.trim()) return;
    start(async () => {
      const result = await rejectTutorAction(tutor.userId, reason.trim());
      if (result.success) {
        toast({ title: 'Application rejected.' });
        onRejected();
        onClose();
        setReason('');
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: result.error });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Application</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Rejecting <span className="font-medium text-foreground">{tutor?.fullName}</span>.
            Provide a reason — this will be shown to the tutor.
          </p>
          <div className="space-y-1.5">
            <Label>Reason <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="e.g. Documents are unclear or incomplete. Please resubmit with a higher quality scan."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!reason.trim() || isPending}
          >
            {isPending ? 'Rejecting…' : 'Confirm Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// Recharts renders differently on server vs client (incremental IDs) — only render after mount
function useIsMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const { user, logout } = useAuth();
  const router    = useRouter();
  const { toast } = useToast();
  const isMounted = useIsMounted();
  const [, startTransition] = useTransition();

  const [activeNav, setActiveNav] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<PendingTutorRow | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const { stats, revenueData, subjectData, userGrowthData, pendingTutors, recentUsers, flaggedReviews } = data;

  const refresh = () => startTransition(() => router.refresh());

  // Convert subject data to percentage for display
  const totalSubjectSessions = subjectData.reduce((sum, s) => sum + s.value, 0);
  const subjectWithPct = subjectData.map((s) => ({
    ...s,
    pct: totalSubjectSessions > 0 ? Math.round((s.value / totalSubjectSessions) * 100) : 0,
  }));

  const handleApprove = async (tutorUserId: string) => {
    setApprovingId(tutorUserId);
    const result = await approveTutorAction(tutorUserId);
    setApprovingId(null);
    if (result.success) {
      toast({ title: 'Tutor approved!', description: 'They can now accept bookings.' });
      refresh();
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
  };

  const handleDismissFlag = async (reviewId: string) => {
    const result = await dismissFlagAction(reviewId);
    if (result.success) {
      toast({ title: 'Flag dismissed.' });
      refresh();
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
  };

  const handleRemoveReview = async (reviewId: string) => {
    const result = await removeReviewAction(reviewId);
    if (result.success) {
      toast({ title: 'Review hidden.' });
      refresh();
    } else {
      toast({ variant: 'destructive', title: 'Failed', description: result.error });
    }
  };

  // Build nav badges from live data
  const navBadges: Record<string, number> = {
    tutors: stats.pendingVerifications,
    flags:  stats.flaggedReviews,
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-[72px]'} transition-all duration-300 flex flex-col bg-card border-r border-border shrink-0`}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
            <GraduationCap size={18} className="text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent block leading-tight">
                Zee Nzeru
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold tracking-widest uppercase">Admin</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-hidden">
          {navItems.map(({ id, icon: Icon, label }) => {
            const badge = navBadges[id];
            return (
              <button
                key={id}
                onClick={() => {
                  setActiveNav(id);
                  if (id === 'users') router.push('/admin/users');
                  if (id === 'tutors') router.push('/admin/verifications');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
                  ${activeNav === id
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
              >
                <Icon size={17} className="shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left">{label}</span>
                    {badge > 0 && (
                      <span className={`w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center border
                        ${id === 'flags' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`p-4 border-t border-border ${!sidebarOpen && 'flex justify-center'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={user?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-sm">
                  {getInitials(user?.fullName ?? 'Admin')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user?.fullName ?? 'Admin'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button onClick={logout} title="Sign out">
                <LogOut size={15} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0" />
              </button>
            </div>
          ) : (
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-sm">
                {getInitials(user?.fullName ?? 'A')}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold">Platform Overview</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.pendingVerifications > 0 && `${stats.pendingVerifications} tutor approval${stats.pendingVerifications !== 1 ? 's' : ''}`}
                {stats.pendingVerifications > 0 && stats.flaggedReviews > 0 && ' · '}
                {stats.flaggedReviews > 0 && `${stats.flaggedReviews} flagged review${stats.flaggedReviews !== 1 ? 's' : ''}`}
                {stats.pendingVerifications === 0 && stats.flaggedReviews === 0 && 'All clear — no items need attention'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-9 text-xs border-border hidden sm:flex">
              <Download size={13} className="mr-1.5" /> Export Report
            </Button>
            <button
              onClick={refresh}
              className="w-9 h-9 rounded-lg bg-muted border border-input flex items-center justify-center text-muted-foreground hover:text-emerald-600 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
            {(stats.pendingVerifications + stats.flaggedReviews) > 0 && (
              <div className="relative w-9 h-9 rounded-lg bg-muted border border-input flex items-center justify-center text-muted-foreground">
                <Bell size={16} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                  {Math.min(9, stats.pendingVerifications + stats.flaggedReviews)}
                </span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Revenue',
                value: `MK ${stats.totalRevenue >= 1_000_000
                  ? `${(stats.totalRevenue / 1_000_000).toFixed(1)}M`
                  : `${(stats.totalRevenue / 1000).toFixed(0)}k`}`,
                icon: DollarSign,
                change: 'Released payments',
              },
              {
                label: 'Total Users',
                value: (stats.totalStudents + stats.totalTutors).toLocaleString(),
                icon: Users,
                change: `${stats.totalStudents} students · ${stats.totalTutors} tutors`,
              },
              {
                label: 'Active Sessions',
                value: stats.activeSessions.toString(),
                icon: Activity,
                change: `${stats.totalSessions} total sessions`,
              },
              {
                label: 'Platform Rating',
                value: stats.platformRating > 0 ? `${stats.platformRating} ★` : '—',
                icon: Star,
                change: `Based on ${stats.reviewCount.toLocaleString()} reviews`,
              },
            ].map(({ label, value, icon: Icon, change }) => (
              <Card key={label} className="border-border shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                      <Icon size={16} />
                    </div>
                    <ArrowUpRight size={14} className="text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">{change}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Revenue chart + subject pie ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Revenue & Sessions</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Last 6 months</CardDescription>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />Revenue
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-teal-400 opacity-60" />Sessions
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  {isMounted ? <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="adminRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
                    <Tooltip
                      contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number, name: string) => [
                        name === 'revenue' ? `MK ${v.toLocaleString()}` : v,
                        name === 'revenue' ? 'Revenue' : 'Sessions',
                      ]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#adminRev)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="sessions" stroke="#14b8a6" fill="none" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  </AreaChart> : <div className="w-full h-full bg-gray-50 rounded animate-pulse" />}
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sessions by Subject</CardTitle>
              </CardHeader>
              <CardContent>
                {subjectWithPct.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No session data yet</p>
                ) : (
                  <>
                    <div className="flex justify-center mb-3">
                      {isMounted ? <PieChart width={130} height={130}>
                        <Pie data={subjectWithPct} cx={60} cy={60} innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                          {subjectWithPct.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart> : <div className="w-[130px] h-[130px] rounded-full bg-gray-100 animate-pulse" />}
                    </div>
                    <div className="space-y-2">
                      {subjectWithPct.map((s) => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-muted-foreground truncate max-w-[100px]">{s.name}</span>
                          </div>
                          <span className="font-semibold text-foreground">{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Tutor approvals + recent users + flags ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Tutor approvals */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tutor Approvals</CardTitle>
                  <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-[10px]">
                    {stats.pendingVerifications} pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingTutors.length === 0 ? (
                  <div className="py-6 text-center">
                    <CheckCircle size={20} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">All caught up!</p>
                  </div>
                ) : (
                  pendingTutors.slice(0, 3).map((t) => {
                    const isApproving = approvingId === t.userId;
                    return (
                      <div key={t.userId} className="p-3 rounded-lg border border-border hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage src={t.avatarUrl ?? undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-xs">
                              {getInitials(t.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              {t.subjects.slice(0, 2).join(', ')}
                              {t.subjects.length > 2 && ` +${t.subjects.length - 2}`}
                              {' · '}{t.docsCount} doc{t.docsCount !== 1 ? 's' : ''}
                              {' · '}{formatDistanceToNow(new Date(t.submittedAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleApprove(t.userId)}
                            disabled={isApproving}
                          >
                            <UserCheck size={11} className="mr-1" />
                            {isApproving ? '…' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-[11px] border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => setRejectTarget(t)}
                          >
                            <UserX size={11} className="mr-1" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-8 p-0 border-border"
                            onClick={() => router.push('/admin/verifications')}
                            title="View all"
                          >
                            <Eye size={11} />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
                {pendingTutors.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7"
                    onClick={() => router.push('/admin/verifications')}
                  >
                    View all {stats.pendingVerifications} <ChevronRight size={12} className="ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Recent Users */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Users</CardTitle>
                <Button
                  variant="ghost" size="sm"
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs h-7"
                  onClick={() => router.push('/admin/users')}
                >
                  Manage <ChevronRight size={12} className="ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {recentUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No users yet</p>
                ) : (
                  recentUsers.map((u) => (
                    <div
                      key={u.userId}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
                      onClick={() => router.push('/admin/users')}
                    >
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={u.avatarUrl ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-xs">
                          {getInitials(u.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {u.role} · {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 h-4 capitalize ${
                            u.isActive ? statusColors.active : statusColors.suspended
                          }`}
                        >
                          {u.isActive ? 'active' : 'suspended'}
                        </Badge>
                        <MoreVertical size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Flagged reviews */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Flags & Issues</CardTitle>
                  <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200 text-[10px]">
                    {stats.flaggedReviews} open
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {flaggedReviews.length === 0 ? (
                  <div className="py-6 text-center">
                    <CheckCircle size={20} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No flagged reviews</p>
                  </div>
                ) : (
                  flaggedReviews.slice(0, 3).map((f) => (
                    <div
                      key={f.id}
                      className="p-3 rounded-lg border bg-red-50/30 border-red-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 uppercase tracking-wide font-semibold text-red-700 bg-red-50 border-red-200">
                          flagged
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {f.reviewer?.fullName ?? 'User'} → {f.reviewee?.fullName ?? 'Tutor'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 mb-2.5 line-clamp-1">
                        {f.flagReason ?? f.comment ?? 'No reason provided'}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-[11px] border-border"
                          onClick={() => handleDismissFlag(f.id)}
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-[11px] border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveReview(f.id)}
                        >
                          <Ban size={10} className="mr-1" /> Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── User growth chart ── */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">User Growth</CardTitle>
                  <CardDescription className="text-xs mt-0.5">New students vs tutors — last 6 months</CardDescription>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />Students
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-teal-400" />Tutors
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={130}>
                {isMounted ? <LineChart data={userGrowthData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="students" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tutors" stroke="#14b8a6" strokeWidth={2} dot={false} />
                </LineChart> : <div className="w-full h-full bg-gray-50 rounded animate-pulse" />}
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>
      </main>

      {/* Reject dialog */}
      <RejectDialog
        tutor={rejectTarget}
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onRejected={refresh}
      />
    </div>
  );
}