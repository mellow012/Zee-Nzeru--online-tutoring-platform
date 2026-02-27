'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  GraduationCap, TrendingUp, Star, ChevronRight, Bell,
  DollarSign, Users, CheckCircle, Home, Wallet, Menu, LogOut,
  Shield, Activity, Settings, Flag, Search, Eye, Ban,
  UserCheck, UserX, MoreVertical, RefreshCw, Download,
  Video, ArrowUpRight, BarChart2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { useRouteGuard } from '@/hooks/use-route-guard';
import { LoadingScreen } from '@/components/Loading';

const revenueData = [
  { month: 'Jul', revenue: 420000, sessions: 89 },
  { month: 'Aug', revenue: 580000, sessions: 124 },
  { month: 'Sep', revenue: 510000, sessions: 108 },
  { month: 'Oct', revenue: 730000, sessions: 156 },
  { month: 'Nov', revenue: 890000, sessions: 189 },
  { month: 'Dec', revenue: 760000, sessions: 162 },
];

const userGrowthData = [
  { month: 'Jul', students: 120, tutors: 32 },
  { month: 'Aug', students: 180, tutors: 45 },
  { month: 'Sep', students: 240, tutors: 58 },
  { month: 'Oct', students: 310, tutors: 74 },
  { month: 'Nov', students: 420, tutors: 91 },
  { month: 'Dec', students: 380, tutors: 84 },
];

const subjectDist = [
  { name: 'Mathematics', value: 35, color: '#10b981' },
  { name: 'Sciences', value: 28, color: '#14b8a6' },
  { name: 'Languages', value: 18, color: '#06b6d4' },
  { name: 'Engineering', value: 12, color: '#6ee7b7' },
  { name: 'Other', value: 7, color: '#d1fae5' },
];

const pendingTutors = [
  { id: 1, name: 'Emmanuel Banda', subject: 'Physics', docs: 3, applied: '2 days ago', avatar: 'EB' },
  { id: 2, name: 'Priya Msiska', subject: 'Chemistry', docs: 2, applied: '3 days ago', avatar: 'PM' },
  { id: 3, name: 'Carlos Tembo', subject: 'Spanish', docs: 4, applied: '5 days ago', avatar: 'CT' },
];

const recentUsers = [
  { id: 1, name: 'Kemi Mensah', role: 'student', joined: '2h ago', status: 'active', avatar: 'KM' },
  { id: 2, name: 'Dr. Sarah Banda', role: 'tutor', joined: '5h ago', status: 'active', avatar: 'SB' },
  { id: 3, name: 'David Phiri', role: 'student', joined: '1d ago', status: 'active', avatar: 'DP' },
  { id: 4, name: 'Amara Nkosi', role: 'student', joined: '1d ago', status: 'suspended', avatar: 'AN' },
  { id: 5, name: 'James Mwale', role: 'tutor', joined: '2d ago', status: 'pending', avatar: 'JM' },
];

const flags = [
  { id: 1, type: 'Payment dispute', user: 'Kemi M. vs Dr. Banda', severity: 'high', time: '1h ago' },
  { id: 2, type: 'Inappropriate message', user: 'Anonymous report', severity: 'medium', time: '3h ago' },
  { id: 3, type: 'Session no-show', user: 'James Mwale', severity: 'low', time: '6h ago' },
];

const navItems = [
  { id: 'home', icon: Home, label: 'Overview' },
  { id: 'users', icon: Users, label: 'Users' },
  { id: 'tutors', icon: UserCheck, label: 'Tutor Approvals', badge: 3 },
  { id: 'sessions', icon: Video, label: 'Sessions' },
  { id: 'revenue', icon: DollarSign, label: 'Revenue' },
  { id: 'reports', icon: BarChart2, label: 'Reports' },
  { id: 'flags', icon: Flag, label: 'Flags & Issues', badge: 3 },
  { id: 'settings', icon: Settings, label: 'App Settings' },
];

const statusColors: Record<string, string> = {
  active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  suspended: 'text-red-700 bg-red-50 border-red-200',
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
};

