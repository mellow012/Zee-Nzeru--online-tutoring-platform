'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap, LogOut, ChevronDown,
  LayoutDashboard, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserRole } from '@/lib/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const PUBLIC_LINKS = [
  { label: 'Home',    href: '/'        },
  { label: 'About',   href: '/about'   },
  { label: 'Contact', href: '/contact' },
];

const ROLE_HOME: Record<UserRole, string> = {
  student: '/student',
  tutor:   '/tutor',
  admin:   '/admin',
};

const ROLE_LABEL: Record<UserRole, string> = {
  student: 'Student',
  tutor:   'Tutor',
  admin:   'Admin',
};

const ROLE_PILL: Record<UserRole, string> = {
  student: 'bg-sky-100 text-sky-700 border-sky-200',
  tutor:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  admin:   'bg-violet-100 text-violet-700 border-violet-200',
};

const ROLE_AVATAR: Record<UserRole, string> = {
  student: 'from-sky-400 to-blue-500',
  tutor:   'from-emerald-400 to-teal-500',
  admin:   'from-violet-400 to-fuchsia-500',
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const pathname    = usePathname();
  const router      = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef  = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setProfileOpen(false); }, [pathname]);

  const pill       = user ? ROLE_PILL[user.role]   : '';
  const avatarGrad = user ? ROLE_AVATAR[user.role] : '';
  const initials   = user ? getInitials(user.fullName) : '';

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4">
        <div className="relative flex h-16 items-center justify-between">

          {/* ── Brand ── */}
          <Link
            href={user ? ROLE_HOME[user.role] : '/'}
            className="flex items-center gap-2.5 shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent hidden sm:block">
              Zee Nzeru
            </span>
          </Link>

          {/* ── Public links — always visible ── */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {PUBLIC_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* ── Right side ── */}
          <div className="flex items-center gap-2 ml-auto shrink-0">

            {/* Logged out */}
            {!isLoading && !user && (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link href="/?auth=login">Login</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  asChild
                >
                  <Link href="/?auth=signup">Get Started</Link>
                </Button>
              </>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="w-24 h-8 rounded-lg bg-gray-100 animate-pulse" />
            )}

            {/* Logged in — notifications */}
            {!isLoading && user && (
              <NotificationBell variant="navbar" />
            )}

            {/* Logged in — profile dropdown */}
            {!isLoading && user && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
                >
                  {/* Avatar */}
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={user.avatarUrl ?? undefined} />
                    <AvatarFallback className={`bg-gradient-to-br ${avatarGrad} text-white text-[11px] font-bold`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name + role pill */}
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold leading-none truncate max-w-[100px]">
                      {user.fullName.split(' ')[0]}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium leading-none mt-0.5 inline-block ${pill}`}>
                      {ROLE_LABEL[user.role]}
                    </span>
                  </div>

                  <ChevronDown
                    size={13}
                    className={`text-muted-foreground transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-white shadow-lg overflow-hidden z-50">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border bg-gray-50/60">
                      <p className="text-sm font-semibold truncate">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium mt-1.5 inline-block ${pill}`}>
                        {ROLE_LABEL[user.role]}
                      </span>
                    </div>

                    {/* Dashboard link */}
                    <div className="py-1">
                      <Link
                        href={ROLE_HOME[user.role]}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <LayoutDashboard size={14} />
                        Go to Dashboard
                      </Link>
                      <Link
                        href={`${ROLE_HOME[user.role]}/profile`}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <User size={14} />
                        My Profile
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-border py-1">
                      <button
                        onClick={logout}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 w-full transition-colors"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Mobile public links */}
      <div className="md:hidden border-t border-border px-4 py-2 flex gap-1 bg-white">
        {PUBLIC_LINKS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 text-center px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === href
                ? 'text-emerald-600 bg-emerald-50'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {label}
          </Link>
        ))}
        {!isLoading && !user && (
          <Link
            href="/?auth=login"
            className="flex-1 text-center px-2 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}