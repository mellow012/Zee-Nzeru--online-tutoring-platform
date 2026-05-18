'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAdminActivitySessions, type AdminActivitySession } from '../actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Activity, Search, RefreshCw, Video, CheckCircle,
  XCircle, Clock, Calendar, DollarSign, User, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const STATUS_CONFIG: Record<string, { label: string; badge: string; color: string }> = {
  pending:     { label: 'Pending Request', badge: 'text-amber-700 bg-amber-50 border-amber-200', color: 'bg-amber-500' },
  confirmed:   { label: 'Confirmed (Unpaid)', badge: 'text-blue-700 bg-blue-50 border-blue-200', color: 'bg-blue-500' },
  in_progress: { label: 'Live Session', badge: 'text-emerald-700 bg-emerald-50 border-emerald-200 animate-pulse', color: 'bg-emerald-500' },
  completed:   { label: 'Completed', badge: 'text-gray-700 bg-gray-50 border-gray-200', color: 'bg-gray-400' },
  cancelled:   { label: 'Cancelled', badge: 'text-red-700 bg-red-50 border-red-200', color: 'bg-red-500' },
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdminActivityPage() {
  const [sessions, setSessions] = useState<AdminActivitySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAdminActivitySessions();
      setSessions(data);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to load activities' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Statistics
  const liveCount = sessions.filter((s) => s.status === 'in_progress').length;
  const pendingCount = sessions.filter((s) => s.status === 'pending').length;
  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const confirmedCount = sessions.filter((s) => s.status === 'confirmed').length;

  // Filtering
  const filtered = sessions.filter((s) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      s.tutorName.toLowerCase().includes(query) ||
      s.studentName.toLowerCase().includes(query) ||
      s.subject.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity size={22} className="text-emerald-600 animate-pulse" />
            Classroom Activity & Session Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time operations log of tutoring sessions, live video classes, and student-tutor engagements.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSessions}
          disabled={isLoading}
          className="gap-2 shrink-0"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Refreshing...' : 'Refresh Logs'}
        </Button>
      </div>

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active (Live)', value: liveCount, color: 'bg-emerald-500/10 text-emerald-700 border-emerald-100', icon: Video },
          { label: 'Confirmed (Paid/Unpaid)', value: confirmedCount, color: 'bg-blue-50/60 text-blue-700 border-blue-100', icon: Calendar },
          { label: 'Pending Requests', value: pendingCount, color: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertCircle },
          { label: 'Completed Sessions', value: completedCount, color: 'bg-gray-50 text-gray-700 border-gray-150', icon: CheckCircle },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-border shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${card.color} border`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main activities board */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <CardTitle className="text-base">Session Records ({filtered.length})</CardTitle>
            
            {/* Search + Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by student, tutor, or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 text-xs px-2.5 rounded-md border border-input bg-background font-medium hover:border-foreground/20 cursor-pointer outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="in_progress">Live Now</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
              <Activity size={36} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">No tutoring activity found</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
              {filtered.map((s) => {
                const config = STATUS_CONFIG[s.status] || { label: s.status, badge: 'text-gray-700 bg-gray-50 border-gray-200', color: 'bg-gray-400' };
                const formattedStart = format(new Date(s.scheduledStartTime), 'd MMM yyyy, HH:mm');
                const formattedEnd = format(new Date(s.scheduledEndTime), 'HH:mm');

                return (
                  <div
                    key={s.id}
                    className={`p-3.5 rounded-xl border transition-all hover:shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      s.status === 'in_progress' ? 'bg-emerald-50/20 border-emerald-200' : 'bg-background border-border'
                    }`}
                  >
                    {/* Left: Tutor + Student involved */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Users Side by Side Avatar */}
                      <div className="flex items-center -space-x-3 shrink-0">
                        <Avatar className="w-9 h-9 border-2 border-background ring-1 ring-border shadow-sm">
                          <AvatarImage src={s.tutorAvatar ?? undefined} />
                          <AvatarFallback className="bg-emerald-500 text-white font-bold text-xs" title={`Tutor: ${s.tutorName}`}>
                            {getInitials(s.tutorName)}
                          </AvatarFallback>
                        </Avatar>
                        <Avatar className="w-9 h-9 border-2 border-background ring-1 ring-border shadow-sm">
                          <AvatarImage src={s.studentAvatar ?? undefined} />
                          <AvatarFallback className="bg-blue-500 text-white font-bold text-xs" title={`Student: ${s.studentName}`}>
                            {getInitials(s.studentName)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Labels and Subject */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">
                            {s.tutorName}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">teaching</span>
                          <span className="text-xs font-semibold text-foreground truncate max-w-[125px] sm:max-w-none">
                            {s.studentName}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium truncate">
                          {s.subject} · ID: <span className="font-mono text-[10px]">{s.id.slice(0, 8)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Middle: Scheduled Time & Session Meta */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Clock size={12} className="text-muted-foreground" />
                        <span suppressHydrationWarning>{formattedStart} - {formattedEnd}</span>
                      </div>
                      {s.actualStartTime && (
                        <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Joined at {format(new Date(s.actualStartTime), 'HH:mm')}
                        </div>
                      )}
                    </div>

                    {/* Right: Payment Price & Status pill */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-border">
                      <div className="flex flex-col items-start md:items-end">
                        <p className="text-xs font-bold text-foreground">
                          {s.currency} {s.price.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">Session Fee</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] py-0.5 px-2.5 border capitalize font-semibold shadow-sm shrink-0 ${config.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.color}`} />
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
