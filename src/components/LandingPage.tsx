'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring, AnimatePresence, type Variants } from 'framer-motion';
import Link from 'next/link';
import {
  GraduationCap, Star, Users, BookOpen, CheckCircle,
  ArrowRight, Play, Zap, Shield, Clock, Globe,
  ChevronRight, Quote, Sparkles, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.7 } },
};

const stagger = (delay = 0.1) => ({
  visible: { transition: { staggerChildren: delay } },
});

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ target, suffix = '', prefix = '' }: {
  target: number; suffix?: string; prefix?: string;
}) {
  const ref   = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const mv    = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) mv.set(target);
  }, [inView, target, mv]);

  useEffect(() => {
    return spring.on('change', (v) => setDisplay(Math.round(v)));
  }, [spring]);

  return (
    <span ref={ref}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}

// ─── Floating orb ─────────────────────────────────────────────────────────────

function Orb({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-30 pointer-events-none ${className}`}
      animate={{
        y:     [0, -30, 0],
        scale: [1, 1.08, 1],
      }}
      transition={{
        duration: 7 + delay,
        repeat:   Infinity,
        ease:     'easeInOut',
        delay,
      }}
    />
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ children, className = '' }: {
  children: React.ReactNode; className?: string;
}) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger(0.12)}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Typewriter ───────────────────────────────────────────────────────────────

const HEADLINES = [
  'Find Your Perfect Tutor.',
  'Ace Your Exams.',
  'Learn At Your Pace.',
  'Unlock Your Potential.',
];

function Typewriter() {
  const [idx, setIdx]   = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const full    = HEADLINES[idx];
    const timeout = deleting
      ? setTimeout(() => {
          setText((t) => t.slice(0, -1));
          if (text.length === 1) { setDeleting(false); setIdx((i) => (i + 1) % HEADLINES.length); }
        }, 40)
      : setTimeout(() => {
          setText(full.slice(0, text.length + 1));
          if (text.length === full.length - 1) setTimeout(() => setDeleting(true), 1800);
        }, 70);
    return () => clearTimeout(timeout);
  }, [text, deleting, idx]);

  return (
    <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
      {text}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        className="inline-block w-[3px] h-[0.9em] bg-emerald-500 ml-1 align-middle rounded-full"
      />
    </span>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, title, desc, color }: {
  icon: React.ElementType; title: string; desc: string; color: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className="group p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-default"
    >
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ num, title, desc, active }: {
  num: string; title: string; desc: string; active?: boolean;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ scale: 1.02 }}
      className={`relative p-6 rounded-2xl border transition-all duration-300 ${
        active
          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-transparent text-white shadow-xl shadow-emerald-200'
          : 'bg-white border-gray-100 shadow-sm'
      }`}
    >
      <div className={`text-4xl font-black mb-4 leading-none ${
        active ? 'text-white/20' : 'text-emerald-100'
      }`}>
        {num}
      </div>
      <h3 className={`font-bold text-lg mb-2 ${active ? 'text-white' : 'text-gray-900'}`}>
        {title}
      </h3>
      <p className={`text-sm leading-relaxed ${active ? 'text-white/80' : 'text-gray-500'}`}>
        {desc}
      </p>
    </motion.div>
  );
}

// ─── Tutor card ───────────────────────────────────────────────────────────────

function TutorCard({ name, subject, rating, sessions, initials, color }: {
  name: string; subject: string; rating: number;
  sessions: number; initials: string; color: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -8, transition: { duration: 0.25 } }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500">{subject}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-semibold">{rating}</span>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-50">
        <span>{sessions} sessions</span>
        <span className="flex items-center gap-1 text-emerald-600 font-medium">
          View Profile <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </motion.div>
  );
}

// ─── Testimonial ──────────────────────────────────────────────────────────────

function Testimonial({ quote, name, role, initials }: {
  quote: string; name: string; role: string; initials: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4"
    >
      <Quote className="w-7 h-7 text-emerald-200 shrink-0" />
      <p className="text-gray-700 text-sm leading-relaxed flex-1">{quote}</p>
      <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function LandingPage({ onLogin, onSignup }: LandingPageProps) {
  const [activeStep, setActiveStep] = useState(0);

  // Cycle active step
  useEffect(() => {
    const t = setInterval(() => setActiveStep((s) => (s + 1) % 3), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center bg-white overflow-hidden">
        {/* Background orbs */}
        <Orb className="w-[600px] h-[600px] bg-emerald-400 -top-32 -right-48" delay={0} />
        <Orb className="w-[400px] h-[400px] bg-teal-400 bottom-0 -left-32"    delay={2} />
        <Orb className="w-[300px] h-[300px] bg-emerald-300 top-1/2 left-1/2"   delay={4} />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)',
            backgroundSize:  '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium mb-8"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Malawi&apos;s #1 Online Tutoring Platform
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.05] tracking-tight mb-6"
          >
            <Typewriter />
            <br />
            <span className="text-gray-900">Start Today.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Connect with verified expert tutors in Malawi for one-on-one live sessions.
            Primary school, secondary, university, or professional — we have you covered.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onSignup}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-2xl shadow-xl shadow-emerald-200 hover:shadow-emerald-300 transition-shadow text-base"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onLogin}
              className="flex items-center gap-2 px-8 py-4 bg-white text-gray-700 font-semibold rounded-2xl border border-gray-200 hover:border-emerald-300 hover:text-emerald-600 transition-colors text-base shadow-sm"
            >
              <Play className="w-4 h-4" /> Sign In
            </motion.button>
          </motion.div>

          {/* Floating stat bubbles */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="relative flex items-center justify-center gap-4 flex-wrap"
          >
            {[
              { label: 'Verified Tutors',  value: '200+',  icon: GraduationCap },
              { label: 'Sessions Done',    value: '5,000+',icon: BookOpen      },
              { label: 'Happy Students',   value: '1,200+',icon: Users         },
              { label: 'Avg. Rating',      value: '4.9 ★', icon: Star          },
            ].map(({ label, value, icon: Icon }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.1 }}
                whileHover={{ y: -4 }}
                className="flex items-center gap-2.5 px-5 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-base font-bold text-gray-900 leading-none">{value}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border-2 border-gray-300 flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-2 bg-gray-400 rounded-full" />
          </motion.div>
          <p className="text-xs text-gray-400">Scroll to explore</p>
        </motion.div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────────── */}
      <Section className="py-16 bg-gradient-to-r from-emerald-500 to-teal-600">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { label: 'Students Taught',  target: 1200, suffix: '+' },
              { label: 'Expert Tutors',    target: 200,  suffix: '+'  },
              { label: 'Subjects Covered', target: 40,   suffix: '+'  },
              { label: 'Sessions Monthly', target: 800,  suffix: '+'  },
            ].map(({ label, target, suffix }) => (
              <motion.div key={label} variants={fadeUp}>
                <p className="text-4xl font-black mb-1">
                  <AnimatedCounter target={target} suffix={suffix} />
                </p>
                <p className="text-emerald-100 text-sm font-medium">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <Section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-3 block">
              How It Works
            </span>
            <h2 className="text-4xl font-black text-gray-900">
              Up and running in <span className="text-emerald-500">3 steps</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              num="01"
              title="Create Your Account"
              desc="Sign up in seconds. Tell us if you're a student looking to learn or a tutor ready to teach."
              active={activeStep === 0}
            />
            <StepCard
              num="02"
              title="Find Your Tutor"
              desc="Browse verified tutors by subject, rate, and availability. Read reviews from real students."
              active={activeStep === 1}
            />
            <StepCard
              num="03"
              title="Start Learning"
              desc="Book a session, pay securely, and join your live virtual classroom. It's that simple."
              active={activeStep === 2}
            />
          </div>
        </div>
      </Section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <Section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-3 block">
              Platform Features
            </span>
            <h2 className="text-4xl font-black text-gray-900">
              Everything you need to <span className="text-emerald-500">succeed</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={Zap}
              title="Live Video Sessions"
              desc="High-quality video calls with interactive whiteboard, screen sharing, and real-time chat."
              color="bg-gradient-to-br from-emerald-400 to-teal-500"
            />
            <FeatureCard
              icon={Shield}
              title="Verified Tutors"
              desc="Every tutor is manually reviewed and credential-checked before they can accept bookings."
              color="bg-gradient-to-br from-blue-400 to-indigo-500"
            />
            <FeatureCard
              icon={Clock}
              title="Flexible Scheduling"
              desc="Book sessions that fit your life. Morning, evening, weekends — tutors set their own hours."
              color="bg-gradient-to-br from-amber-400 to-orange-500"
            />
            <FeatureCard
              icon={Globe}
              title="Mobile Money Payments"
              desc="Pay with Airtel Money, TNM Mpampho, or card. Funds held in escrow until session is complete."
              color="bg-gradient-to-br from-purple-400 to-fuchsia-500"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Progress Tracking"
              desc="Track your learning journey with session history, completed milestones, and tutor notes."
              color="bg-gradient-to-br from-rose-400 to-pink-500"
            />
            <FeatureCard
              icon={BookOpen}
              title="Shared Materials"
              desc="Tutors can upload study notes, exercises, and resources directly in the classroom."
              color="bg-gradient-to-br from-teal-400 to-cyan-500"
            />
          </div>
        </div>
      </Section>

      {/* ── FEATURED TUTORS ──────────────────────────────────────────────────── */}
      <Section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div variants={fadeUp} className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-3 block">
                Top Tutors
              </span>
              <h2 className="text-4xl font-black text-gray-900">
                Meet our <span className="text-emerald-500">experts</span>
              </h2>
            </div>
            <motion.button
              whileHover={{ x: 4 }}
              onClick={onSignup}
              className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm hover:gap-2.5 transition-all"
            >
              Browse all tutors <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <TutorCard
              name="Dr. Sarah Banda"
              subject="Mathematics & Physics"
              rating={4.9}
              sessions={312}
              initials="SB"
              color="bg-gradient-to-br from-emerald-400 to-teal-500"
            />
            <TutorCard
              name="Emmanuel Phiri"
              subject="Chemistry & Biology"
              rating={4.8}
              sessions={198}
              initials="EP"
              color="bg-gradient-to-br from-blue-400 to-indigo-500"
            />
            <TutorCard
              name="Grace Tembo"
              subject="English Literature"
              rating={5.0}
              sessions={156}
              initials="GT"
              color="bg-gradient-to-br from-rose-400 to-pink-500"
            />
            <TutorCard
              name="James Mwale"
              subject="Computer Science"
              rating={4.9}
              sessions={241}
              initials="JM"
              color="bg-gradient-to-br from-amber-400 to-orange-500"
            />
          </div>
        </div>
      </Section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */}
      <Section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-3 block">
              Student Stories
            </span>
            <h2 className="text-4xl font-black text-gray-900">
              Real results from <span className="text-emerald-500">real students</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Testimonial
              quote="I was really struggling with Calculus in my first year at university. After just 6 sessions with Dr. Banda, everything clicked. My grades went from a D to a B+."
              name="Chimwemwe Nkosi"
              role="University Student, Blantyre"
              initials="CN"
            />
            <Testimonial
              quote="The platform is so easy to use. I found a Chemistry tutor, booked a session the same day, and paid with Airtel Money. No hassle at all."
              name="Tadala Mseka"
              role="University Fresher, Lilongwe"
              initials="TM"
            />
            <Testimonial
              quote="As a tutor, Zee Nzeru has transformed my income. I now earn consistently every month and the verification process makes students trust me immediately."
              name="Mr. Kondwani Phiri"
              role="Verified Tutor, Physics"
              initials="KP"
            />
          </div>
        </div>
      </Section>

      {/* ── FOR TUTORS ───────────────────────────────────────────────────────── */}
      <Section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp}>
              <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-4 block">
                For Tutors
              </span>
              <h2 className="text-4xl font-black text-gray-900 mb-6 leading-tight">
                Turn your knowledge into
                <span className="text-emerald-500"> consistent income</span>
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                Join hundreds of qualified tutors earning from their expertise.
                Set your own schedule, set your own rates, teach from anywhere.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  'Keep 82.5% of every session fee',
                  'Get paid via mobile money or bank transfer',
                  'Build your reputation with verified reviews',
                  'Access session materials and whiteboard tools',
                ].map((point) => (
                  <div key={point} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-gray-700 text-sm">{point}</span>
                  </div>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={onSignup}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-200 text-sm"
              >
                Apply as a Tutor <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>

            {/* Visual card stack */}
            <motion.div variants={fadeUp} className="relative h-72 hidden lg:block">
              {[
                { top: '0%',   left: '5%',  label: 'MWK 85,000',   sub: 'Earned this month',   color: 'from-emerald-500 to-teal-600', text: 'text-white' },
                { top: '20%',  left: '20%', label: '47 Sessions',  sub: 'Completed all time',  color: 'from-white to-gray-50',        text: 'text-gray-900', border: true },
                { top: '42%',  left: '10%', label: '4.9 ★ Rating', sub: 'From 38 reviews',     color: 'from-white to-gray-50',        text: 'text-gray-900', border: true },
              ].map(({ top, left, label, sub, color, text, border }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, zIndex: 10 }}
                  className={`absolute w-52 p-4 rounded-2xl bg-gradient-to-br ${color} ${border ? 'border border-gray-100 shadow-md' : 'shadow-xl shadow-emerald-200'}`}
                  style={{ top, left }}
                >
                  <p className={`text-xl font-black ${text}`}>{label}</p>
                  <p className={`text-xs mt-0.5 ${text === 'text-white' ? 'text-white/70' : 'text-gray-500'}`}>{sub}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <Section className="py-24 bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 relative overflow-hidden">
        <Orb className="w-[500px] h-[500px] bg-white -top-32 -right-32" delay={0} />
        <Orb className="w-[300px] h-[300px] bg-teal-300 bottom-0 left-0"  delay={3} />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.div variants={fadeUp}>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
              Ready to transform
              <br />your learning journey?
            </h2>
            <p className="text-emerald-100 text-lg mb-10 max-w-xl mx-auto">
              Join thousands of students and tutors already on Zee Nzeru.
              Your first session is just a few clicks away.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={onSignup}
                className="px-8 py-4 bg-white text-emerald-700 font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-shadow text-base"
              >
                Start for Free
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={onLogin}
                className="px-8 py-4 bg-white/10 text-white font-bold rounded-2xl border border-white/30 hover:bg-white/20 transition-colors backdrop-blur-sm text-base"
              >
                Sign In
              </motion.button>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <GraduationCap size={16} className="text-white" />
              </div>
              <span className="font-bold text-white text-lg">Zee Nzeru</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/about"   className="hover:text-white transition-colors">About</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
              <span className="text-gray-600">|</span>
              <span className="text-xs">© {new Date().getFullYear()} Zee Nzeru. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}