// src/app/admin/verifications/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { VerificationsClient } from './VerificationClient';

export const metadata = { title: 'Verifications | Admin' };

export interface FullTutorRow {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  email: string;
  // Tutor profile
  subjects: string[];
  hourlyRate: number;
  currency: string;
  experienceYears: number;
  languages: string[];
  educationBackground: string | null;
  bio: string | null;
  teachingStyle: string | null;
  verificationStatus: string;
  verificationDocuments: string[];
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  docsCount: number;
  // For image/pdf detection on each doc
  docMeta: { path: string; signedUrl: string; isPdf: boolean; name: string }[];
}

export default async function VerificationsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: adminProfile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (adminProfile?.role !== 'admin') redirect('/');

  // Explicit type avoids Supabase's GenericStringError on long select strings
  type TutorProfileRow = {
    user_id: string;
    subjects: string[] | null;
    hourly_rate: number | null;
    currency: string | null;
    experience_years: number | null;
    languages: string[] | null;
    education_background: string | null;
    teaching_style: string | null;
    verification_documents: string[] | null;
    created_at: string;
    rejection_reason: string | null;
    verification_status: string;
    reviewed_at: string | null;
  };

  const { data: tutorProfiles, error: tpError } = await supabase
    .from('tutor_profiles')
    .select(
      'user_id, subjects, hourly_rate, currency, experience_years, languages, ' +
      'education_background, teaching_style, verification_documents, ' +
      'created_at, rejection_reason, verification_status, reviewed_at'
    )
    .in('verification_status', ['pending_review', 'approved', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(60) as unknown as { data: TutorProfileRow[] | null; error: any };

  if (tpError) {
    console.error('[Verifications] tutor_profiles query error:', tpError);
  }

  if (!tutorProfiles?.length) {
    return <VerificationsClient tutors={[]} />;
  }

  const userIds = tutorProfiles.map((t) => t.user_id);

  type ProfileRow = { user_id: string; full_name: string | null; avatar_url: string | null };
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url')
    .in('user_id', userIds) as unknown as { data: ProfileRow[] | null };

  const profileMap = new Map((profileRows ?? []).map((p) => [p.user_id, p]));

  // Build signed URLs and detect doc type
  const tutors: FullTutorRow[] = await Promise.all(
    tutorProfiles.map(async (t) => {
      const p    = profileMap.get(t.user_id);
      const docs = t.verification_documents ?? [];

      const docMeta = await Promise.all(
        docs.map(async (docPath: string) => {
          let signedUrl = '';
          try {
            const { data } = await supabase.storage
              .from('verification-docs')
              .createSignedUrl(docPath, 2 * 60 * 60); // 2h expiry
            signedUrl = data?.signedUrl ?? '';
          } catch { /* skip */ }

          const name  = docPath.split('/').pop() ?? 'document';
          const ext   = name.split('.').pop()?.toLowerCase() ?? '';
          const isPdf = ext === 'pdf';

          return { path: docPath, signedUrl, isPdf, name };
        })
      );

      return {
        userId:               t.user_id,
        fullName:             p?.full_name ?? 'Unknown',
        avatarUrl:            p?.avatar_url ?? null,
        email:                '',
        subjects:             t.subjects ?? [],
        hourlyRate:           t.hourly_rate ?? 0,
        currency:             t.currency ?? 'MWK',
        experienceYears:      t.experience_years ?? 0,
        languages:            t.languages ?? [],
        educationBackground:  t.education_background ?? null,
        bio:                  null, // bio is on profiles table, not tutor_profiles
        teachingStyle:        t.teaching_style ?? null,
        verificationStatus:   t.verification_status,
        verificationDocuments:docs,
        rejectionReason:      t.rejection_reason ?? null,
        submittedAt:          t.created_at,
        reviewedAt:           t.reviewed_at ?? null,
        docsCount:            docs.length,
        docMeta,
      };
    })
  );

  return <VerificationsClient tutors={tutors} />;
}