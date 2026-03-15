import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// ─── Route config ────────────────────────────────────────────────────────────

const PUBLIC_ROUTES = ['/auth/verify', '/auth/callback', '/auth/error'];
const LANDING = '/';

const PROTECTED_ROUTES: Record<string, string[]> = {
  '/student': ['student', 'admin'],
  '/tutor':   ['tutor',   'admin'],
  '/admin':   ['admin'],
};

const ROLE_HOME: Record<string, string> = {
  student: '/student',
  tutor:   '/tutor',
  admin:   '/admin',
};

// Pages unverified tutors ARE allowed to visit
// (profile is where they complete verification, gate pages explain their status)
const TUTOR_UNVERIFIED_ALLOWED = [
  '/tutor/profile',
  '/tutor/onboarding',
  '/tutor/pending',
  '/tutor/rejected',
];

type VerificationStatus =
  | 'not_submitted'
  | 'pending_review'
  | 'approved'
  | 'rejected';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPublicRoute(pathname: string) {
  return (
    pathname === LANDING ||
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))
  );
}

function getProtectedBase(pathname: string) {
  return (
    Object.keys(PROTECTED_ROUTES).find(
      (base) => pathname === base || pathname.startsWith(base + '/')
    ) ?? null
  );
}

function isTutorUnverifiedAllowed(pathname: string) {
  return TUTOR_UNVERIFIED_ALLOWED.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

// ─── Middleware ───────────────────────────────────────────────────────────────

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

  const { data: { user }, error } = await supabase.auth.getUser();

  // ── 1. Public routes ───────────────────────────────────────────────────────
  if (isPublicRoute(pathname)) {
    if (pathname === LANDING && user && !error) {
      const role = user.user_metadata?.role as string | undefined;
      return NextResponse.redirect(
        new URL(ROLE_HOME[role ?? ''] ?? '/student', request.url)
      );
    }
    return supabaseResponse;
  }

  // ── 2. Not authenticated → back to landing ─────────────────────────────────
  if (error || !user) {
    const url = new URL(LANDING, request.url);
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // ── 3. Email not verified ──────────────────────────────────────────────────
  if (!user.email_confirmed_at) {
    return NextResponse.redirect(new URL('/auth/verify', request.url));
  }

  const role = user.user_metadata?.role as string | undefined;

  // ── 4. Role guard ──────────────────────────────────────────────────────────
  const protectedBase = getProtectedBase(pathname);
  if (protectedBase) {
    const allowedRoles = PROTECTED_ROUTES[protectedBase];
    if (!allowedRoles.includes(role ?? '')) {
      return NextResponse.redirect(
        new URL(ROLE_HOME[role ?? ''] ?? LANDING, request.url)
      );
    }
  }

  // ── 5. Tutor verification gate ─────────────────────────────────────────────
  // Admins bypass this gate entirely.
  if (pathname.startsWith('/tutor') && role === 'tutor') {

    // Always allow access to the profile page and gate pages
    if (isTutorUnverifiedAllowed(pathname)) {
      return supabaseResponse;
    }

    // For everything else, check verification status
    const { data: tp } = await supabase
      .from('tutor_profiles')
      .select('verification_documents, verification_status')
      .eq('user_id', user.id)
      .single();

    const status  = (tp?.verification_status ?? 'not_submitted') as VerificationStatus;
    const hasDocs = Array.isArray(tp?.verification_documents) &&
                    tp.verification_documents.length > 0;

    // No profile or not submitted → send to profile to complete verification
    if (!tp || !hasDocs || status === 'not_submitted') {
      return NextResponse.redirect(new URL('/tutor/profile', request.url));
    }

    // Submitted but awaiting admin review
      if (status === 'pending_review') {
        return NextResponse.redirect(new URL('/tutor/pending', request.url));
      }

    // Rejected → back to profile to resubmit
    if (status === 'rejected') {
      return NextResponse.redirect(new URL('/tutor/profile', request.url));
    }

    // approved → access granted, fall through
  }
  // ── 5. Tutor verification gate
if (pathname.startsWith('/tutor') && role === 'tutor') {

  if (isTutorUnverifiedAllowed(pathname)) {
    return supabaseResponse;
  }

  const { data: tp, error: tpError } = await supabase  // ← add error
    .from('tutor_profiles')
    .select('verification_documents, verification_status')
    .eq('user_id', user.id)
    .single();

  // ← ADD THIS LINE
  console.log('[Middleware] tutor gate:', { pathname, tp, tpError, userId: user.id });
}

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};