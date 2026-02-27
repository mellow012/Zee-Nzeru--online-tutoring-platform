import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const ROLE_HOME: Record<string, string> = {
  student: '/student',
  tutor: '/tutor',
  admin: '/admin',
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const errorParam = requestUrl.searchParams.get('error');

  // Handle Supabase-level errors passed in URL (e.g. expired link)
  if (errorParam) {
    console.error('[Callback] Supabase error param:', errorParam);
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }

  if (!code) {
    console.error('[Callback] No code in URL');
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }

  // Start with a base redirect — will be overwritten once we know the role
  let response = NextResponse.redirect(new URL('/', request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          // Write to request so subsequent reads in this handler work
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Recreate the response and stamp all cookies onto it so the browser gets them
          response = NextResponse.redirect(new URL('/', request.url));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Exchange the one-time code for a session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error('[Callback] exchangeCodeForSession error:', exchangeError.message);
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }

  // Profile + role-specific row creation is handled entirely by DB triggers.
  // We only need to read the role here to know where to send the user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[Callback] No user after exchange');
    return NextResponse.redirect(new URL('/auth/error', request.url));
  }

  const role = (user.user_metadata?.role as string) ?? 'student';
  const destination = ROLE_HOME[role] ?? '/student';

  // Build the final redirect, carrying over all session cookies that were set
  const finalResponse = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.getAll().forEach(({ name, value, ...opts }) => {
    finalResponse.cookies.set(name, value, opts as any);
  });

  console.log(`[Callback] Success — redirecting ${user.id} (${role}) to ${destination}`);
  return finalResponse;
}