'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/');
  return { supabase, adminId: user.id };
}

// ─── Exported types ───────────────────────────────────────────────────────────

export interface AdminOverviewStats {
  totalRevenue: number;
  totalStudents: number;
  totalTutors: number;
  verifiedTutors: number;
  activeSessions: number;
  totalSessions: number;
  pendingVerifications: number;
  flaggedReviews: number;
  platformRating: number;
  reviewCount: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  sessions: number;
}

export interface SubjectDataPoint {
  name: string;
  value: number;
  color: string;
}

export interface UserGrowthPoint {
  month: string;
  students: number;
  tutors: number;
}

export interface PendingTutorRow {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  subjects: string[];
  docsCount: number;
  submittedAt: string;
  educationBackground: string | null;
  experienceYears: number;
  verificationDocuments: string[];
  rejectionReason: string | null;
}

export interface RecentUserRow {
  userId: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface FlaggedReviewRow {
  id: string;
  comment: string | null;
  rating: number;
  flagReason: string | null;
  createdAt: string;
  reviewer: { fullName: string; avatarUrl: string | null } | null;
  reviewee: { fullName: string; avatarUrl: string | null } | null;
  sessionSubject: string | null;
}

export interface AdminDashboardData {
  stats: AdminOverviewStats;
  revenueData: RevenueDataPoint[];
  subjectData: SubjectDataPoint[];
  userGrowthData: UserGrowthPoint[];
  pendingTutors: PendingTutorRow[];
  recentUsers: RecentUserRow[];
  flaggedReviews: FlaggedReviewRow[];
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

const SUBJECT_COLORS = [
  '#10b981', '#14b8a6', '#06b6d4', '#6ee7b7', '#a7f3d0',
  '#0ea5e9', '#22d3ee', '#34d399', '#4ade80',
];

function getLast6MonthKeys(): { key: string; label: string }[] {
  const result: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short' }),
    });
  }
  return result;
}

