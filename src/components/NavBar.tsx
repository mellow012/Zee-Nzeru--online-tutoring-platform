'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  LayoutDashboard,
  Search,
  Calendar,
  MessageCircle,
  CreditCard,
  TrendingUp,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  BookOpen,
  Wallet,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/lib/types';

// ─── Nav items per role ───────────────────────────────────────────────────────

const NAV_ITEMS: Record<UserRole, { label: string; href: string; icon: React.ElementType }[]> = {
  student: [
    { label: 'Dashboard',    href: '/student',          icon: LayoutDashboard },
    { label: 'Find Tutors',  href: '/student/tutors',   icon: Search          },
    { label: 'My Sessions',  href: '/student/sessions', icon: Calendar        },
    { label: 'Progress',     href: '/student/progress', icon: TrendingUp      },
    { label: 'Messages',     href: '/student/messages', icon: MessageCircle   },
    { label: 'Payments',     href: '/student/payments', icon: CreditCard      },
  ],
  tutor: [
    { label: 'Dashboard',    href: '/tutor',              icon: LayoutDashboard },
    { label: 'Sessions',     href: '/tutor/sessions',     icon: Calendar        },
    { label: 'Requests',     href: '/tutor/requests',     icon: ClipboardList   },
    { label: 'Materials',    href: '/tutor/materials',    icon: BookOpen        },
    { label: 'Messages',     href: '/tutor/messages',     icon: MessageCircle   },
    { label: 'Earnings',     href: '/tutor/earnings',     icon: Wallet          },
  ],
  admin: [
    { label: 'Dashboard',    href: '/admin',                  icon: LayoutDashboard },
    { label: 'Verifications',href: '/admin/verifications',    icon: ShieldCheck     },
    { label: 'Users',        href: '/admin/users',            icon: Users           },
    { label: 'Sessions',     href: '/admin/sessions',         icon: Calendar        },
    { label: 'Payments',     href: '/admin/payments',         icon: CreditCard      },
    { label: 'Settings',     href: '/admin/settings',         icon: Settings        },
  ],
};

const ROLE_COLOR: Record<UserRole, { pill: string; dot: string; active: string; hover: string }> = {
  student: {
    pill:   'bg-sky-100 text-sky-700 border-sky-200',
    dot:    'bg-sky-500',
    active: 'text-sky-600 bg-sky-50',
    hover:  'hover:text-sky-600 hover:bg-sky-50',
  },
  tutor: {
    pill:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot:    'bg-emerald-500',
    active: 'text-emerald-600 bg-emerald-50',
    hover:  'hover:text-emerald-600 hover:bg-emerald-50',
  },
  admin: {
    pill:   'bg-violet-100 text-violet-700 border-violet-200',
    dot:    'bg-violet-500',
    active: 'text-violet-600 bg-violet-50',
    hover:  'hover:text-violet-600 hover:bg-violet-50',
  },
};

