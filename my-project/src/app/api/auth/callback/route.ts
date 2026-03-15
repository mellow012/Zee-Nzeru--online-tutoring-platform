import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// Where each role lands after confirming their email.
// Tutors go straight to onboarding — middleware would gate them there anyway
// but being explicit avoids an extra redirect.
const ROLE_DEST: Record<string, string> = {
  student: '/student',
  tutor:   '/tutor/onboarding',
  admin:   '/admin',
};

export async function GET(request: NextRequest) {
  const requestUrl  = new URL(request.url);
  const code        = requestUrl.searchParams.get('code');
  const errorParam  = requestUrl.searchParams.get('error');

  // Supabase passes error details in the URL for things like expired links
  if (errorParam) {
    console.error('[Callback] Supabase error:', errorParam);
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }

  if (!code) {
    console.error('[Callback] No code in URL');
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }

  // `response` is a mutable reference — setAll() recreates it so that session
  // cookies get stamped onto the response object the browser will receive.
  // The destination URL used here is a placeholder; finalResponse sets the real one.
  let response = NextResponse.redirect(new URL('/', request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          // Write cookies to the request so subsequent reads in this handler see them
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Recreate response so we can stamp all cookies onto the outgoing response
          response = NextResponse.redirect(new URL('/', request.url));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Exchange the one-time code for a live session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('[Callback] exchangeCodeForSession error:', exchangeError.message);
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }

  // Read user after exchange — user_metadata.role is set by our signup flow
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('[Callback] No user after code exchange');
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }

  const role        = (user.user_metadata?.role as string) ?? 'student';
  const destination = ROLE_DEST[role] ?? '/student';

  // Build the final response with the correct destination, carrying over
  // every session cookie that was set during exchangeCodeForSession
  const finalResponse = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.getAll().forEach(({ name, value, ...opts }) => {
    finalResponse.cookies.set(name, value, opts as any);
  });

  console.log(`[Callback] ${user.email} (${role}) → ${destination}`);
  return finalResponse;
}