// ─── Main dashboard loader ────────────────────────────────────────────────────

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const { supabase } = await requireAdmin();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoISO = sixMonthsAgo.toISOString();

  // ── Parallel data fetch ────────────────────────────────────────────────────
  const [
    { count: totalStudents },
    { count: totalTutors },
    { count: verifiedTutors },
    { count: totalSessions },
    { count: activeSessions },
    { count: pendingVerifications },
    { count: flaggedReviews },
    { data: recentPayments },
    { data: recentSessions },
    { data: allSessions6mo },
    { data: recentProfiles },
    { data: pendingTutorProfiles },
    { data: flaggedReviewRows },
    { data: reviewStats },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'tutor'),
    supabase.from('tutor_profiles').select('*', { count: 'exact', head: true }).eq('verified', true),
    supabase.from('sessions').select('*', { count: 'exact', head: true }),
    supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('tutor_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending_review'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_flagged', true),

    // Revenue from released payments (last 6 months)
    supabase.from('payments')
      .select('amount, platform_fee, tutor_payout, released_at, created_at')
      .eq('status', 'released')
      .gte('released_at', sixMonthsAgoISO),

    // Sessions last 6 months for chart
    supabase.from('sessions')
      .select('created_at, subject, status')
      .gte('created_at', sixMonthsAgoISO)
      .neq('status', 'cancelled'),

    // All sessions last 6 months for subject breakdown
    supabase.from('sessions')
      .select('subject')
      .gte('created_at', sixMonthsAgoISO)
      .neq('status', 'cancelled')
      .limit(500),

    // Recent users (last 10)
    supabase.from('profiles')
      .select('user_id, full_name, role, avatar_url, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(10),

    // Pending tutor verifications
    supabase.from('tutor_profiles')
      .select('user_id, subjects, education_background, experience_years, verification_documents, created_at, rejection_reason')
      .eq('verification_status', 'pending_review')
      .order('created_at', { ascending: true })
      .limit(10),

    // Flagged reviews
    supabase.from('reviews')
      .select('id, comment, rating, flag_reason, created_at, reviewer_id, reviewee_id, session_id')
      .eq('is_flagged', true)
      .order('created_at', { ascending: false })
      .limit(10),

    // Platform rating stats
    supabase.from('reviews')
      .select('rating')
      .eq('is_public', true)
      .limit(1000),
  ]);

  // ── Build revenue + sessions chart (grouped by month) ─────────────────────
  const monthKeys = getLast6MonthKeys();
  const revenueByMonth = new Map<string, number>();
  const sessionsByMonth = new Map<string, number>();

  for (const mk of monthKeys) {
    revenueByMonth.set(mk.key, 0);
    sessionsByMonth.set(mk.key, 0);
  }

  for (const p of recentPayments ?? []) {
    const key = (p.released_at ?? p.created_at).slice(0, 7);
    if (revenueByMonth.has(key)) {
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + (p.amount ?? 0));
    }
  }

  for (const s of recentSessions ?? []) {
    const key = s.created_at.slice(0, 7);
    if (sessionsByMonth.has(key)) {
      sessionsByMonth.set(key, (sessionsByMonth.get(key) ?? 0) + 1);
    }
  }

  const revenueData: RevenueDataPoint[] = monthKeys.map(({ key, label }) => ({
    month: label,
    revenue: revenueByMonth.get(key) ?? 0,
    sessions: sessionsByMonth.get(key) ?? 0,
  }));

  // ── Subject distribution ───────────────────────────────────────────────────
  const subjectCount = new Map<string, number>();
  for (const s of allSessions6mo ?? []) {
    if (!s.subject) continue;
    subjectCount.set(s.subject, (subjectCount.get(s.subject) ?? 0) + 1);
  }

  const subjectData: SubjectDataPoint[] = Array.from(subjectCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value], i) => ({
      name,
      value,
      color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
    }));

  // ── User growth (same 6-month buckets, from profile created_at) ───────────
  // We don't have a separate query for this — use recentProfiles as an approximation.
  // For accurate monthly growth you'd need a separate query; this is the practical approach.
  const studentGrowthByMonth = new Map<string, number>();
  const tutorGrowthByMonth = new Map<string, number>();
  for (const mk of monthKeys) {
    studentGrowthByMonth.set(mk.key, 0);
    tutorGrowthByMonth.set(mk.key, 0);
  }

  // Fetch all profiles created in last 6 months for accurate growth chart
  const { data: growthProfiles } = await supabase
    .from('profiles')
    .select('role, created_at')
    .gte('created_at', sixMonthsAgoISO)
    .in('role', ['student', 'tutor']);

  for (const p of growthProfiles ?? []) {
    const key = p.created_at.slice(0, 7);
    if (p.role === 'student' && studentGrowthByMonth.has(key)) {
      studentGrowthByMonth.set(key, (studentGrowthByMonth.get(key) ?? 0) + 1);
    } else if (p.role === 'tutor' && tutorGrowthByMonth.has(key)) {
      tutorGrowthByMonth.set(key, (tutorGrowthByMonth.get(key) ?? 0) + 1);
    }
  }

  const userGrowthData: UserGrowthPoint[] = monthKeys.map(({ key, label }) => ({
    month: label,
    students: studentGrowthByMonth.get(key) ?? 0,
    tutors: tutorGrowthByMonth.get(key) ?? 0,
  }));

  // ── Pending tutor profiles — fetch matching auth profiles ─────────────────
  const pendingUserIds = (pendingTutorProfiles ?? []).map((t) => t.user_id);
  let pendingProfileMap = new Map<string, { full_name: string; avatar_url: string | null; email?: string }>();

  if (pendingUserIds.length > 0) {
    const { data: pp } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', pendingUserIds);
    for (const p of pp ?? []) pendingProfileMap.set(p.user_id, p);
  }

  const pendingTutors: PendingTutorRow[] = (pendingTutorProfiles ?? []).map((t) => {
    const p = pendingProfileMap.get(t.user_id);
    return {
      userId: t.user_id,
      fullName: p?.full_name ?? 'Unknown',
      email: '',           // requires service role to read auth.users — omit for now
      avatarUrl: p?.avatar_url ?? null,
      subjects: t.subjects ?? [],
      docsCount: (t.verification_documents ?? []).length,
      submittedAt: t.created_at,
      educationBackground: t.education_background ?? null,
      experienceYears: t.experience_years ?? 0,
      verificationDocuments: t.verification_documents ?? [],
      rejectionReason: t.rejection_reason ?? null,
    };
  });

  // ── Recent users ──────────────────────────────────────────────────────────
  const recentUsers: RecentUserRow[] = (recentProfiles ?? []).map((p) => ({
    userId: p.user_id,
    fullName: p.full_name ?? 'Unknown',
    role: p.role,
    avatarUrl: p.avatar_url ?? null,
    isActive: p.is_active ?? true,
    createdAt: p.created_at,
  }));

  // ── Flagged reviews — hydrate reviewer/reviewee names ─────────────────────
  const reviewUserIds = [
    ...new Set([
      ...(flaggedReviewRows ?? []).map((r) => r.reviewer_id),
      ...(flaggedReviewRows ?? []).map((r) => r.reviewee_id),
    ]),
  ].filter(Boolean);

  const reviewSessionIds = (flaggedReviewRows ?? []).map((r) => r.session_id).filter(Boolean);
  const [{ data: reviewProfiles }, { data: reviewSessions }] = await Promise.all([
    reviewUserIds.length > 0
      ? supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', reviewUserIds)
      : Promise.resolve({ data: [] as any[] }),
    reviewSessionIds.length > 0
      ? supabase.from('sessions').select('id, subject').in('id', reviewSessionIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const reviewProfileMap = new Map((reviewProfiles ?? []).map((p) => [p.user_id, p]));
  const reviewSessionMap = new Map((reviewSessions ?? []).map((s) => [s.id, s]));

  const flaggedReviewsOut: FlaggedReviewRow[] = (flaggedReviewRows ?? []).map((r) => {
    const reviewer = reviewProfileMap.get(r.reviewer_id);
    const reviewee = reviewProfileMap.get(r.reviewee_id);
    const session  = reviewSessionMap.get(r.session_id);
    return {
      id: r.id,
      comment: r.comment ?? null,
      rating: r.rating,
      flagReason: r.flag_reason ?? null,
      createdAt: r.created_at,
      reviewer: reviewer ? { fullName: reviewer.full_name, avatarUrl: reviewer.avatar_url } : null,
      reviewee: reviewee ? { fullName: reviewee.full_name, avatarUrl: reviewee.avatar_url } : null,
      sessionSubject: session?.subject ?? null,
    };
  });

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalRevenue = (recentPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const ratings = (reviewStats ?? []).map((r) => r.rating).filter((r) => r > 0);
  const platformRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;

  const stats: AdminOverviewStats = {
    totalRevenue,
    totalStudents: totalStudents ?? 0,
    totalTutors: totalTutors ?? 0,
    verifiedTutors: verifiedTutors ?? 0,
    activeSessions: activeSessions ?? 0,
    totalSessions: totalSessions ?? 0,
    pendingVerifications: pendingVerifications ?? 0,
    flaggedReviews: flaggedReviews ?? 0,
    platformRating,
    reviewCount: ratings.length,
  };

  return {
    stats,
    revenueData,
    subjectData,
    userGrowthData,
    pendingTutors,
    recentUsers,
    flaggedReviews: flaggedReviewsOut,
  };
}

// ─── Verification mutations ───────────────────────────────────────────────────

export async function approveTutorAction(
  tutorUserId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, adminId } = await requireAdmin();

  // Uses the security-definer DB function you already have
  const { error } = await supabase.rpc('admin_set_verification', {
    p_tutor_user_id: tutorUserId,
    p_status: 'approved',
    p_rejection_reason: null,
  });

  if (error) {
    // Fallback: direct update (in case RPC args differ slightly)
    const { error: fallback } = await supabase
      .from('tutor_profiles')
      .update({
        verification_status: 'approved',
        verified: true,
        verified_at: new Date().toISOString(),
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('user_id', tutorUserId);

    if (fallback) return { success: false, error: fallback.message };
  }

  // Notify tutor
  await supabase.from('notifications').insert({
    user_id: tutorUserId,
    type: 'verification_approved',
    title: 'Profile Approved! 🎉',
    message: 'Congratulations! Your tutor profile has been verified. You can now accept bookings.',
    action_url: '/tutor',
    action_label: 'Go to Dashboard',
  });

  return { success: true };
}

export async function rejectTutorAction(
  tutorUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, adminId } = await requireAdmin();

  const { error } = await supabase.rpc('admin_set_verification', {
    p_tutor_user_id: tutorUserId,
    p_status: 'rejected',
    p_rejection_reason: reason,
  });

  if (error) {
    const { error: fallback } = await supabase
      .from('tutor_profiles')
      .update({
        verification_status: 'rejected',
        verified: false,
        rejection_reason: reason,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('user_id', tutorUserId);

    if (fallback) return { success: false, error: fallback.message };
  }

  await supabase.from('notifications').insert({
    user_id: tutorUserId,
    type: 'verification_rejected',
    title: 'Application Not Approved',
    message: `Your tutor application was not approved. Reason: ${reason}`,
    action_url: '/tutor/rejected',
    action_label: 'View Details',
  });

  return { success: true };
}

// ─── User management ──────────────────────────────────────────────────────────

export interface AdminUserRow {
  userId: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  tutorVerified?: boolean;
  tutorRating?: number;
  totalSessions?: number;
}

export async function getAdminUsers(
  role?: string,
  search?: string
): Promise<AdminUserRow[]> {
  const { supabase } = await requireAdmin();

  let q = supabase
    .from('profiles')
    .select('user_id, full_name, role, avatar_url, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(60);

  if (role && role !== 'all') q = q.eq('role', role);
  // Fuzzy: try full string first, then word by word if no match
  if (search) {
    const words = search.trim().split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 1) {
      // Single word — use ilike for broad match
      q = q.ilike('full_name', `%${words[0]}%`);
    } else {
      // Multiple words — match any word (OR logic gives best fuzzy UX)
      q = q.or(words.map((w) => `full_name.ilike.%${w}%`).join(','));
    }
  }

  const { data: profiles } = await q;
  if (!profiles?.length) return [];

  const tutorIds = profiles.filter((p) => p.role === 'tutor').map((p) => p.user_id);

  const { data: tutorProfiles } = tutorIds.length > 0
    ? await supabase
        .from('tutor_profiles')
        .select('user_id, verified, rating, total_sessions')
        .in('user_id', tutorIds)
    : { data: [] as any[] };

  const tutorMap = new Map((tutorProfiles ?? []).map((t) => [t.user_id, t]));

  return profiles.map((p) => {
    const tp = tutorMap.get(p.user_id);
    return {
      userId: p.user_id,
      fullName: p.full_name ?? 'Unknown',
      role: p.role,
      avatarUrl: p.avatar_url ?? null,
      isActive: p.is_active ?? true,
      createdAt: p.created_at,
      ...(tp ? {
        tutorVerified: tp.verified,
        tutorRating: tp.rating,
        totalSessions: tp.total_sessions,
      } : {}),
    };
  });
}

export async function toggleUserActiveAction(
  userId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('user_id', userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Flag management ──────────────────────────────────────────────────────────

export async function dismissFlagAction(
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from('reviews')
    .update({ is_flagged: false, flag_reason: null })
    .eq('id', reviewId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removeReviewAction(
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from('reviews')
    .update({ is_public: false, is_flagged: false })
    .eq('id', reviewId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}