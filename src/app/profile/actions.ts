'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BaseProfileData {
  userId: string;
  email: string;
  role: 'student' | 'tutor' | 'admin';
  fullName: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  bio: string | null;
  timezone: string;
  language: string;
  createdAt: string;
}

export interface StudentProfileData extends BaseProfileData {
  role: 'student';
  educationLevel: string | null;
  interests: string[];
  learningGoals: string | null;
  preferredLearningStyle: string | null;
  totalSessions: number;
  completedSessions: number;
  totalSpent: number;
}

export interface TutorProfileData extends BaseProfileData {
  role: 'tutor';
  subjects: string[];
  hourlyRate: number;
  currency: string;
  experienceYears: number;
  languages: string[];
  educationBackground: string | null;
  teachingStyle: string | null;
  verificationStatus: string;
  verificationDocuments: string[];
  rejectionReason: string | null;
  verified: boolean;
  rating: number;
  totalSessions: number;
  completedSessions: number;
  totalStudents: number;
  acceptsGroupSessions: boolean;
}

export interface AdminProfileData extends BaseProfileData {
  role: 'admin';
}

export type ProfileData = StudentProfileData | TutorProfileData | AdminProfileData;

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function getProfileData(): Promise<ProfileData> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const role = profile?.role ?? user.user_metadata?.role ?? 'student';

  const base: BaseProfileData = {
    userId:      user.id,
    email:       user.email ?? '',
    role,
    fullName:    profile?.full_name ?? '',
    avatarUrl:   profile?.avatar_url ?? null,
    phoneNumber: profile?.phone_number ?? null,
    bio:         profile?.bio ?? null,
    timezone:    profile?.timezone ?? 'Africa/Blantyre',
    language:    profile?.language ?? 'en',
    createdAt:   profile?.created_at ?? user.created_at,
  };

  if (role === 'student') {
    const { data: sp } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return {
      ...base,
      role: 'student',
      educationLevel:         sp?.education_level ?? null,
      interests:              sp?.interests ?? [],
      learningGoals:          sp?.learning_goals ?? null,
      preferredLearningStyle: sp?.preferred_learning_style ?? null,
      totalSessions:          sp?.total_sessions ?? 0,
      completedSessions:      sp?.completed_sessions ?? 0,
      totalSpent:             sp?.total_spent ?? 0,
    };
  }

  if (role === 'tutor') {
    const { data: tp } = await supabase
      .from('tutor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return {
      ...base,
      role: 'tutor',
      subjects:              tp?.subjects ?? [],
      hourlyRate:            tp?.hourly_rate ?? 0,
      currency:              tp?.currency ?? 'MWK',
      experienceYears:       tp?.experience_years ?? 0,
      languages:             tp?.languages ?? ['English'],
      educationBackground:   tp?.education_background ?? null,
      teachingStyle:         tp?.teaching_style ?? null,
      verificationStatus:    tp?.verification_status ?? 'not_submitted',
      verificationDocuments: tp?.verification_documents ?? [],
      rejectionReason:       tp?.rejection_reason ?? null,
      verified:              tp?.verified ?? false,
      rating:                tp?.rating ?? 0,
      totalSessions:         tp?.total_sessions ?? 0,
      completedSessions:     tp?.completed_sessions ?? 0,
      totalStudents:         tp?.total_students ?? 0,
      acceptsGroupSessions:  tp?.accepts_group_sessions ?? false,
    };
  }

  return { ...base, role: 'admin' };
}

// ─── Base profile update ──────────────────────────────────────────────────────

