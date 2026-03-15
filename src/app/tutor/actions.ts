'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// ─── Exported types ───────────────────────────────────────────────────────────

export interface TutorStats {
  pendingRequestsCount: number;
  upcomingCount: number;
  completedTotal: number;
  monthEarnings: number;       // released payments this calendar month
  totalEarnings: number;       // all-time released
  averageRating: number;
  totalStudents: number;
}

export interface TutorSessionRow {
  id: string;
  student_id: string;
  subject: string;
  title: string | null;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  duration_minutes: number | null;
  status: string;
  price: number;
  currency: string;
  session_notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  studentProfile: { full_name: string; avatar_url: string | null } | null;
  hasReview: boolean;
}

export interface EarningsRow {
  id: string;
  amount: number;
  currency: string;
  platform_fee: number;
  tutor_payout: number;
  status: string;
  payment_gateway: string | null;
  paid_at: string | null;
  released_at: string | null;
  session: {
    subject: string;
    scheduled_start_time: string;
  } | null;
}

export interface TutorDashboardData {
  stats: TutorStats;
  todaySessions: TutorSessionRow[];
  pendingRequests: TutorSessionRow[];
  upcomingByDay: { date: string; sessions: TutorSessionRow[] }[];
}

// ─── Dashboard data loader ────────────────────────────────────────────────────

export async function getTutorDashboardData(): Promise<TutorDashboardData> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/');

  const tutorId = user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const [
    { data: allSessions },
    { data: payments },
    { data: tutorProfile },
  ] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, student_id, subject, title, scheduled_start_time, scheduled_end_time, actual_start_time, actual_end_time, duration_minutes, status, price, currency, session_notes, cancellation_reason, created_at')
      .eq('tutor_id', tutorId)
      .order('scheduled_start_time', { ascending: true })
      .limit(100),

    supabase
      .from('payments')
      .select('id, amount, currency, platform_fee, tutor_payout, status, payment_gateway, paid_at, released_at, session_id')
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('tutor_profiles')
      .select('rating, total_students')
      .eq('user_id', tutorId)
      .single(),
  ]);

  // Collect student IDs and review data in parallel
  const studentIds = [...new Set((allSessions ?? []).map((s) => s.student_id))];

  const [{ data: profileRows }, { data: reviewRows }] = await Promise.all([
    studentIds.length > 0
      ? supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', studentIds)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('reviews').select('session_id').eq('reviewee_id', tutorId),
  ]);

  const profileMap = new Map((profileRows ?? []).map((p) => [p.user_id, p]));
  const reviewedIds = new Set((reviewRows ?? []).map((r) => r.session_id));

  const toRow = (s: any): TutorSessionRow => ({
    ...s,
    studentProfile: profileMap.get(s.student_id) ?? null,
    hasReview: reviewedIds.has(s.id),
  });

  const sessions = (allSessions ?? []).map(toRow);

  // Derived slices
  const pendingRequests = sessions.filter((s) => s.status === 'pending');

  const todaySessions = sessions.filter(
    (s) =>
      s.scheduled_start_time >= todayStart &&
      s.scheduled_start_time < todayEnd &&
      !['cancelled', 'no_show'].includes(s.status)
  );

  // Upcoming sessions grouped by date (next 7 days, excluding today)
  const tomorrow = new Date(todayEnd);
  const weekEnd  = new Date(tomorrow.getTime() + 6 * 86_400_000).toISOString();

  const upcoming = sessions.filter(
    (s) =>
      s.scheduled_start_time >= todayEnd &&
      s.scheduled_start_time <= weekEnd &&
      ['pending', 'confirmed'].includes(s.status)
  );

  // Group by date string "YYYY-MM-DD"
  const byDay = new Map<string, TutorSessionRow[]>();
  for (const s of upcoming) {
    const key = s.scheduled_start_time.slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(s);
  }
  const upcomingByDay = Array.from(byDay.entries()).map(([date, s]) => ({ date, sessions: s }));

  // Earnings
  const released = (payments ?? []).filter((p) => p.status === 'released');
  const totalEarnings = released.reduce((sum, p) => sum + (p.tutor_payout ?? 0), 0);
  const monthEarnings = released
    .filter((p) => p.released_at && p.released_at >= monthStart)
    .reduce((sum, p) => sum + (p.tutor_payout ?? 0), 0);

  const completedTotal = sessions.filter((s) => s.status === 'completed').length;

  const stats: TutorStats = {
    pendingRequestsCount: pendingRequests.length,
    upcomingCount: upcoming.length,
    completedTotal,
    monthEarnings,
    totalEarnings,
    averageRating: tutorProfile?.rating ?? 0,
    totalStudents: tutorProfile?.total_students ?? 0,
  };

  return { stats, todaySessions, pendingRequests, upcomingByDay };
}

// ─── Tutor sessions (for /tutor/sessions page) ────────────────────────────────

