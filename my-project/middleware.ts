import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/', '/auth/verify', '/auth/callback', '/auth/error'];
const ROLE_HOME: Record<string, string> = {
  student: '/student',
  tutor: '/tutor',
  admin: '/admin',
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Always refresh session — do not remove
  const { data: { user } } = await supabase.auth.getUser();

  const isPublic = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith('/auth/'));

  // Unauthenticated user trying to access protected route
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const role = profile?.role;

    // Helper to get tutor verification state (only fetched when needed)
    const getTutorState = async () => {
      const { data: tp } = await supabase
        .from('tutor_profiles')
        .select('verified, verification_documents')
        .eq('user_id', user.id)
        .single();
      const hasDocs = Array.isArray(tp?.verification_documents) && tp.verification_documents.length > 0;
      return { verified: tp?.verified ?? false, hasDocs };
    };

    // Redirect away from landing page to their correct dashboard
    if (pathname === '/') {
      if (role === 'tutor') {
        const { hasDocs, verified } = await getTutorState();
        if (!hasDocs) return NextResponse.redirect(new URL('/tutor/onboarding', request.url));
        if (!verified) return NextResponse.redirect(new URL('/tutor/pending', request.url));
      }
      return NextResponse.redirect(new URL(ROLE_HOME[role ?? ''] ?? '/student', request.url));
    }

    // Guard tutor dashboard — must complete onboarding and be verified
    if (pathname === '/tutor' && role === 'tutor') {
      const { hasDocs, verified } = await getTutorState();
      if (!hasDocs) return NextResponse.redirect(new URL('/tutor/onboarding', request.url));
      if (!verified) return NextResponse.redirect(new URL('/tutor/pending', request.url));
    }

    // Prevent cross-role access
    if (pathname.startsWith('/student') && role !== 'student' && role !== 'admin') {
      return NextResponse.redirect(new URL(ROLE_HOME[role ?? ''] ?? '/', request.url));
    }
    if (
      pathname.startsWith('/tutor') &&
      !pathname.startsWith('/tutor/onboarding') &&
      !pathname.startsWith('/tutor/pending') &&
      role !== 'tutor' && role !== 'admin'
    ) {
      return NextResponse.redirect(new URL(ROLE_HOME[role ?? ''] ?? '/', request.url));
    }
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(ROLE_HOME[role ?? ''] ?? '/', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/',
    '/student/:path*',
    '/tutor/:path*',
    '/admin/:path*',
    '/classroom/:path*',
    '/auth/:path*',
  ],
};