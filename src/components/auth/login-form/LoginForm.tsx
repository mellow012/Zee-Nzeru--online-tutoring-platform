'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

const ROLE_HOME: Record<string, string> = {
  student: '/student',
  tutor:   '/tutor',
  admin:   '/admin',
};

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onClose: () => void;
}

export function LoginForm({ onSwitchToSignup, onClose }: LoginFormProps) {
  const { login } = useAuth();
  const { toast } = useToast();
  const router    = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<{
    email?: string; password?: string; general?: string;
  }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email)
      e.email = 'Email is required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(email))
      e.email = 'Enter a valid email address';
    if (!password)
      e.password = 'Password is required';
    else if (password.length < 6)
      e.password = 'Must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast({ title: 'Welcome back!' });
      onClose();
      router.push(ROLE_HOME[result.role ?? 'student'] ?? '/student');
    } else {
      const msg = result.error ?? '';
      if (msg.includes('Invalid login') || msg.includes('invalid_credentials'))
        setErrors({ general: 'Incorrect email or password. Please try again.' });
      else if (msg.includes('Email not confirmed'))
        setErrors({ general: 'Please verify your email first. Check your inbox.' });
      else if (msg.includes('Too many'))
        setErrors({ general: 'Too many attempts. Please wait a few minutes.' });
      else
        setErrors({ general: result.error ?? 'Something went wrong. Please try again.' });
    }
  };

  return (
    <div className="space-y-1">
      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
          <GraduationCap size={18} className="text-white" />
        </div>
        <div>
          <p className="text-base font-bold text-gray-900">Welcome back</p>
          <p className="text-xs text-gray-500">Sign in to your Zee Nzeru account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">

        {/* General error banner */}
        {errors.general && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl"
          >
            <span className="text-red-500 shrink-0 text-sm mt-0.5">⚠</span>
            <p className="text-sm text-red-700">{errors.general}</p>
          </motion.div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined, general: undefined })); }}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                errors.email ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-emerald-500'
              }`}
            />
          </div>
          {errors.email && <p className="text-xs text-red-500">⚠ {errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined, general: undefined })); }}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className={`w-full pl-10 pr-11 py-2.5 rounded-xl border text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                errors.password ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-emerald-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500">⚠ {errors.password}</p>}
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.015 }}
          whileTap={{ scale: loading ? 1 : 0.985 }}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-md shadow-emerald-100 text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all mt-1"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Signing in…
            </>
          ) : (
            <>Sign In <ArrowRight className="w-4 h-4" /></>
          )}
        </motion.button>
      </form>

      <div className="flex items-center gap-3 py-3">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">OR</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <p className="text-center text-sm text-gray-600 pb-1">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          Create one free
        </button>
      </p>
    </div>
  );
}