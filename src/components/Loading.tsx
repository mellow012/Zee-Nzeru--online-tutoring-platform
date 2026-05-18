'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, BookOpen, Shield } from 'lucide-react';
import type { UserRole } from '@/lib/types';

// ─── Theme ────────────────────────────────────────────────────────────────────

interface Theme {
  bg: string;
  grid: string;
  vignette: string;
  brand: string;
  tagline: string;
  barTrack: string;
  bottomText: string;
  ringFaint: string;
}

const LIGHT: Theme = {
  bg:         'bg-gray-50',
  grid:       'rgba(0,0,0,0.06)',
  vignette:   'radial-gradient(ellipse at center, transparent 40%, rgba(243,244,246,0.95) 100%)',
  brand:      'text-gray-500',
  tagline:    'text-gray-400',
  barTrack:   'bg-black/[0.07]',
  bottomText: 'text-gray-300',
  ringFaint:  'opacity-20',
};

const DARK: Theme = {
  bg:         'bg-[#080810]',
  grid:       'rgba(255,255,255,0.04)',
  vignette:   'radial-gradient(ellipse at center, transparent 40%, #080810 100%)',
  brand:      'text-white/30',
  tagline:    'text-white/30',
  barTrack:   'bg-white/[0.07]',
  bottomText: 'text-white/15',
  ringFaint:  'opacity-15',
};

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  student: {
    icon:      BookOpen,
    label:     'Student Portal',
    tagline:   'Loading your learning space...',
    gradient:  'from-sky-400 via-blue-500 to-indigo-600',
    orb1:      { light: 'bg-sky-300/40',    dark: 'bg-sky-400/25'    },
    orb2:      { light: 'bg-indigo-300/30', dark: 'bg-indigo-400/15' },
    ring:      { light: 'border-sky-400',   dark: 'border-sky-400'   },
    dot:       { light: 'bg-sky-500',       dark: 'bg-sky-400'       },
    bar:       'from-sky-400 to-indigo-500',
    accent:    { light: 'text-sky-600',     dark: 'text-sky-300'     },
    glow:      '#3b82f6',
  },
  tutor: {
    icon:      GraduationCap,
    label:     'Tutor Dashboard',
    tagline:   'Preparing your workspace...',
    gradient:  'from-emerald-400 via-teal-500 to-cyan-600',
    orb1:      { light: 'bg-emerald-300/40', dark: 'bg-emerald-400/25' },
    orb2:      { light: 'bg-teal-300/30',    dark: 'bg-teal-400/15'    },
    ring:      { light: 'border-emerald-400', dark: 'border-emerald-400' },
    dot:       { light: 'bg-emerald-500',    dark: 'bg-emerald-400'    },
    bar:       'from-emerald-400 to-teal-500',
    accent:    { light: 'text-emerald-600',  dark: 'text-emerald-300'  },
    glow:      '#10b981',
  },
  admin: {
    icon:      Shield,
    label:     'Admin Console',
    tagline:   'Initialising control panel...',
    gradient:  'from-violet-500 via-purple-600 to-fuchsia-600',
    orb1:      { light: 'bg-violet-300/40',  dark: 'bg-violet-400/25'  },
    orb2:      { light: 'bg-fuchsia-300/30', dark: 'bg-fuchsia-400/15' },
    ring:      { light: 'border-violet-500', dark: 'border-violet-400' },
    dot:       { light: 'bg-violet-500',     dark: 'bg-violet-400'     },
    bar:       'from-violet-400 to-fuchsia-500',
    accent:    { light: 'text-violet-600',   dark: 'text-violet-300'   },
    glow:      '#7c3aed',
  },
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface LoadingScreenProps {
  role?: UserRole;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LoadingScreen({ role }: LoadingScreenProps) {
  const [isDark, setIsDark] = useState(false);

  // Detect system colour scheme — updates if the user changes it live
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const theme = isDark ? DARK : LIGHT;

  if (!role) return <GenericLoader theme={theme} isDark={isDark} />;

  return <RoleLoader role={role} theme={theme} isDark={isDark} />;
}

// ─── Role loader ──────────────────────────────────────────────────────────────

function RoleLoader({
  role, theme, isDark,
}: {
  role: UserRole;
  theme: Theme;
  isDark: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [dotIndex, setDotIndex] = useState(0);
  const c = ROLE_CONFIG[role];
  const Icon = c.icon;
  const t = isDark ? 'dark' : 'light';

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) { clearInterval(interval); return p; }
        return Math.min(p + Math.random() * 14, 85);
      });
    }, 280);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setDotIndex((i) => (i + 1) % 3), 480);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative min-h-screen ${theme.bg} overflow-hidden flex flex-col items-center justify-center select-none transition-colors duration-300`}>

      {/* Ambient orbs */}
      <div className={`absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full blur-[110px] ${c.orb1[t]}`}
        style={{ animation: 'orbFloat 6s ease-in-out infinite' }} />
      <div className={`absolute -bottom-24 -right-24 w-[380px] h-[380px] rounded-full blur-[100px] ${c.orb2[t]}`}
        style={{ animation: 'orbFloat 8s ease-in-out infinite reverse' }} />

      {/* Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(${theme.grid} 1px, transparent 1px), linear-gradient(90deg, ${theme.grid} 1px, transparent 1px)`,
        backgroundSize: '44px 44px',
      }} />

      {/* Vignette */}
      <div className="absolute inset-0" style={{ background: theme.vignette }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-10">

        {/* Icon with spinning rings */}
        <div className="relative flex items-center justify-center">
          <div className={`absolute w-36 h-36 rounded-full border ${c.ring[t]} ${theme.ringFaint}`}
            style={{ animation: 'spinSlow 8s linear infinite' }} />
          <div className={`absolute w-28 h-28 rounded-full border ${c.ring[t]} border-b-transparent border-l-transparent opacity-30`}
            style={{ animation: 'spinSlow 4s linear infinite reverse' }} />
          <div className={`absolute w-24 h-24 rounded-full border-2 ${c.ring[t]} border-t-transparent border-r-transparent opacity-50`}
            style={{ animation: 'spinSlow 2s linear infinite' }} />

          <div
            className={`relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center`}
            style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.12), 0 0 40px ${c.glow}40, 0 0 80px ${c.glow}18` }}
          >
            <Icon className="w-9 h-9 text-white drop-shadow-lg" strokeWidth={1.5} />
          </div>
        </div>

        {/* Labels */}
        <div className="text-center space-y-2.5">
          <div className="flex items-center justify-center gap-2">
            <span className={`text-[10px] tracking-[0.3em] uppercase font-medium ${theme.brand}`}>
              Zee Nzeru
            </span>
            <span className={`w-px h-3 ${isDark ? 'bg-white/15' : 'bg-black/15'}`} />
            <span className={`text-[10px] tracking-[0.3em] uppercase font-medium ${c.accent[t]}`}>
              {c.label}
            </span>
          </div>
          <p className={`text-sm font-light ${theme.tagline} flex items-center justify-center gap-2`}>
            {c.tagline}
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i}
                  className={`inline-block w-1 h-1 rounded-full transition-all duration-300 ${
                    dotIndex === i ? `${c.dot[t]} scale-150` : isDark ? 'bg-white/15' : 'bg-black/15'
                  }`}
                />
              ))}
            </span>
          </p>
        </div>

        {/* Progress bar */}
        <div className={`w-48 h-[2px] ${theme.barTrack} rounded-full overflow-hidden`}>
          <div
            className={`h-full rounded-full bg-gradient-to-r ${c.bar} transition-all duration-500 ease-out relative overflow-hidden`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            <div className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              style={{ animation: 'shimmerBar 1.8s ease-in-out infinite' }} />
          </div>
        </div>

      </div>

      {/* Bottom brand */}
      <div className={`absolute bottom-7 flex items-center gap-2 ${theme.bottomText}`}>
        <GraduationCap className="w-3.5 h-3.5" />
        <span className="text-[10px] tracking-[0.25em] uppercase">Malawi&apos;s Premier Tutoring Platform</span>
      </div>

      <Keyframes />
    </div>
  );
}

// ─── Generic loader ───────────────────────────────────────────────────────────

function GenericLoader({ theme, isDark }: { theme: Theme; isDark: boolean }) {
  return (
    <div className={`relative min-h-screen ${theme.bg} overflow-hidden flex flex-col items-center justify-center transition-colors duration-300`}>
      <div className="absolute -top-24 -left-24 w-[360px] h-[360px] rounded-full blur-[100px] bg-emerald-400/20"
        style={{ animation: 'orbFloat 6s ease-in-out infinite' }} />
      <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full blur-[90px] bg-teal-400/15"
        style={{ animation: 'orbFloat 8s ease-in-out infinite reverse' }} />

      {/* Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(${theme.grid} 1px, transparent 1px), linear-gradient(90deg, ${theme.grid} 1px, transparent 1px)`,
        backgroundSize: '44px 44px',
      }} />
      <div className="absolute inset-0" style={{ background: theme.vignette }} />

      <div className="relative z-10 flex flex-col items-center gap-7">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full border border-emerald-400/25"
            style={{ animation: 'spinSlow 6s linear infinite' }} />
          <div className="absolute w-20 h-20 rounded-full border border-emerald-400/35 border-t-transparent"
            style={{ animation: 'spinSlow 3s linear infinite reverse' }} />
          <div
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center"
            style={{ boxShadow: '0 0 40px #10b98145, 0 0 80px #10b98118' }}
          >
            <GraduationCap className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <p className={`text-xs tracking-[0.3em] uppercase font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
            Zee Nzeru
          </p>
          <p className={`text-xs ${theme.tagline}`}>Authenticating...</p>
        </div>

        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i}
              className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-bounce"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      </div>

      <div className={`absolute bottom-7 text-[10px] tracking-[0.25em] uppercase ${theme.bottomText}`}>
        Malawi&apos;s Premier Tutoring Platform
      </div>

      <Keyframes />
    </div>
  );
}

// ─── Shared keyframes ─────────────────────────────────────────────────────────

function Keyframes() {
  return (
    <style>{`
      @keyframes spinSlow {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes orbFloat {
        0%, 100% { transform: translateY(0px) scale(1); }
        50%       { transform: translateY(-20px) scale(1.04); }
      }
      @keyframes shimmerBar {
        0%   { transform: translateX(-200%); }
        100% { transform: translateX(400%); }
      }
    `}</style>
  );
}