const ROLE_LABEL: Record<UserRole, string> = {
  student: 'Student',
  tutor:   'Tutor',
  admin:   'Admin',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const pathname  = usePathname();
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const navItems = user ? NAV_ITEMS[user.role] : [];
  const colors   = user ? ROLE_COLOR[user.role] : ROLE_COLOR.student;

  const initials = user
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '';

  const isActive = (href: string) =>
    href === `/${user?.role}` ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between gap-4">

            {/* ── Brand ── */}
            <Link
              href={user ? `/${user.role}` : '/'}
              className="flex items-center gap-2.5 shrink-0"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                <GraduationCap className="w-4.5 h-4.5 text-white" size={18} />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent hidden sm:block">
                Zee Nzeru
              </span>
            </Link>

            {/* ── Desktop nav links (logged in) ── */}
            {!isLoading && user && (
              <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
                {navItems.map(({ label, href, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive(href)
                        ? colors.active
                        : `text-muted-foreground ${colors.hover}`
                    }`}
                  >
                    <Icon size={15} className="shrink-0" />
                    {label}
                    {isActive(href) && (
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} ml-0.5`} />
                    )}
                  </Link>
                ))}
              </div>
            )}

            {/* ── Desktop nav (logged out) ── */}
            {!isLoading && !user && (
              <div className="hidden md:flex items-center gap-2 ml-auto">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/?auth=login">Login</Link>
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" asChild>
                  <Link href="/?auth=signup">Get Started</Link>
                </Button>
              </div>
            )}

            {/* ── Loading skeleton ── */}
            {isLoading && (
              <div className="hidden md:flex items-center gap-3 flex-1 justify-center">
                {[80, 72, 88, 64, 80].map((w, i) => (
                  <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" style={{ width: w }} />
                ))}
              </div>
            )}

            {/* ── Right side ── */}
            <div className="flex items-center gap-2 shrink-0">

              {/* Notifications (logged in) */}
              {!isLoading && user && (
                <button className="relative w-9 h-9 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Bell size={16} />
                  <span className={`absolute -top-1 -right-1 w-4 h-4 ${colors.dot} rounded-full text-[10px] text-white font-bold flex items-center justify-center`}>
                    3
                  </span>
                </button>
              )}

              {/* Profile dropdown (logged in) */}
              {!isLoading && user && (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen((o) => !o)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
                  >
                    {/* Avatar */}
                    <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${
                      user.role === 'admin'   ? 'from-violet-400 to-fuchsia-500' :
                      user.role === 'tutor'   ? 'from-emerald-400 to-teal-500' :
                                                'from-sky-400 to-blue-500'
                    } flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
                      {initials}
                    </div>

                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-semibold leading-none truncate max-w-[100px]">
                        {user.fullName.split(' ')[0]}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${colors.pill} leading-none mt-0.5 inline-block`}>
                        {ROLE_LABEL[user.role]}
                      </span>
                    </div>

                    <ChevronDown size={13} className={`text-muted-foreground transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown */}
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-white shadow-lg overflow-hidden z-50">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-border bg-gray-50/60">
                        <p className="text-sm font-semibold truncate">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${colors.pill} mt-1 inline-block`}>
                          {ROLE_LABEL[user.role]}
                        </span>
                      </div>

                      {/* Quick links */}
                      <div className="py-1">
                        {navItems.slice(0, 4).map(({ label, href, icon: Icon }) => (
                          <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                              isActive(href)
                                ? colors.active
                                : `text-muted-foreground ${colors.hover}`
                            }`}
                          >
                            <Icon size={14} />
                            {label}
                          </Link>
                        ))}
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

              {/* Logged out buttons (mobile) */}
              {!isLoading && !user && (
                <div className="flex md:hidden items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/?auth=login">Login</Link>
                  </Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" asChild>
                    <Link href="/?auth=signup">Join</Link>
                  </Button>
                </div>
              )}

              {/* Mobile menu toggle (logged in) */}
              {!isLoading && user && (
                <button
                  className="md:hidden w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileOpen((o) => !o)}
                >
                  {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {mobileOpen && user && (
          <div className="md:hidden border-t border-border bg-white">
            {/* User info */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-gray-50/60">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${
                user.role === 'admin'   ? 'from-violet-400 to-fuchsia-500' :
                user.role === 'tutor'   ? 'from-emerald-400 to-teal-500' :
                                          'from-sky-400 to-blue-500'
              } flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <span className={`ml-auto text-[10px] px-2 py-1 rounded border font-medium ${colors.pill}`}>
                {ROLE_LABEL[user.role]}
              </span>
            </div>

            {/* Nav links */}
            <div className="py-2 px-2">
              {navItems.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive(href)
                      ? colors.active
                      : `text-muted-foreground ${colors.hover}`
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {label}
                  {isActive(href) && (
                    <span className={`ml-auto w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                  )}
                </Link>
              ))}
            </div>

            {/* Logout */}
            <div className="px-2 pb-3 border-t border-border mt-1 pt-2">
              <button
                onClick={logout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 w-full transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}