'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Paychangu redirects here with ?tx_ref=xxx&status=successful|failed

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const txRef  = searchParams.get('tx_ref');
  const status = searchParams.get('status'); // 'successful' or 'failed'

  const [state,     setState]     = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message,   setMessage]   = useState('');

  useEffect(() => {
    if (!txRef) { setState('failed'); setMessage('No transaction reference found.'); return; }
    if (status === 'failed') { setState('failed'); setMessage('Payment was cancelled or failed.'); return; }

    // Verify with our server
    fetch('/api/payments/paychangu/verify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ txRef }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setState('success');
          setSessionId(data.sessionId);
        } else {
          setState('failed');
          setMessage(data.message ?? 'Payment verification failed.');
        }
      })
      .catch(() => {
        setState('failed');
        setMessage('Could not verify payment. Please contact support.');
      });
  }, [txRef, status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Zee Nzeru
          </span>
        </div>

        {/* State */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-4"
        >
          {state === 'verifying' && (
            <>
              <Loader2 className="w-12 h-12 text-emerald-500 mx-auto animate-spin" />
              <p className="text-lg font-semibold text-gray-900">Verifying payment…</p>
              <p className="text-sm text-gray-500">Please wait while we confirm your payment.</p>
            </>
          )}

          {state === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
              </motion.div>
              <p className="text-xl font-bold text-gray-900">Payment Successful!</p>
              <p className="text-sm text-gray-500">
                Your session is now active. You can join the classroom.
              </p>
              <div className="space-y-2 pt-2">
                {sessionId && (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => router.push(`/student/sessions/${sessionId}`)}
                  >
                    Join Session Now
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/student/sessions')}
                >
                  View My Sessions
                </Button>
              </div>
            </>
          )}

          {state === 'failed' && (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto" />
              <p className="text-xl font-bold text-gray-900">Payment Failed</p>
              <p className="text-sm text-gray-500">{message}</p>
              <div className="space-y-2 pt-2">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => router.push('/student/sessions')}
                >
                  Back to Sessions
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/student/tutors')}
                >
                  Find a Tutor
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    }>
      <PaymentReturnContent />
    </Suspense>
  );
}