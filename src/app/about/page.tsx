import Link from 'next/link';
import {
  GraduationCap, Target, ShieldCheck, Users, HeartHandshake,
  Award, Sparkles, BookOpen, CheckCircle2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'About Us | Zee Nzeru Online Tutoring',
  description: 'Empowering students across Malawi and beyond with access to verified, top-tier academic tutors and flexible online learning.',
};

export default function AboutPage() {
  const stats = [
    { label: 'Verified Tutors', value: '150+' },
    { label: 'Sessions Completed', value: '3,200+' },
    { label: 'Satisfaction Rate', value: '98%' },
    { label: 'Subjects Offered', value: '25+' },
  ];

  const values = [
    {
      icon: Target,
      title: 'Academic Excellence',
      description: 'We rigorously vet every tutor to ensure high-quality, impactful, and results-driven instruction.',
    },
    {
      icon: HeartHandshake,
      title: 'Accessible Learning',
      description: 'Bridging the educational gap with affordable pricing, mobile money integrations, and flexible scheduling.',
    },
    {
      icon: ShieldCheck,
      title: 'Trust & Safety',
      description: 'End-to-end background checks, secure virtual classrooms, and transparent review systems.',
    },
    {
      icon: Users,
      title: 'Community Empowerment',
      description: 'Enabling passionate educators to monetize their expertise while uplifting students in their academic journeys.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-emerald-50/50 via-background to-background dark:from-emerald-950/20 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
              Empowering The Next Generation
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Democratizing Quality Education with{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Zee Nzeru
              </span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed">
              Zee Nzeru is Malawi’s premier digital tutoring platform. We connect ambitious students with certified, high-performing tutors for interactive 1-on-1 virtual sessions.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md gap-2" asChild>
                <Link href="/?auth=signup">
                  Get Started Free <ArrowRight size={16} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-xl border-border" asChild>
                <Link href="/apply">
                  Become a Tutor
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS SECTION ────────────────────────────────────────────────── */}
      <section className="py-12 border-b border-border bg-emerald-900 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label} className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-emerald-300">{s.value}</p>
                <p className="text-xs sm:text-sm text-emerald-100 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUR MISSION & VISION ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <BookOpen size={24} />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight">Our Mission & Commitment</h2>
              <p className="text-muted-foreground leading-relaxed">
                Education is the strongest catalyst for social and economic growth. Many students struggle due to overcrowded classrooms or a lack of personalized attention, while skilled educators lack accessible avenues to earn income.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Zee Nzeru solves both challenges: providing students with custom tailored 1-on-1 guidance, live digital whiteboards, and seamless local payments (Airtel Money, TNM Mpamba, Bank Transfer).
              </p>

              <div className="space-y-3 pt-2">
                {[
                  'Rigorous 4-step tutor identity & qualification verification',
                  'Integrated virtual classroom with video, audio & whiteboard',
                  'Instant scheduling and automated lesson reminders',
                  'Transparent rating and feedback system for all sessions',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-3xl overflow-hidden border border-border bg-gradient-to-br from-emerald-500/10 to-teal-500/20 p-8 sm:p-12 space-y-6 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
                <Award size={20} />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Why Zee Nzeru?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "Nzeru" means wisdom and knowledge. We built this platform to build a resilient, smart, and empowered learning community where every student receives the dedicated coaching needed to excel in national examinations and higher education.
              </p>
              <div className="p-4 rounded-xl bg-background/80 backdrop-blur border border-border space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Built for Malawi & Regional Learners</p>
                <p className="text-xs text-muted-foreground">Supported across desktop, tablet, and low-bandwidth mobile connections.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE VALUES ──────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-accent/40 border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight">Our Core Values</h2>
            <p className="text-muted-foreground text-sm">The principles that guide our product, platform, and community.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-bold text-base">{v.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{v.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ───────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center">
        <div className="mx-auto max-w-4xl px-4 space-y-6">
          <GraduationCap size={44} className="mx-auto opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-black">Ready to elevate your learning?</h2>
          <p className="text-emerald-100 max-w-xl mx-auto text-sm sm:text-base">
            Join thousands of students and tutors today. Book your first session or apply as a tutor in minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Button size="lg" variant="secondary" className="rounded-xl font-bold text-emerald-950" asChild>
              <Link href="/?auth=signup">Get Started Now</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl border-white/30 text-white hover:bg-white/10" asChild>
              <Link href="/contact">Contact Support</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
