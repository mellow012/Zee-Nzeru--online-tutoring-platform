'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, XCircle, LogOut, RefreshCw } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';

export default function TutorRejectedPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReason = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tp } = await supabase
        .from('tutor_profiles')
        .select('rejection_reason, verification_status')
        .eq('user_id', user.id)
        .single();

      // If they somehow got here but aren't rejected, redirect appropriately
      if (tp?.verification_status === 'approved') {
        router.push('/tutor');
        return;
      }
      if (tp?.verification_status === 'pending') {
        router.push('/tutor/pending');
        return;
      }

      setRejectionReason(tp?.rejection_reason ?? null);
      setLoading(false);
    };

    fetchReason();
  }, [supabase, router]);

  const handleResubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Reset status back to not_submitted so they can go through onboarding again
    await supabase
      .from('tutor_profiles')
      .update({
        verification_status: 'not_submitted',
        verification_documents: [],
        rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq('user_id', user.id);

    router.push('/tutor/onboarding');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
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
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-2xl">Verification Unsuccessful</CardTitle>
            <p className="text-gray-500 text-sm mt-2">
              Unfortunately, we were unable to verify your account at this time.
            </p>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {/* Rejection reason */}
            {rejectionReason ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800 mb-1">Reason from our team:</p>
                <p className="text-sm text-red-700">{rejectionReason}</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Our team did not provide a specific reason. Please ensure your documents are clear, 
                  valid, and match the information in your profile.
                </p>
              </div>
            )}

            {/* What to do next */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">To resubmit, make sure you have:</p>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  A clear, legible photo of your National ID or Passport
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  All four corners of the document visible in the photo
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  Qualification documents that match your stated education background
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  Files in JPG, PNG, or PDF format (max 10MB each)
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={handleResubmit}
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Resubmit Documents
              </Button>

              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={async () => { await logout(); router.push('/'); }}
              >
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>

            <p className="text-center text-xs text-gray-400">
              Still having trouble?{' '}
              <a href="mailto:support@zeenzeru.com" className="text-emerald-600 hover:underline">
                Contact our support team
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}