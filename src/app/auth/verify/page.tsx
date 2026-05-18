'use client';

import { useState, useEffect } from 'react';
import { GraduationCap, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

const COOLDOWN_SECONDS = 60;

export default function VerifyPage() {
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown]       = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const resendEmail = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      toast({ variant: 'destructive', title: 'Session expired', description: 'Please sign up again.' });
      setIsResending(false);
      return;
    }

    const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
    setIsResending(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to resend', description: error.message });
    } else {
      toast({ title: 'Email sent!', description: 'Check your inbox and spam folder.' });
      setCooldown(COOLDOWN_SECONDS);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

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
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription className="text-base mt-2">
              We&apos;ve sent you a verification link. Click it to activate your account and get started.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
              <p>✉️ Check your inbox and spam folder</p>
              <p>🔗 Click the verification link in the email</p>
              <p>⏱️ The link expires in 24 hours</p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={resendEmail}
              disabled={cooldown > 0 || isResending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
              {isResending
                ? 'Sending…'
                : cooldown > 0
                ? `Resend in ${cooldown}s`
                : 'Resend verification email'}
            </Button>

            <p className="text-center text-sm text-gray-500">
              Wrong email?{' '}
              <a href="/" className="text-emerald-600 hover:underline">
                Go back and sign up again
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}