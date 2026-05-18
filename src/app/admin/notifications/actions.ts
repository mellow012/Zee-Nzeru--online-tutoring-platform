'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/app/notifications/actions';

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') return null;
  return { supabase, adminId: user.id };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationAudience = 'all' | 'students' | 'tutors';

export interface BroadcastInput {
  audience: NotificationAudience;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationLogEntry {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
  userName: string;
  userRole: string;
}

// ─── Broadcast notification to audience ───────────────────────────────────────

export async function broadcastNotificationAction(
  input: BroadcastInput
): Promise<{ success: boolean; count?: number; error?: string }> {
  const auth = await requireAdmin();
  if (!auth) return { success: false, error: 'Unauthorized' };

  if (!input.title?.trim()) return { success: false, error: 'Title is required' };
  if (!input.message?.trim()) return { success: false, error: 'Message is required' };

  try {
    const adminSupabase = createAdminClient();

    // Determine audience filter
    let q = adminSupabase.from('profiles').select('user_id');

    if (input.audience === 'students') {
      q = q.eq('role', 'student');
    } else if (input.audience === 'tutors') {
      q = q.eq('role', 'tutor');
    } else {
      // 'all' — get everyone except admin roles
      q = q.in('role', ['student', 'tutor']);
    }

    const { data: users, error: fetchError } = await q;
    if (fetchError) return { success: false, error: fetchError.message };
    if (!users?.length) return { success: false, error: 'No users found for this audience' };

    // Batch insert — use admin client directly for performance
    const notifications = users.map((u) => ({
      user_id: u.user_id,
      type: 'admin_broadcast',
      title: input.title.trim(),
      message: input.message.trim(),
      action_url: input.actionUrl?.trim() || null,
      action_label: input.actionLabel?.trim() || null,
    }));

    // Insert in chunks of 100 to avoid payload limits
    const CHUNK_SIZE = 100;
    let inserted = 0;
    for (let i = 0; i < notifications.length; i += CHUNK_SIZE) {
      const chunk = notifications.slice(i, i + CHUNK_SIZE);
      const { error: insertError } = await adminSupabase.from('notifications').insert(chunk);
      if (insertError) {
        console.error('[broadcastNotification] chunk error:', insertError);
        return { success: false, error: `Failed after ${inserted} notifications: ${insertError.message}` };
      }
      inserted += chunk.length;
    }

    return { success: true, count: inserted };
  } catch (err: any) {
    console.error('[broadcastNotification] error:', err);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// ─── Get recent notifications log for admin ───────────────────────────────────

export async function getNotificationsLog(
  limit = 50
): Promise<NotificationLogEntry[]> {
  const auth = await requireAdmin();
  if (!auth) return [];

  const adminSupabase = createAdminClient();

  const { data } = await adminSupabase
    .from('notifications')
    .select('id, type, title, message, action_url, is_read, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  // Hydrate user names
  const userIds = [...new Set(data.map((n) => n.user_id))];
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('user_id, full_name, role')
    .in('user_id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return data.map((n) => {
    const p = profileMap.get(n.user_id);
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      actionUrl: n.action_url,
      isRead: n.is_read,
      createdAt: n.created_at,
      userName: p?.full_name ?? 'Unknown',
      userRole: p?.role ?? 'unknown',
    };
  });
}
