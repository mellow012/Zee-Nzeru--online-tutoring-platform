'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Clock, CheckCircle, Mail, LogOut } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';

const STEPS = [
  { label: 'Account created',   done: true  },
  { label: 'Documents submitted', done: true  },
  { label: 'Admin review',       done: false, active: true },
  { label: 'Profile approved',   done: false },
];

export default function TutorPendingPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });

    // Poll every 30s — handles both approval AND rejection
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tp } = await supabase
        .from('tutor_profiles')
        .select('verification_status')
        .eq('user_id', user.id)
        .single();

      if (tp?.verification_status === 'approved') {
        router.push('/tutor');
      } else if (tp?.verification_status === 'rejected') {
        router.push('/tutor/rejected');
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [supabase, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Zee Nzeru
          </span>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
            </div>
            <CardTitle className="text-2xl">Verification in Progress</CardTitle>
            <p className="text-gray-500 text-sm mt-2">
              Our admin team is reviewing your documents. This usually takes 1–2 business days.
            </p>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {/* Progress steps */}
            <div className="space-y-3">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    step.done
                      ? 'bg-emerald-500 text-white'
                      : step.active
                      ? 'bg-amber-400 text-white animate-pulse'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {step.done
                      ? <CheckCircle className="w-4 h-4" />
                      : <span className="text-xs font-bold">{i + 1}</span>
                    }
                  </div>
                  <span className={`text-sm ${
                    step.done   ? 'text-emerald-700 font-medium line-through decoration-emerald-400' :
                    step.active ? 'text-amber-700 font-medium' :
                    'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                  {step.active && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      In progress
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Email notice */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-emerald-800 flex items-center gap-2">
                <Mail className="w-4 h-4" /> We&apos;ll email you at <span className="font-bold">{userEmail}</span>
              </p>
              <p className="text-xs text-emerald-700">
                Once approved, you&apos;ll be able to set your availability and start accepting bookings.
              </p>
            </div>

            {/* While you wait */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">While you wait, you can:</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Prepare your lesson materials</li>
                <li>Think about your availability schedule</li>
                <li>Browse the platform as a student</li>
              </ul>
            </div>

            <Button
              variant="outline"
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={async () => { await logout(); router.push('/'); }}
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-4">
          This page checks automatically every 30 seconds. You&apos;ll be redirected once a decision is made.
        </p>
      </div>
      <Toaster />
    </div>
  );
}