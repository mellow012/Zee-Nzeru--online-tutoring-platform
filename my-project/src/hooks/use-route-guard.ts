'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import type { UserRole } from '@/lib/types';

const ROLE_HOME: Record<string, string> = {
  student: '/student',
  tutor:   '/tutor',
  admin:   '/admin',
};

/**
 * useRouteGuard — drop this into any protected page.
 *
 * It acts as a client-side backup to middleware.
 * You can either:
 *   A) Pass no arguments — it auto-detects the required role from the URL.
 *      /student/* → requires 'student' or 'admin'
 *      /tutor/*   → requires 'tutor'   or 'admin'
 *      /admin/*   → requires 'admin'   only
 *
 *   B) Pass an explicit role (or array of roles) to override auto-detection.
 *
 * Usage — auto (recommended):
 *   const { user, isLoading } = useRouteGuard();
 *
 * Usage — explicit:
 *   const { user, isLoading } = useRouteGuard('admin');
 *   const { user, isLoading } = useRouteGuard(['tutor', 'admin']);
 *
 * Always guard the render:
 *   if (isLoading || !user) return <LoadingScreen />;
 */
export function useRouteGuard(requiredRole?: UserRole | UserRole[]) {
  const { user, isLoading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // Small buffer — prevents redirect during rapid React state transitions.
    // isLoading can flip to false just before the user state fully propagates,
    // so we wait one tick before acting.
    const timer = setTimeout(() => {
      // Not logged in → back to landing
      if (!user) {
        router.replace('/');
        return;
      }

      // Determine which roles are allowed
      const allowed = resolveAllowed(requiredRole, pathname);

      if (!allowed.includes(user.role)) {
        // Wrong role → redirect to their actual home
        router.replace(ROLE_HOME[user.role] ?? '/');
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [user, isLoading, router, pathname, requiredRole]);

  return { user: user ?? null, isLoading };
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function resolveAllowed(
  explicit: UserRole | UserRole[] | undefined,
  pathname: string
): UserRole[] {
  // Explicit override — use as-is
  if (explicit) {
    return Array.isArray(explicit) ? explicit : [explicit];
  }

  // Auto-detect from URL prefix
  if (pathname.startsWith('/admin'))   return ['admin'];
  if (pathname.startsWith('/tutor'))   return ['tutor',   'admin'];
  if (pathname.startsWith('/student')) return ['student', 'admin'];

  // Unknown route — require auth but allow any role
  return ['student', 'tutor', 'admin'];
}