export default function AdminDashboard() {
  const { user, isLoading } = useRouteGuard();
  const [activeNav, setActiveNav] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
   if (isLoading || !user) return <LoadingScreen role={user?.role} />;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
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
          {navItems.map(({ id, icon: Icon, label, badge }) => (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
                ${activeNav === id
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            >
              <Icon size={17} className="shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{label}</span>
                  {badge && (
                    <span className={`w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center border
                      ${id === 'flags' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                      {badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className={`p-4 border-t border-border ${!sidebarOpen && 'flex justify-center'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                SA
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">Super Admin</p>
                <p className="text-xs text-muted-foreground">admin@zeenzeru.mw</p>
              </div>
              <LogOut size={15} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
              SA
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold">Platform Overview</h1>
              <p className="text-xs text-muted-foreground mt-0.5">3 tutor approvals · 3 flagged issues need attention</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-9 text-xs border-border">
              <Download size={13} className="mr-1.5" /> Export Report
            </Button>
            <button className="w-9 h-9 rounded-lg bg-muted border border-input flex items-center justify-center text-muted-foreground hover:text-emerald-600 transition-colors">
              <RefreshCw size={14} />
            </button>
            <button className="relative w-9 h-9 rounded-lg bg-muted border border-input flex items-center justify-center text-muted-foreground hover:text-emerald-600 transition-colors">
              <Bell size={16} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">6</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: 'MK 3.89M', icon: DollarSign, change: '+22% this month' },
              { label: 'Total Users', value: '1,284', icon: Users, change: '+47 this week' },
              { label: 'Active Sessions', value: '89', icon: Activity, change: 'Live right now' },
              { label: 'Platform Rating', value: '4.8 ★', icon: Star, change: 'Based on 2.1k reviews' },
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Revenue Chart */}
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Revenue & Sessions</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Last 6 months</CardDescription>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Revenue
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-teal-400 opacity-60" style={{ border: '1.5px dashed #14b8a6' }} />
                      Sessions
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="adminRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number, name: string) => [
                        name === 'revenue' ? `MK ${v.toLocaleString()}` : v,
                        name === 'revenue' ? 'Revenue' : 'Sessions'
                      ]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#adminRev)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="sessions" stroke="#14b8a6" fill="none" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subject Distribution */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sessions by Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-3">
                  <PieChart width={130} height={130}>
                    <Pie data={subjectDist} cx={60} cy={60} innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                      {subjectDist.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                <div className="space-y-2">
                  {subjectDist.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{s.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Tutor Approvals */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tutor Approvals</CardTitle>
                  <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-[10px]">
                    3 pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingTutors.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg border border-border hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {t.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.subject} · {t.docs} docs · {t.applied}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white">
                        <UserCheck size={11} className="mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-red-200 text-red-600 hover:bg-red-50">
                        <UserX size={11} className="mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-8 p-0 border-border">
                        <Eye size={11} />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Users */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Users</CardTitle>
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs h-7">
                  Manage <ChevronRight size={12} className="ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {u.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{u.role} · {u.joined}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 capitalize ${statusColors[u.status]}`}>
                        {u.status}
                      </Badge>
                      <MoreVertical size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Flags */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Flags & Issues</CardTitle>
                  <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200 text-[10px]">
                    3 open
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {flags.map((f) => (
                  <div key={f.id} className={`p-3 rounded-lg border transition-colors
                    ${f.severity === 'high' ? 'bg-red-50/50 border-red-200' :
                      f.severity === 'medium' ? 'bg-amber-50/50 border-amber-200' :
                      'bg-muted/30 border-border'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 uppercase tracking-wide font-semibold
                        ${f.severity === 'high' ? 'text-red-700 bg-red-50 border-red-200' :
                          f.severity === 'medium' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                          'text-muted-foreground bg-muted border-border'}`}>
                        {f.severity}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{f.time}</span>
                    </div>
                    <p className="text-sm font-medium">{f.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">{f.user}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-border">
                        Review
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-red-200 text-red-600 hover:bg-red-50">
                        <Ban size={10} className="mr-1" /> Action
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* User Growth */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">User Growth</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Students vs Tutors over time</CardDescription>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Students
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-teal-400" />
                    Tutors
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={userGrowthData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="students" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tutors" stroke="#14b8a6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}