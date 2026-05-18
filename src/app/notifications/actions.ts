'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  isRead: boolean;
  createdAt: string;
  sessionId: string | null;
}

// ─── Fetch notifications ───────────────────────────────────────────────────────

export async function getNotifications(limit = 20): Promise<AppNotification[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, message, action_url, action_label, is_read, created_at, session_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((n) => ({
    id:          n.id,
    type:        n.type,
    title:       n.title,
    message:     n.message,
    actionUrl:   n.action_url,
    actionLabel: n.action_label,
    isRead:      n.is_read,
    createdAt:   n.created_at,
    sessionId:   n.session_id,
  }));
}

// ─── Unread count ──────────────────────────────────────────────────────────────

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return count ?? 0;
}

// ─── Mark one as read ──────────────────────────────────────────────────────────

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
}

// ─── Mark all as read ──────────────────────────────────────────────────────────

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false);
}

// ─── Create notification ────────────────────────────────────────────────────────

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    action_url: params.actionUrl || null,
    action_label: params.actionLabel || null,
  });

  if (error) {
    console.error('[createNotification] error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function notifyAdmins(params: {
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}) {
  const supabase = createAdminClient();

  const { data: admins } = await supabase
    .from('profiles')
    .select('user_id')
    .in('role', ['admin', 'superadmin']);

  if (!admins || admins.length === 0) return { success: true };

  const rows = admins.map((admin) => ({
    user_id: admin.user_id,
    type: params.type,
    title: params.title,
    message: params.message,
    action_url: params.actionUrl || null,
    action_label: params.actionLabel || null,
  }));

  const { error } = await supabase.from('notifications').insert(rows);

  if (error) {
    console.error('[notifyAdmins] error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}