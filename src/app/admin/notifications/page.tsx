'use client';

import { useState, useEffect, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NotificationBell } from '@/components/NotificationBell';
import { useToast } from '@/hooks/use-toast';
import {
  broadcastNotificationAction,
  getNotificationsLog,
  type NotificationAudience,
  type NotificationLogEntry,
} from './actions';
import {
  Send, Bell, Users, GraduationCap, BookOpen,
  RefreshCw, Megaphone, CheckCircle, Info, Star,
  UserCheck, XCircle, Calendar,
} from 'lucide-react';

// ─── Type icon mapping ────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  admin_broadcast:      { icon: Megaphone,    bg: 'bg-purple-100',  color: 'text-purple-600' },
  booking_request:      { icon: Calendar,     bg: 'bg-blue-100',    color: 'text-blue-600' },
  booking_confirmed:    { icon: CheckCircle,  bg: 'bg-emerald-100', color: 'text-emerald-600' },
  booking_declined:     { icon: XCircle,      bg: 'bg-red-100',     color: 'text-red-500' },
  session_completed:    { icon: Star,         bg: 'bg-amber-100',   color: 'text-amber-600' },
  session_cancelled:    { icon: XCircle,      bg: 'bg-red-100',     color: 'text-red-500' },
  tutor_application:    { icon: BookOpen,     bg: 'bg-blue-100',    color: 'text-blue-600' },
  tutor_approved:       { icon: UserCheck,    bg: 'bg-emerald-100', color: 'text-emerald-600' },
  tutor_rejected:       { icon: XCircle,      bg: 'bg-red-100',     color: 'text-red-500' },
  verification_approved:{ icon: UserCheck,    bg: 'bg-emerald-100', color: 'text-emerald-600' },
  verification_rejected:{ icon: XCircle,      bg: 'bg-red-100',     color: 'text-red-500' },
  default:              { icon: Info,         bg: 'bg-gray-100',    color: 'text-gray-500' },
};

function getTypeIcon(type: string) {
  return TYPE_ICONS[type] ?? TYPE_ICONS.default;
}

const AUDIENCE_OPTIONS: { value: NotificationAudience; label: string; desc: string; icon: React.ElementType }[] = [
  { value: 'all',      label: 'All Users',    desc: 'Students + Tutors',      icon: Users },
  { value: 'students', label: 'Students Only', desc: 'All enrolled students',  icon: GraduationCap },
  { value: 'tutors',   label: 'Tutors Only',   desc: 'All registered tutors',  icon: BookOpen },
];

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // ── Broadcast form ──────────────────────────────────────────────────────
  const [audience, setAudience] = useState<NotificationAudience>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('');

  // ── Log ─────────────────────────────────────────────────────────────────
  const [log, setLog] = useState<NotificationLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  const loadLog = async () => {
    setLogLoading(true);
    const data = await getNotificationsLog(60);
    setLog(data);
    setLogLoading(false);
  };

  useEffect(() => { loadLog(); }, []);

  const handleBroadcast = () => {
    if (!title.trim() || !message.trim()) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Title and message are required.' });
      return;
    }

    startTransition(async () => {
      const result = await broadcastNotificationAction({
        audience,
        title: title.trim(),
        message: message.trim(),
        actionUrl: actionUrl.trim() || undefined,
        actionLabel: actionLabel.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: 'Broadcast sent! 📣',
          description: `Notification delivered to ${result.count} user${result.count !== 1 ? 's' : ''}.`,
        });
        setTitle('');
        setMessage('');
        setActionUrl('');
        setActionLabel('');
        loadLog();
      } else {
        toast({ variant: 'destructive', title: 'Broadcast failed', description: result.error });
      }
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Megaphone size={20} className="text-emerald-600" />
            Notification Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Broadcast messages to your users and review notification history.
          </p>
        </div>
        <NotificationBell variant="navbar" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Broadcast composer ──────────────────────────────────────────── */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send size={15} className="text-emerald-600" />
              New Broadcast
            </CardTitle>
            <CardDescription className="text-xs">
              Send a notification to a group of users instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Audience selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audience</Label>
              <div className="grid grid-cols-1 gap-2">
                {AUDIENCE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = audience === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setAudience(opt.value)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200'
                          : 'border-border hover:border-foreground/20 hover:bg-muted/30'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selected ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon size={15} />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${selected ? 'text-emerald-700' : ''}`}>{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs">Title <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Platform Maintenance Notice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label className="text-xs">Message <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Write your notification message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Optional action link */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Action URL (optional)</Label>
                <Input
                  placeholder="/student/sessions"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Button Label (optional)</Label>
                <Input
                  placeholder="View Details"
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Send button */}
            <Button
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 font-semibold"
              onClick={handleBroadcast}
              disabled={isPending || !title.trim() || !message.trim()}
            >
              {isPending ? (
                <>
                  <RefreshCw size={14} className="mr-2 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send size={14} className="mr-2" /> Send Broadcast
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── Notification log ───────────────────────────────────────────── */}
        <Card className="lg:col-span-3 border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell size={15} className="text-muted-foreground" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  All notifications across the platform
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={loadLog}
                disabled={logLoading}
              >
                <RefreshCw size={14} className={logLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {logLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : log.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                {log.map((entry) => {
                  const cfg = getTypeIcon(entry.type);
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold truncate">{entry.title}</p>
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 capitalize border-border">
                            {entry.userRole}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{entry.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            → {entry.userName}
                          </span>
                          <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                            · {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      {!entry.isRead && (
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
