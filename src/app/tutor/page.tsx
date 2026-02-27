'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  GraduationCap, Calendar, TrendingUp, MessageCircle, Star,
  ChevronRight, Bell, DollarSign, Users, CheckCircle,
  Home, Wallet, Menu, LogOut, User, Shield, Play,
  Plus, Video, ArrowUpRight, BookOpen,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useRouteGuard } from '@/hooks/use-route-guard';
import { LoadingScreen } from '@/components/Loading';

const earningsData = [
  { month: 'Jul', amount: 82000 }, { month: 'Aug', amount: 110000 },
  { month: 'Sep', amount: 96000 }, { month: 'Oct', amount: 134000 },
  { month: 'Nov', amount: 158000 }, { month: 'Dec', amount: 120000 },
];

const upcomingSessions = [
  { id: 1, student: 'Kemi Mensah', subject: 'Calculus II', time: 'Today, 3:00 PM', duration: '60 min', avatar: 'KM', isToday: true },
  { id: 2, student: 'David Osei', subject: 'Calculus II', time: 'Today, 5:00 PM', duration: '45 min', avatar: 'DO', isToday: true },
  { id: 3, student: 'Fatima Ali', subject: 'Statistics', time: 'Tomorrow, 9:00 AM', duration: '90 min', avatar: 'FA', isToday: false },
];

const incomingRequests = [
  { id: 1, student: 'James Park', subject: 'Linear Algebra', time: 'Fri, 4:00 PM', avatar: 'JP', message: 'Need help with eigenvalues for my exam next week' },
  { id: 2, student: 'Amara Diallo', subject: 'Calculus I', time: 'Sat, 11:00 AM', avatar: 'AD', message: 'Looking for regular weekly sessions' },
];

const recentMessages = [
  { id: 1, student: 'Kemi Mensah', message: 'Looking forward to our session today!', time: '2h ago', unread: true, avatar: 'KM' },
  { id: 2, student: 'David Osei', message: "Could we extend today's session by 15 mins?", time: '4h ago', unread: true, avatar: 'DO' },
  { id: 3, student: 'Fatima Ali', message: 'Thank you, that explanation was perfect.', time: '1d ago', unread: false, avatar: 'FA' },
];

const navItems = [
  { id: 'home', icon: Home, label: 'Dashboard' },
  { id: 'sessions', icon: Calendar, label: 'Sessions' },
  { id: 'requests', icon: Users, label: 'Requests', badge: 2 },
  { id: 'messages', icon: MessageCircle, label: 'Messages', badge: 2 },
  { id: 'earnings', icon: Wallet, label: 'Earnings' },
  { id: 'profile', icon: User, label: 'My Profile' },
  { id: 'verification', icon: Shield, label: 'Verification' },
];

export default function TutorDashboard() {
   const { user, isLoading } = useRouteGuard(); // auto: allows student + admin
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
            <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent whitespace-nowrap">
              Zee Nzeru
            </span>
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
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center justify-center border border-emerald-200">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Verified badge */}
        {sidebarOpen && (
          <div className="mx-3 mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-600 shrink-0" />
              <span className="text-xs text-emerald-700 font-medium">Verified Tutor</span>
            </div>
          </div>
        )}

        <div className={`p-4 border-t border-border ${!sidebarOpen && 'flex justify-center'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                SB
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">Dr. Sarah Banda</p>
                <p className="text-xs text-muted-foreground">Mathematics Tutor</p>
              </div>
              <LogOut size={15} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
              SB
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
              <h1 className="text-lg font-bold">Tutor Dashboard</h1>
              <p className="text-xs text-muted-foreground mt-0.5">2 new booking requests waiting</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs">
              <Plus size={14} className="mr-1.5" /> Set Availability
            </Button>
            <button className="relative w-9 h-9 rounded-lg bg-muted border border-input flex items-center justify-center text-muted-foreground hover:text-emerald-600 transition-colors">
              <Bell size={16} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 rounded-full text-[10px] text-white font-bold flex items-center justify-center">4</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Monthly Earnings', value: 'MK 158k', icon: DollarSign, change: '+18% vs last month' },
              { label: 'Sessions This Month', value: '34', icon: Video, change: '+5 vs last month' },
              { label: 'Active Students', value: '12', icon: Users, change: '3 new this month' },
              { label: 'Avg. Rating', value: '4.9 ★', icon: Star, change: 'Based on 312 reviews' },
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
            {/* Earnings Chart */}
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Earnings Overview</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Last 6 months (MK)</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-600">MK 700k</p>
                    <p className="text-xs text-muted-foreground">Total period</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={earningsData} barSize={24}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [`MK ${v.toLocaleString()}`, 'Earnings']}
                    />
                    <Bar dataKey="amount" fill="#10b981" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Today's Sessions */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Today's Sessions</CardTitle>
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px]">
                    2 today
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {upcomingSessions.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg border border-border hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {s.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.student}</p>
                        <p className="text-xs text-muted-foreground">{s.subject} · {s.duration}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{s.time}</span>
                      {s.isToday && (
                        <Button size="sm" className="h-6 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white">
                          <Play size={9} className="mr-1" /> Start
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Booking Requests */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Booking Requests</CardTitle>
                  <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-[10px]">
                    2 pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {incomingRequests.map((r) => (
                  <div key={r.id} className="p-4 rounded-lg border border-amber-200 bg-amber-50/40">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {r.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{r.student}</p>
                        <p className="text-xs text-muted-foreground">{r.subject} · {r.time}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 italic bg-background rounded p-2 border border-border">
                      "{r.message}"
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-border">
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Messages */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Messages</CardTitle>
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs h-7">
                  Open all <ChevronRight size={12} className="ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {recentMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer
                      ${m.unread
                        ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50'
                        : 'border-border hover:bg-muted/50'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {m.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium ${m.unread ? 'text-foreground' : 'text-foreground'}`}>{m.student}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{m.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{m.message}</p>
                    </div>
                    {m.unread && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}