export async function updateBaseProfile(payload: {
  fullName: string; phoneNumber: string; bio: string; timezone: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name:    payload.fullName.trim(),
      phone_number: payload.phoneNumber.trim() || null,
      bio:          payload.bio.trim() || null,
      timezone:     payload.timezone,
      updated_at:   new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Student profile update ───────────────────────────────────────────────────

export async function updateStudentProfile(payload: {
  educationLevel: string; interests: string[];
  learningGoals: string; preferredLearningStyle: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('student_profiles')
    .upsert({
      user_id:                  user.id,
      education_level:          payload.educationLevel || null,
      interests:                payload.interests,
      learning_goals:           payload.learningGoals.trim() || null,
      preferred_learning_style: payload.preferredLearningStyle || null,
      updated_at:               new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Tutor profile update (non-verification fields) ──────────────────────────

export async function updateTutorProfile(payload: {
  subjects: string[]; hourlyRate: number; experienceYears: number;
  languages: string[]; educationBackground: string;
  teachingStyle: string; acceptsGroupSessions: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('tutor_profiles')
    .update({
      subjects:               payload.subjects,
      hourly_rate:            payload.hourlyRate,
      experience_years:       payload.experienceYears,
      languages:              payload.languages,
      education_background:   payload.educationBackground.trim() || null,
      teaching_style:         payload.teachingStyle.trim() || null,
      accepts_group_sessions: payload.acceptsGroupSessions,
      updated_at:             new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Tutor verification data save ────────────────────────────────────────────
// Called after the client has already uploaded documents to Storage.
// Only receives plain serializable data — no File objects.
// File upload happens client-side in ProfileClient to avoid Next.js
// server action File serialization limitations.

export interface SaveVerificationPayload {
  subjects:            string[];
  hourlyRate:          number;
  experienceYears:     number;
  educationBackground: string;
  bio:                 string;
  teachingStyle:       string;
  uploadedPaths:       string[]; // storage paths already uploaded by the client
}

export async function saveVerificationDataAction(
  payload: SaveVerificationPayload
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { subjects, hourlyRate, experienceYears, educationBackground,
          bio, teachingStyle, uploadedPaths } = payload;

  // Validate
  if (!subjects.length)           return { success: false, error: 'Add at least one subject' };
  if (!hourlyRate || hourlyRate <= 0) return { success: false, error: 'Enter a valid hourly rate' };
  if (!educationBackground.trim()) return { success: false, error: 'Education background is required' };
  if (!uploadedPaths.length)      return { success: false, error: 'No documents were uploaded' };

  // Save bio to profiles (bio is not a column on tutor_profiles)
  if (bio.trim()) {
    await supabase
      .from('profiles')
      .update({ bio: bio.trim() })
      .eq('user_id', user.id);
  }

  // Upsert tutor_profiles with all info and set status to pending_review
  const { error: profileError } = await supabase
    .from('tutor_profiles')
    .upsert({
      user_id:                user.id,
      subjects,
      hourly_rate:            hourlyRate,
      currency:               'MWK',
      experience_years:       experienceYears,
      education_background:   educationBackground.trim(),
      teaching_style:         teachingStyle.trim() || null,
      verification_documents: uploadedPaths,
      verification_status:    'pending_review',
      verified:               false,
      rejection_reason:       null,
      reviewed_by:            null,
      reviewed_at:            null,
    }, { onConflict: 'user_id' });

  if (profileError) {
    if (profileError.code === '42501' || profileError.message.includes('policy'))
      return { success: false, error: 'Database permission denied. Add RLS insert/update policy for tutor_profiles.' };
    return { success: false, error: profileError.message };
  }

  return { success: true };
}

// ─── Avatar upload ────────────────────────────────────────────────────────────

export async function uploadAvatarAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const file = formData.get('avatar') as File | null;
  if (!file) return { success: false, error: 'No file provided' };
  if (file.size > 2 * 1024 * 1024)
    return { success: false, error: 'Image must be under 2MB' };

  const ext  = file.name.split('.').pop() ?? 'jpg';
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });

  if (uploadError) return { success: false, error: uploadError.message };

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);

  const urlWithBust = `${publicUrl}?t=${Date.now()}`;

  await supabase
    .from('profiles')
    .update({ avatar_url: urlWithBust })
    .eq('user_id', user.id);

  return { success: true, url: urlWithBust };
}