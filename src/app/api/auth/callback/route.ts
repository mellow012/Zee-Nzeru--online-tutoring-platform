import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get user role to redirect them to the right place
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        const role = profile?.role;

        if (role === 'tutor') {
          // Check if tutor has submitted verification docs
          const { data: tutorProfile } = await supabase
            .from('tutor_profiles')
            .select('verified, verification_documents')
            .eq('user_id', user.id)
            .single();

          const hasSubmittedDocs =
            tutorProfile?.verification_documents &&
            (tutorProfile.verification_documents as string[]).length > 0;

          if (!hasSubmittedDocs) {
            return NextResponse.redirect(`${origin}/tutor/onboarding`);
          }

          if (!tutorProfile?.verified) {
            return NextResponse.redirect(`${origin}/tutor/pending`);
          }

          return NextResponse.redirect(`${origin}/tutor`);
        }

        if (role === 'student') return NextResponse.redirect(`${origin}/student`);
        if (role === 'admin') return NextResponse.redirect(`${origin}/admin`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth code exchange failed
  return NextResponse.redirect(`${origin}/auth/error`);
}