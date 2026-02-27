'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  GraduationCap, Calendar, Clock, TrendingUp, MessageCircle,
  Search, Star, ChevronRight, Bell, Play, User,
  LogOut, Home, History, Wallet, Menu, CheckCircle, Video,
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useRouteGuard } from '@/hooks/use-route-guard';
import { LoadingScreen } from '@/components/Loading';

const progressData = [
  { week: 'W1', hours: 2 }, { week: 'W2', hours: 4 }, { week: 'W3', hours: 3 },
  { week: 'W4', hours: 6 }, { week: 'W5', hours: 5 }, { week: 'W6', hours: 8 },
  { week: 'W7', hours: 7 }, { week: 'W8', hours: 9 },
];

const upcomingSessions = [
  { id: 1, tutor: 'Dr. Sarah Banda', subject: 'Calculus II', time: 'Today, 3:00 PM', duration: '60 min', avatar: 'SB' },
  { id: 2, tutor: 'James Nkhoma', subject: 'Physics', time: 'Tomorrow, 10:00 AM', duration: '45 min', avatar: 'JN' },
  { id: 3, tutor: 'Aisha Phiri', subject: 'Chemistry', time: 'Thu, 2:00 PM', duration: '90 min', avatar: 'AP' },
];

const sessionHistory = [
  { id: 1, tutor: 'Dr. Sarah Banda', subject: 'Calculus II', date: 'Nov 18', duration: '60 min', rating: 5, cost: 'MK 4,500' },
  { id: 2, tutor: 'James Nkhoma', subject: 'Physics', date: 'Nov 15', duration: '45 min', rating: 4, cost: 'MK 3,000' },
  { id: 3, tutor: 'Aisha Phiri', subject: 'Chemistry', date: 'Nov 12', duration: '90 min', rating: 5, cost: 'MK 6,000' },
  { id: 4, tutor: 'Marco Mvula', subject: 'Linear Algebra', date: 'Nov 8', duration: '60 min', rating: 4, cost: 'MK 4,000' },
];

const featuredTutors = [
  { id: 1, name: 'Dr. Sarah Banda', subject: 'Mathematics', rating: 4.9, sessions: 312, price: 'MK 4,500/hr', avatar: 'SB', tags: ['Calculus', 'Statistics'] },
  { id: 2, name: 'James Nkhoma', subject: 'Physics', rating: 4.8, sessions: 198, price: 'MK 3,500/hr', avatar: 'JN', tags: ['Mechanics', 'Quantum'] },
  { id: 3, name: 'Aisha Phiri', subject: 'Chemistry', rating: 5.0, sessions: 425, price: 'MK 4,000/hr', avatar: 'AP', tags: ['Organic', 'Inorganic'] },
];

const navItems = [
  { id: 'home', icon: Home, label: 'Dashboard' },
  { id: 'sessions', icon: Calendar, label: 'Sessions' },
  { id: 'tutors', icon: Search, label: 'Find Tutors' },
  { id: 'history', icon: History, label: 'History' },
  { id: 'messages', icon: MessageCircle, label: 'Messages', badge: 2 },
  { id: 'progress', icon: TrendingUp, label: 'Progress' },
  { id: 'payments', icon: Wallet, label: 'Payments' },
];

export default function StudentDashboard() {
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

        <div className={`p-4 border-t border-border ${!sidebarOpen && 'flex justify-center'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                KM
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">Kemi Mensah</p>
                <p className="text-xs text-muted-foreground">Student</p>
              </div>
              <LogOut size={15} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
              KM
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold">Good morning, Kemi 👋</h1>
              <p className="text-xs text-muted-foreground mt-0.5">You have 3 upcoming sessions this week</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <input
                placeholder="Search tutors, subjects..."
                className="bg-muted border border-input rounded-lg px-4 py-2 pl-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 w-56 transition-all"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <button className="relative w-9 h-9 rounded-lg bg-muted border border-input flex items-center justify-center text-muted-foreground hover:text-emerald-600 transition-colors">
              <Bell size={16} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 rounded-full text-[10px] text-white font-bold flex items-center justify-center">3</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Sessions', value: '47', icon: Video, change: '+8 this month' },
              { label: 'Hours Learned', value: '63h', icon: Clock, change: '+12h this month' },
              { label: 'Active Tutors', value: '5', icon: User, change: '2 new this month' },
              { label: 'Total Spent', value: 'MK 84k', icon: Wallet, change: 'MK 18k this month' },
            ].map(({ label, value, icon: Icon, change }) => (
              <Card key={label} className="border-border shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                      <Icon size={16} />
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200 font-medium">
                      ↑ Up
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">{change}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Upcoming Sessions */}
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Upcoming Sessions</CardTitle>
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs h-7">
                  View all <ChevronRight size={12} className="ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {upcomingSessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {s.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{s.tutor}</p>
                      <p className="text-xs text-muted-foreground">{s.subject} · {s.duration}</p>
                    </div>
                    <p className="text-xs text-muted-foreground hidden sm:block shrink-0">{s.time}</p>
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <Play size={10} className="mr-1" /> Join
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Progress */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Study Progress</CardTitle>
                <CardDescription className="text-xs">Weekly study hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={progressData}>
                    <defs>
                      <linearGradient id="studProg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }} />
                    <Area type="monotone" dataKey="hours" stroke="#10b981" fill="url(#studProg)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2.5">
                  {[{ label: 'Mathematics', pct: 78 }, { label: 'Physics', pct: 55 }, { label: 'Chemistry', pct: 62 }].map(({ label, pct }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recommended Tutors */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recommended Tutors</CardTitle>
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs h-7">
                  Browse all <ChevronRight size={12} className="ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {featuredTutors.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer group">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {t.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{t.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={10} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs text-muted-foreground">{t.rating} · {t.sessions} sessions</span>
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {t.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded border border-border">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-emerald-600">{t.price}</p>
                      <Button size="sm" className="mt-1.5 h-6 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white">
                        Book
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Session History */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Session History</CardTitle>
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs h-7">
                  View all <ChevronRight size={12} className="ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {sessionHistory.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.tutor} · {s.date} · {s.duration}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{s.cost}</p>
                      <div className="flex items-center gap-0.5 justify-end mt-0.5">
                        {Array.from({ length: s.rating }).map((_, i) => (
                          <Star key={i} size={9} className="text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                    </div>
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