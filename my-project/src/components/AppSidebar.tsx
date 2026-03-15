'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { NotificationBell } from '@/components/NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  GraduationCap, LayoutDashboard, Search, Calendar,
  MessageCircle, CreditCard, TrendingUp, BookOpen,
  Wallet, ClipboardList, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = {
  student: [
    { label: 'Dashboard',   href: '/student',          icon: LayoutDashboard },
    { label: 'Find Tutors', href: '/student/tutors',   icon: Search          },
    { label: 'My Sessions', href: '/student/sessions', icon: Calendar        },
    { label: 'Progress',    href: '/student/progress', icon: TrendingUp      },
    { label: 'Messages',    href: '/student/messages', icon: MessageCircle   },
    { label: 'Payments',    href: '/student/payments', icon: CreditCard      },
  ],
  tutor: [
    { label: 'Dashboard',  href: '/tutor',           icon: LayoutDashboard },
    { label: 'Sessions',   href: '/tutor/sessions',  icon: Calendar        },
    { label: 'Requests',   href: '/tutor/requests',  icon: ClipboardList   },
    { label: 'Materials',  href: '/tutor/materials', icon: BookOpen        },
    { label: 'Messages',   href: '/tutor/messages',  icon: MessageCircle   },
    { label: 'Earnings',   href: '/tutor/earnings',  icon: Wallet          },
  ],
} as const;

const ROLE_LABEL = { student: 'Student', tutor: 'Tutor' } as const;

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppSidebar({ role }: { role: 'student' | 'tutor' }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const items = NAV_ITEMS[role];

  const isActive = (href: string) =>
    href === `/${role}` ? pathname === href : pathname.startsWith(href);

  // ── Shared inner content ───────────────────────────────────────────────────
  const SidebarInner = ({ forceExpanded = false }: { forceExpanded?: boolean }) => {
    const expanded = forceExpanded || !collapsed;
    return (
      <>
        {/* Brand — identical to admin */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
            <GraduationCap size={18} className="text-white" />
          </div>
          {expanded && (
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent block leading-tight">
                Zee Nzeru
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold tracking-widest uppercase">
                {ROLE_LABEL[role]}
              </span>
            </div>
          )}
        </div>

        {/* Nav — identical structure to admin */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {items.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={!expanded ? label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
                  ${active
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }
                  ${!expanded ? 'justify-center' : ''}
                `}
              >
                <Icon size={17} className="shrink-0" />
                {expanded && <span className="flex-1 text-left">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User footer — identical to admin */}
        <div className={`p-4 border-t border-border ${!expanded ? 'flex justify-center' : ''}`}>
          {expanded ? (
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={user?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-sm">
                  {getInitials(user?.fullName ?? 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              title="Sign out"
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col bg-card border-r border-border shrink-0 transition-all duration-300 relative
          ${collapsed ? 'w-[72px]' : 'w-64'}`}
      >
        {/* Collapse toggle — same as admin's menu button */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-[72px] z-10 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm transition-colors"
        >
          <ChevronRight
            size={12}
            className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>

        <SidebarInner />
      </aside>

      {/* ── Mobile: fixed top bar ───────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-card border-b border-border">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <GraduationCap size={15} className="text-white" />
          </div>
          <span className="font-bold text-base bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Zee Nzeru
          </span>
        </div>

        {/* User chip + hamburger */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border border-border bg-background">
            <Avatar className="w-6 h-6 shrink-0">
              <AvatarImage src={user?.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-[10px]">
                {getInitials(user?.fullName ?? 'U')}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold truncate max-w-[70px]">
              {user?.fullName?.split(' ')[0]}
            </span>
            <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wide hidden xs:block">
              {ROLE_LABEL[role]}
            </span>
          </div>

          <NotificationBell variant="sidebar" />

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ── Mobile: backdrop + drawer ────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 flex flex-col bg-card border-r border-border shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
            <SidebarInner forceExpanded />
          </aside>
        </>
      )}
    </>
  );
}