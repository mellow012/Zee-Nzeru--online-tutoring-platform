import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { VerificationStatus } from '@/lib/types';

// ─── Route config ────────────────────────────────────────────────────────────

/** Completely open — no auth required */
const PUBLIC_ROUTES = ['/auth/verify', '/auth/callback', '/auth/error'];

/** The landing page — public but authenticated users get redirected away */
const LANDING = '/';

/**
 * Which roles can access each top-level protected route.
 * Any sub-route (e.g. /admin/users) is automatically covered by its parent.
 */
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

  // Always validate server-side — never trust cookies alone
  const { data: { user }, error } = await supabase.auth.getUser();

  // ── 1. Public routes ───────────────────────────────────────────────────────
  if (isPublicRoute(pathname)) {
    // Authenticated user hitting the landing page → send to their dashboard
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

  // ── 4. Role guard — covers ALL protected routes automatically ──────────────
  //    Adding a new section (e.g. /teachers) only requires one entry above.
  const protectedBase = getProtectedBase(pathname);

  if (protectedBase) {
    const allowedRoles = PROTECTED_ROUTES[protectedBase];
    if (!allowedRoles.includes(role ?? '')) {
      // Wrong role → send them to their own home, not a blank page
      return NextResponse.redirect(
        new URL(ROLE_HOME[role ?? ''] ?? LANDING, request.url)
      );
    }
  }

  // ── 5. Tutor verification gate ─────────────────────────────────────────────
  //    Only runs for /tutor/* paths for actual tutors (admins bypass).
  if (pathname.startsWith('/tutor') && role === 'tutor') {
    const isGatingPage =
      pathname.startsWith('/tutor/onboarding') ||
      pathname.startsWith('/tutor/pending')    ||
      pathname.startsWith('/tutor/rejected');

    if (!isGatingPage) {
      const { data: tp } = await supabase
        .from('tutor_profiles')
        .select('verification_documents, verification_status')
        .eq('user_id', user.id)
        .single();

      const status   = (tp?.verification_status as VerificationStatus) ?? 'not_submitted';
      const hasDocs  = Array.isArray(tp?.verification_documents) && tp.verification_documents.length > 0;

      if (!hasDocs || status === 'not_submitted') {
        return NextResponse.redirect(new URL('/tutor/onboarding', request.url));
      }
      if (status === 'pending') {
        return NextResponse.redirect(new URL('/tutor/pending', request.url));
      }
      if (status === 'rejected') {
        return NextResponse.redirect(new URL('/tutor/rejected', request.url));
      }
      // 'approved' → falls through, access granted
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};