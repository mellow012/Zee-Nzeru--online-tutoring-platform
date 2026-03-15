'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell, CheckCheck, BookOpen, Star, UserCheck,
  XCircle, Info, Calendar, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getNotifications, markNotificationRead,
  markAllNotificationsRead, getUnreadCount,
  type AppNotification,
} from '@/app/notifications/actions';

// ─── Notification icon per type ───────────────────────────────────────────────

const TYPE_CONFIG: Record<string, {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}> = {
  booking_request:   { icon: Calendar,   iconBg: 'bg-blue-100',    iconColor: 'text-blue-600' },
  booking_confirmed: { icon: BookOpen,   iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  booking_cancelled: { icon: XCircle,    iconBg: 'bg-red-100',     iconColor: 'text-red-500' },
  session_starting:  { icon: Calendar,   iconBg: 'bg-purple-100',  iconColor: 'text-purple-600' },
  review_received:   { icon: Star,       iconBg: 'bg-amber-100',   iconColor: 'text-amber-500' },
  tutor_approved:    { icon: UserCheck,  iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  tutor_rejected:    { icon: XCircle,    iconBg: 'bg-red-100',     iconColor: 'text-red-500' },
  default:           { icon: Info,       iconBg: 'bg-gray-100',    iconColor: 'text-gray-500' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.default;
}

// ─── Single notification row ───────────────────────────────────────────────────

function NotificationRow({ notif, onRead }: {
  notif: AppNotification;
  onRead: (id: string, url: string | null) => void;
}) {
  const cfg  = getTypeConfig(notif.type);
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
        !notif.isRead ? 'bg-blue-50/40' : ''
      }`}
      onClick={() => onRead(notif.id, notif.actionUrl)}
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold text-gray-900 leading-snug ${!notif.isRead ? 'font-bold' : ''}`}>
          {notif.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
          {notif.message}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Unread dot */}
      {!notif.isRead && (
        <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
      )}
    </motion.div>
  );
}

// ─── Main bell component ───────────────────────────────────────────────────────

interface NotificationBellProps {
  /** 'navbar' = dark bg icon style, 'sidebar' = lighter style */
  variant?: 'navbar' | 'sidebar';
}

export function NotificationBell({ variant = 'navbar' }: NotificationBellProps) {
  const router     = useRouter();
  const [, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [open,         setOpen]         = useState(false);
  const [unread,       setUnread]       = useState(0);
  const [notifications,setNotifications]= useState<AppNotification[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [markingAll,   setMarkingAll]   = useState(false);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    getUnreadCount().then(setUnread);
  }, []);

  // ── Supabase Realtime — listen for new notifications ─────────────────────

  useEffect(() => {
    const supabase = createClient();

    // Get current user id for the channel filter
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event:  'INSERT',
            schema: 'public',
            table:  'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Bump unread count
            setUnread((prev) => prev + 1);

            // Add to list if dropdown is open
            setNotifications((prev) => {
              const n = payload.new as any;
              const newNotif: AppNotification = {
                id:          n.id,
                type:        n.type,
                title:       n.title,
                message:     n.message,
                actionUrl:   n.action_url,
                actionLabel: n.action_label,
                isRead:      false,
                createdAt:   n.created_at,
                sessionId:   n.session_id,
              };
              return [newNotif, ...prev];
            });
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, []);

  // ── Close on outside click ────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Open dropdown — fetch notifications ───────────────────────────────────

  const handleOpen = async () => {
    if (!open) {
      setLoading(true);
      const data = await getNotifications(20);
      setNotifications(data);
      setLoading(false);
    }
    setOpen((o) => !o);
  };

  // ── Mark single read + navigate ───────────────────────────────────────────

  const handleRead = async (id: string, url: string | null) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnread((prev) => Math.max(0, prev - 1));

    await markNotificationRead(id);

    if (url) {
      setOpen(false);
      startTransition(() => router.push(url));
    }
  };

  // ── Mark all read ─────────────────────────────────────────────────────────

  const handleMarkAll = async () => {
    setMarkingAll(true);
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    setMarkingAll(false);
  };

  const buttonClass = variant === 'navbar'
    ? 'relative w-9 h-9 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors'
    : 'relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button onClick={handleOpen} className={buttonClass}>
        <Bell size={16} />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={handleMarkAll}
                    disabled={markingAll}
                    className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    <CheckCheck className="w-3 h-3" />
                    {markingAll ? 'Marking…' : 'Mark all read'}
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto">
              {loading ? (
                <div className="space-y-0.5 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-xl animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                        <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Bell className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notif) => (
                    <NotificationRow
                      key={notif.id}
                      notif={notif}
                      onRead={handleRead}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
                <p className="text-[10px] text-gray-400 text-center">
                  Showing {notifications.length} most recent notifications
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}