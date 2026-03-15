'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, BookOpen, ArrowRight, ArrowLeft,
  Mail, Lock, User, Phone, Eye, EyeOff, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

type Role = 'student' | 'tutor';

const ROLE_CARDS: {
  role: Role; icon: React.ElementType; label: string; desc: string;
  perks: string[]; gradient: string; ring: string; check: string;
}[] = [
  {
    role:     'student',
    icon:     BookOpen,
    label:    "I'm a Student",
    desc:     'Find a tutor and grow your skills',
    perks:    ['Browse verified tutors', 'Book sessions instantly', 'Pay with mobile money'],
    gradient: 'from-sky-500 to-blue-600',
    ring:     'ring-sky-400',
    check:    'bg-sky-500',
  },
  {
    role:     'tutor',
    icon:     GraduationCap,
    label:    "I'm a Tutor",
    desc:     'Share your expertise and earn income',
    perks:    ['Set your own rates', 'Keep 82.5% per session', 'Get a verified badge'],
    gradient: 'from-emerald-500 to-teal-600',
    ring:     'ring-emerald-400',
    check:    'bg-emerald-500',
  },
];

const slide = {
  enter: (d: number) => ({ x: d > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit:  (d: number) => ({ x: d > 0 ? -50 : 50, opacity: 0, transition: { duration: 0.2 } }),
};

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onClose: () => void;
}

export function SignupForm({ onSwitchToLogin, onClose }: SignupFormProps) {
  const { signup } = useAuth();
  const { toast }  = useToast();
  const router     = useRouter();

  const [step,      setStep]      = useState<1 | 2>(1);
  const [dir,       setDir]       = useState(1);
  const [role,      setRole]      = useState<Role | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [errors,    setErrors]    = useState<{
    fullName?: string; email?: string; password?: string; general?: string;
  }>({});

  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phoneNumber: '',
  });
  const set = (f: Partial<typeof form>) => setForm((p) => ({ ...p, ...f }));

  const goStep2 = () => { if (!role) return; setDir(1); setStep(2); };
  const goBack  = () => { setDir(-1); setStep(1); setErrors({}); };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.fullName.trim())
      e.fullName = 'Full name is required';
    if (!form.email)
      e.email = 'Email is required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email))
      e.email = 'Enter a valid email address';
    if (!form.password)
      e.password = 'Password is required';
    else if (form.password.length < 6)
      e.password = 'Must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !validate()) return;
    setErrors({});
    setLoading(true);
    const result = await signup({ ...form, role });
    setLoading(false);

    if (!result.success) {
      const msg = result.error ?? '';
      if (msg.includes('already registered') || msg.includes('unique'))
        setErrors({ email: 'An account with this email already exists.' });
      else if (msg.includes('invalid email') || msg.includes('valid email'))
        setErrors({ email: 'Please enter a valid email address.' });
      else if (msg.includes('password'))
        setErrors({ password: result.error });
      else
        setErrors({ general: result.error ?? 'Something went wrong. Please try again.' });
      return;
    }

    onClose();
    if (role === 'student') {
      toast({ title: 'Account created!', description: 'Check your email to verify your account.' });
      router.push('/auth/verify');
    } else {
      toast({ title: 'Account created!', description: 'Complete your profile to start teaching.' });
      router.push('/tutor/onboarding');
    }
  };

  return (
    <div className="overflow-hidden">

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex gap-1.5">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                s === step ? 'w-6 bg-emerald-500' : s < step ? 'w-4 bg-emerald-300' : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-1">Step {step} of 2</span>
      </div>

      <AnimatePresence mode="wait" custom={dir}>

        {/* ── Step 1: Role picker ── */}
        {step === 1 && (
          <motion.div key="step1" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
            <div className="mb-5">
              <p className="text-base font-bold text-gray-900">Create your account</p>
              <p className="text-sm text-gray-500 mt-0.5">Who are you joining as?</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {ROLE_CARDS.map(({ role: r, icon: Icon, label, desc, perks, gradient, ring, check }) => {
                const selected = role === r;
                return (
                  <motion.button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative text-left p-4 rounded-2xl border-2 transition-all duration-200 bg-white ${
                      selected
                        ? `border-transparent ring-2 ${ring} shadow-md`
                        : 'border-gray-200 hover:border-gray-300 shadow-sm'
                    }`}
                  >
                    {selected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute top-2.5 right-2.5 w-5 h-5 ${check} rounded-full flex items-center justify-center`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 mb-3 leading-relaxed">{desc}</p>
                    <div className="space-y-1">
                      {perks.map((perk) => (
                        <div key={perk} className="flex items-center gap-1.5">
                          <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${gradient}`} />
                          <span className="text-[11px] text-gray-500">{perk}</span>
                        </div>
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              type="button"
              onClick={goStep2}
              disabled={!role}
              whileHover={{ scale: role ? 1.015 : 1 }}
              whileTap={{ scale: role ? 0.985 : 1 }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Continue as {role === 'student' ? 'Student' : role === 'tutor' ? 'Tutor' : '…'}
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            <p className="text-center text-sm text-gray-600 mt-4">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Sign in
              </button>
            </p>
          </motion.div>
        )}

        {/* ── Step 2: Details form ── */}
        {step === 2 && (
          <motion.div key="step2" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
            {/* Back + title */}
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={goBack}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <div>
                <p className="text-base font-bold text-gray-900">
                  {role === 'student' ? 'Student details' : 'Tutor details'}
                </p>
                <p className="text-xs text-gray-500">Fill in your information below</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">

              {/* General error */}
              {errors.general && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl"
                >
                  <span className="text-red-500 shrink-0 text-sm mt-0.5">⚠</span>
                  <p className="text-sm text-red-700">{errors.general}</p>
                </motion.div>
              )}

              {/* Full name */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => { set({ fullName: e.target.value }); setErrors((p) => ({ ...p, fullName: undefined })); }}
                    placeholder="Your full name"
                    required
                    autoComplete="name"
                    className={`w-full pl-9 pr-4 py-2 rounded-xl border text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      errors.fullName ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-emerald-500'
                    }`}
                  />
                </div>
                {errors.fullName && <p className="text-xs text-red-500">⚠ {errors.fullName}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => { set({ email: e.target.value }); setErrors((p) => ({ ...p, email: undefined })); }}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className={`w-full pl-9 pr-4 py-2 rounded-xl border text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      errors.email ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-emerald-500'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500">⚠ {errors.email}</p>}
              </div>

              {/* Phone — optional */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) => set({ phoneNumber: e.target.value })}
                    placeholder="+265 99 000 0000"
                    autoComplete="tel"
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => { set({ password: e.target.value }); setErrors((p) => ({ ...p, password: undefined })); }}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`w-full pl-9 pr-10 py-2 rounded-xl border text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      errors.password ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {/* Strength bar */}
                {form.password.length > 0 && (
                  <div className="flex gap-1 pt-0.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-colors ${
                          form.password.length >= i * 3
                            ? form.password.length >= 10 ? 'bg-emerald-500'
                              : form.password.length >= 6 ? 'bg-amber-400'
                              : 'bg-red-400'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                )}
                {errors.password && <p className="text-xs text-red-500">⚠ {errors.password}</p>}
              </div>

              {/* Contextual info box */}
              <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
                role === 'tutor'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  : 'bg-sky-50 border-sky-100 text-sky-700'
              }`}>
                {role === 'tutor'
                  ? <GraduationCap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  : <Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                <span>
                  {role === 'tutor'
                    ? "You'll upload your credentials next. Verification takes 24–48 hours."
                    : "We'll email you a confirmation link to activate your account."}
                </span>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.015 }}
                whileTap={{ scale: loading ? 1 : 0.985 }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating account…
                  </>
                ) : (
                  <>
                    Create {role === 'student' ? 'Student' : 'Tutor'} Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}