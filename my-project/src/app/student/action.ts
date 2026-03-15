'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { StudentProfile } from '@/lib/types';

// ─── Exported types ───────────────────────────────────────────────────────────

export interface DashboardStats {
  upcomingCount: number;
  completedCount: number;
  totalSpent: number;
  favoriteTutorsCount: number;
}

export interface SessionWithTutor {
  id: string;
  tutor_id: string;
  student_id: string;
  subject: string;
  title: string | null;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_end_time: string | null;
  duration_minutes: number | null;
  status: string;
  price: number;
  currency: string;
  cancellation_reason: string | null;
  created_at: string;
  tutorProfile: { full_name: string; avatar_url: string | null } | null;
  hasReview: boolean;
}

export interface TutorCard {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  subjects: string[];
  hourlyRate: number;
  currency: string;
  rating: number;
  totalSessions: number;
  experienceYears: number;
  verified: boolean;
  bio: string | null;
  teachingStyle: string | null;
  languages: string[];
}

export interface StudentDashboardData {
  studentProfile: StudentProfile | null;
  stats: DashboardStats;
  upcomingSessions: SessionWithTutor[];
  sessionsNeedingReview: SessionWithTutor[];
  suggestedTutors: TutorCard[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maps flat tutor_profiles + profiles rows into TutorCard */
function toTutorCard(
  tp: Record<string, any>,
  profileMap: Map<string, { full_name: string; avatar_url: string | null }>
): TutorCard {
  const p = profileMap.get(tp.user_id);
  return {
    userId: tp.user_id,
    fullName: p?.full_name ?? 'Unknown Tutor',
    avatarUrl: p?.avatar_url ?? null,
    subjects: tp.subjects ?? [],
    hourlyRate: tp.hourly_rate ?? 0,
    currency: tp.currency ?? 'MWK',
    rating: tp.rating ?? 0,
    totalSessions: tp.total_sessions ?? 0,
    experienceYears: tp.experience_years ?? 0,
    verified: tp.verified ?? false,
    bio: null, // bio lives on profiles table, not tutor_profiles
    teachingStyle: tp.teaching_style ?? null,
    languages: tp.languages ?? ['English'],
  };
}

// ─── Dashboard data loader ────────────────────────────────────────────────────

export async function getStudentDashboardData(): Promise<StudentDashboardData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect('/');

  const userId = user.id;

  // Fetch all data in parallel — single round-trip cost
  const [
    { data: studentProfile },
    { data: allSessions },
    { data: tutorProfileRows },
  ] = await Promise.all([
    supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('sessions')
      .select(
        'id, tutor_id, student_id, subject, title, scheduled_start_time, scheduled_end_time, actual_end_time, duration_minutes, status, price, currency, cancellation_reason, created_at'
      )
      .eq('student_id', userId)
      .order('scheduled_start_time', { ascending: false })
      .limit(60),

    // Only return verified + approved tutors, ordered by rating
    supabase
      .from('tutor_profiles')
      .select(
        'user_id, subjects, hourly_rate, currency, rating, total_sessions, experience_years, verified, teaching_style, languages'
      )
      .eq('verified', true)
      .eq('verification_status', 'approved')
      .order('rating', { ascending: false })
      .limit(9),
  ]);

  // Collect all tutor IDs we need profiles for (sessions + suggested)
  const sessionTutorIds = [...new Set((allSessions ?? []).map((s) => s.tutor_id))];
  const suggestedTutorIds = (tutorProfileRows ?? []).map((t) => t.user_id);
  const allTutorIds = [...new Set([...sessionTutorIds, ...suggestedTutorIds])];

  // Fetch profiles + reviews in parallel
  const [{ data: profileRows }, { data: reviewRows }] = await Promise.all([
    allTutorIds.length > 0
      ? supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', allTutorIds)
      : Promise.resolve({ data: [] as any[] }),

    // Which of this student's sessions already have a review?
    supabase
      .from('reviews')
      .select('session_id')
      .eq('reviewer_id', userId),
  ]);

  const profileMap = new Map(
    (profileRows ?? []).map((p) => [p.user_id, p])
  );
  const reviewedIds = new Set((reviewRows ?? []).map((r) => r.session_id));
  const now = new Date().toISOString();

  // ── Derive slices from allSessions ─────────────────────────────────────────

  const withTutor = (s: any): SessionWithTutor => ({
    ...s,
    tutorProfile: profileMap.get(s.tutor_id) ?? null,
    hasReview: reviewedIds.has(s.id),
  });

  const upcomingSessions = (allSessions ?? [])
    .filter(
      (s) =>
        ['pending', 'confirmed'].includes(s.status) &&
        s.scheduled_start_time > now
    )
    .slice(0, 5)
    .map(withTutor);

  const sessionsNeedingReview = (allSessions ?? [])
    .filter((s) => s.status === 'completed' && !reviewedIds.has(s.id))
    .slice(0, 3)
    .map(withTutor);

  const completedCount = (allSessions ?? []).filter(
    (s) => s.status === 'completed'
  ).length;

  const stats: DashboardStats = {
    upcomingCount: upcomingSessions.length,
    completedCount,
    totalSpent: studentProfile?.total_spent ?? 0,
    favoriteTutorsCount: (studentProfile?.favorite_tutors ?? []).length,
  };

  const suggestedTutors: TutorCard[] = (tutorProfileRows ?? []).map((tp) =>
    toTutorCard(tp, profileMap)
  );

  return {
    studentProfile: studentProfile ?? null,
    stats,
    upcomingSessions,
    sessionsNeedingReview,
    suggestedTutors,
  };
}

// ─── Tutors search ────────────────────────────────────────────────────────────

export interface TutorSearchParams {
  query?: string;   // fuzzy-matches full_name and subjects
  subject?: string;
  maxRate?: number;
  page?: number;
}

// ─── All subjects from approved tutors ────────────────────────────────────────

export async function getAllSubjects(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('tutor_profiles')
    .select('subjects')
    .eq('verified', true)
    .eq('verification_status', 'approved');

  if (!data?.length) return [];

  const all    = data.flatMap((row) => row.subjects ?? []);
  const unique = [...new Set(all)].sort((a, b) => a.localeCompare(b));
  return unique;
}
export async function searchTutors(
  params: TutorSearchParams = {}
): Promise<{ tutors: TutorCard[]; total: number }> {
  const supabase = await createClient();

  const { query, subject, maxRate, page = 0 } = params;
  const PAGE_SIZE = 12;
  const trimmed   = query?.trim() ?? '';

  // ── Step 1: if there is a name query, find matching profile IDs first ────────
  // This fixes the pagination bug where name search only looked within the
  // current page of tutor_profiles instead of across all tutors.
  let nameMatchedIds: string[] | null = null;

  if (trimmed) {
    // Primary: fuzzy match using pg_trgm similarity (requires pg_trgm extension)
    // Falls back to ilike if trigram isn't available
    const { data: nameMatches } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('full_name', `%${trimmed}%`)
      .eq('role', 'tutor');

    nameMatchedIds = (nameMatches ?? []).map((p) => p.user_id);

    // If no exact substring match, try individual words (fuzzy fallback)
    if (nameMatchedIds.length === 0) {
      const words = trimmed.split(/\s+/).filter((w) => w.length > 1);
      const wordResults = await Promise.all(
        words.map((word) =>
          supabase
            .from('profiles')
            .select('user_id')
            .ilike('full_name', `%${word}%`)
            .eq('role', 'tutor')
        )
      );
      const allIds = wordResults.flatMap((r) => (r.data ?? []).map((p) => p.user_id));
      nameMatchedIds = [...new Set(allIds)];
    }

    // Also search subjects — add any tutors whose subjects match the query
    const { data: subjectMatches } = await supabase
      .from('tutor_profiles')
      .select('user_id')
      .eq('verified', true)
      .eq('verification_status', 'approved')
      .ilike('subjects::text', `%${trimmed}%`);

    const subjectIds = (subjectMatches ?? []).map((t) => t.user_id);
    nameMatchedIds = [...new Set([...nameMatchedIds, ...subjectIds])];

    // No matches at all → return empty early
    if (nameMatchedIds.length === 0) return { tutors: [], total: 0 };
  }

  // ── Step 2: query tutor_profiles with all filters + optional ID constraint ──
  let q = supabase
    .from('tutor_profiles')
    .select(
      'user_id, subjects, hourly_rate, currency, rating, total_sessions, experience_years, verified, teaching_style, languages',
      { count: 'exact' }
    )
    .eq('verified', true)
    .eq('verification_status', 'approved')
    .order('rating', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (subject)       q = q.contains('subjects', [subject]);
  if (maxRate)       q = q.lte('hourly_rate', maxRate);
  if (nameMatchedIds) q = q.in('user_id', nameMatchedIds);

  const { data: tutorProfileRows, count, error: tpError } = await q;
  if (tpError) console.error('[searchTutors] query error:', tpError.message);

  if (!tutorProfileRows?.length) return { tutors: [], total: 0 };

  // ── Step 3: fetch display profiles ──────────────────────────────────────────
  const userIds = tutorProfileRows.map((t) => t.user_id);

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url')
    .in('user_id', userIds);

  const profileMap = new Map((profileRows ?? []).map((p) => [p.user_id, p]));

  return {
    tutors: tutorProfileRows.map((tp) => toTutorCard(tp as any, profileMap)),
    total:  count ?? 0,
  };
}

// ─── Sessions list ────────────────────────────────────────────────────────────

export async function getStudentSessions(
  status?: string
): Promise<SessionWithTutor[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  let q = supabase
    .from('sessions')
    .select(
      'id, tutor_id, student_id, subject, title, scheduled_start_time, scheduled_end_time, actual_end_time, duration_minutes, status, price, currency, cancellation_reason, created_at'
    )
    .eq('student_id', user.id)
    .order('scheduled_start_time', { ascending: false });

  if (status && status !== 'all') q = q.eq('status', status);

  const { data: sessions } = await q.limit(50);

  if (!sessions?.length) return [];

  const tutorIds = [...new Set(sessions.map((s) => s.tutor_id))];

  const [{ data: profileRows }, { data: reviewRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', tutorIds),
    supabase
      .from('reviews')
      .select('session_id')
      .eq('reviewer_id', user.id),
  ]);

  const profileMap = new Map((profileRows ?? []).map((p) => [p.user_id, p]));
  const reviewedIds = new Set((reviewRows ?? []).map((r) => r.session_id));

  return sessions.map((s) => ({
    ...s,
    tutorProfile: profileMap.get(s.tutor_id) ?? null,
    hasReview: reviewedIds.has(s.id),
  }));
}

// ─── Cancel session ───────────────────────────────────────────────────────────

export async function cancelSessionAction(
  sessionId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Verify ownership before touching anything
  const { data: session } = await supabase
    .from('sessions')
    .select('status, student_id, tutor_id, subject, scheduled_start_time')
    .eq('id', sessionId)
    .single();

  if (!session || session.student_id !== user.id)
    return { success: false, error: 'Session not found' };

  if (!['pending', 'confirmed'].includes(session.status))
    return { success: false, error: 'Session cannot be cancelled at this stage' };

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'cancelled',
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason ?? null,
    })
    .eq('id', sessionId);

  if (error) return { success: false, error: error.message };

  // Notify tutor
  await supabase.from('notifications').insert({
    user_id: session.tutor_id,
    type: 'session_cancelled',
    title: 'Session Cancelled',
    message: `The ${session.subject} session on ${new Date(
      session.scheduled_start_time
    ).toLocaleDateString()} has been cancelled by the student.`,
    session_id: sessionId,
  });

  return { success: true };
}