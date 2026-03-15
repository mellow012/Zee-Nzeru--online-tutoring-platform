// src/app/tutor/rejected/page.tsx
// Gate page — middleware redirects here when verification_status = 'rejected'.
// Fetches the rejection reason from tutor_profiles and lets the tutor resubmit.

import { createClient } from '@/lib/supabase/server';
import { RejectedClient } from './RejectedClient';

export const metadata = { title: 'Application Rejected | TutorConnect' };

export default async function TutorRejectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let rejectionReason: string | null = null;

  if (user) {
    const { data } = await supabase
      .from('tutor_profiles')
      .select('rejection_reason')
      .eq('user_id', user.id)
      .single();

    rejectionReason = data?.rejection_reason ?? null;
  }

  return <RejectedClient rejectionReason={rejectionReason} />;
} 