export async function getTutorSessions(status?: string): Promise<TutorSessionRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  let q = supabase
    .from('sessions')
    .select('id, student_id, subject, title, scheduled_start_time, scheduled_end_time, actual_start_time, actual_end_time, duration_minutes, status, price, currency, session_notes, cancellation_reason, created_at')
    .eq('tutor_id', user.id)
    .order('scheduled_start_time', { ascending: false })
    .limit(60);

  if (status && status !== 'all') q = q.eq('status', status);

  const { data: sessions } = await q;
  if (!sessions?.length) return [];

  const studentIds = [...new Set(sessions.map((s) => s.student_id))];
  const [{ data: profileRows }, { data: reviewRows }] = await Promise.all([
    supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', studentIds),
    supabase.from('reviews').select('session_id').eq('reviewee_id', user.id),
  ]);

  const profileMap = new Map((profileRows ?? []).map((p) => [p.user_id, p]));
  const reviewedIds = new Set((reviewRows ?? []).map((r) => r.session_id));

  return sessions.map((s) => ({
    ...s,
    studentProfile: profileMap.get(s.student_id) ?? null,
    hasReview: reviewedIds.has(s.id),
  }));
}

// ─── Earnings list ────────────────────────────────────────────────────────────

export async function getTutorEarnings(): Promise<EarningsRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data } = await supabase
    .from('payments')
    .select('id, amount, currency, platform_fee, tutor_payout, status, payment_gateway, paid_at, released_at, session_id')
    .eq('tutor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(60);

  if (!data?.length) return [];

  const sessionIds = data.map((p) => p.session_id).filter(Boolean);
  const { data: sessionRows } = await supabase
    .from('sessions')
    .select('id, subject, scheduled_start_time')
    .in('id', sessionIds);

  const sessionMap = new Map((sessionRows ?? []).map((s) => [s.id, s]));

  return data.map((p) => ({
    ...p,
    session: sessionMap.get(p.session_id) ?? null,
  }));
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function acceptBookingAction(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Verify this tutor owns the session
  const { data: session } = await supabase
    .from('sessions')
    .select('status, tutor_id, student_id, subject, scheduled_start_time')
    .eq('id', sessionId)
    .single();

  if (!session || session.tutor_id !== user.id)
    return { success: false, error: 'Session not found' };

  if (session.status !== 'pending')
    return { success: false, error: 'Only pending sessions can be confirmed' };

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'confirmed' })
    .eq('id', sessionId);

  if (error) return { success: false, error: error.message };

  // Notify student
  await supabase.from('notifications').insert({
    user_id: session.student_id,
    type: 'booking_confirmed',
    title: 'Session Confirmed!',
    message: `Your ${session.subject} session on ${new Date(session.scheduled_start_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} has been confirmed.`,
    session_id: sessionId,
    action_url: '/student/sessions',
    action_label: 'View Sessions',
  });

  return { success: true };
}

export async function declineBookingAction(
  sessionId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: session } = await supabase
    .from('sessions')
    .select('status, tutor_id, student_id, subject')
    .eq('id', sessionId)
    .single();

  if (!session || session.tutor_id !== user.id)
    return { success: false, error: 'Session not found' };

  if (session.status !== 'pending')
    return { success: false, error: 'Only pending sessions can be declined' };

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'cancelled',
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason ?? 'Declined by tutor',
    })
    .eq('id', sessionId);

  if (error) return { success: false, error: error.message };

  await supabase.from('notifications').insert({
    user_id: session.student_id,
    type: 'booking_declined',
    title: 'Booking Request Declined',
    message: `Your ${session.subject} session request was declined.${reason ? ` Reason: ${reason}` : ''}`,
    session_id: sessionId,
  });

  return { success: true };
}

export async function completeSessionAction(
  sessionId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: session } = await supabase
    .from('sessions')
    .select('status, tutor_id, student_id, subject')
    .eq('id', sessionId)
    .single();

  if (!session || session.tutor_id !== user.id)
    return { success: false, error: 'Session not found' };

  if (!['confirmed', 'in_progress'].includes(session.status))
    return { success: false, error: 'Session cannot be marked complete at this stage' };

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      completed_by_tutor: true,
      completion_confirmed_at: now,
      actual_end_time: now,
      ...(notes ? { session_notes: notes } : {}),
    })
    .eq('id', sessionId);

  if (error) return { success: false, error: error.message };

  // Update tutor's completed_sessions counter
  await supabase.rpc('increment_tutor_completed_sessions', { tutor_user_id: user.id }).match(() => {
    // RPC may not exist yet — safe to ignore, can be added as a DB function
  });

  // Prompt student to leave a review
  await supabase.from('notifications').insert({
    user_id: session.student_id,
    type: 'session_completed',
    title: 'Session Completed',
    message: `Your ${session.subject} session is complete. How was it?`,
    session_id: sessionId,
    action_url: '/student/sessions',
    action_label: 'Leave a Review',
  });

  return { success: true };
}

// ─── Availability ─────────────────────────────────────────────────────────────

export interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  is_available: boolean;
}

export async function getTutorAvailability(): Promise<AvailabilitySlot[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('availability')
    .select('id, day_of_week, start_time, end_time, is_recurring, is_available')
    .eq('tutor_id', user.id)
    .order('day_of_week');

  return data ?? [];
}

export async function upsertAvailabilityAction(
  slots: Omit<AvailabilitySlot, 'id'>[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Delete existing recurring availability and re-insert
  await supabase
    .from('availability')
    .delete()
    .eq('tutor_id', user.id)
    .eq('is_recurring', true);

  if (!slots.length) return { success: true };

  const { error } = await supabase.from('availability').insert(
    slots.map((s) => ({ ...s, tutor_id: user.id }))
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}