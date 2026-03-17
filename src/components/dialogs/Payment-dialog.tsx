'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  CreditCard, Shield, Calendar, Clock,
  BookOpen, ArrowRight, Loader2, ExternalLink,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useToast } from '@/hooks/use-toast';
import type { Session } from '@/lib/types';

interface PaymentDialogProps {
  session: Session | null;
  open: boolean;
  onClose: () => void;
  onPayment?: () => void; // called if we ever handle inline (currently unused)
}

export function PaymentDialog({ session, open, onClose }: PaymentDialogProps) {
  const { toast }  = useToast();
  const [loading, setLoading] = useState(false);

  if (!session) return null;

  const durationHours =
    (new Date(session.scheduled_end_time).getTime() -
     new Date(session.scheduled_start_time).getTime()) / 3_600_000;

  const handlePay = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/payments/paychangu/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId: session.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        toast({
          variant:     'destructive',
          title:       'Payment failed to start',
          description: data.error ?? 'Please try again.',
        });
        setLoading(false);
        return;
      }

      // Redirect to Paychangu hosted checkout
      // The return_url in our API route will bring the student back to /payments/return
      window.location.href = data.checkoutUrl;

    } catch {
      toast({ variant: 'destructive', title: 'Network error', description: 'Please try again.' });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <VisuallyHidden><DialogTitle>Pay for session</DialogTitle></VisuallyHidden>

        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Pay for Session</p>
              <p className="text-xs text-muted-foreground">Powered by Paychangu</p>
            </div>
          </div>

          {/* Session summary */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
            <div className="flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className="text-sm font-semibold">{session.subject}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-semibold">
                  {format(new Date(session.scheduled_start_time), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Time · Duration</p>
                <p className="text-sm font-semibold">
                  {format(new Date(session.scheduled_start_time), 'h:mm a')} ·{' '}
                  {durationHours}h
                </p>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Session fee</p>
              <p className="text-xl font-black text-emerald-600">
                MWK {session.price.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Payment methods note */}
          <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 rounded-xl border border-blue-100">
            <ExternalLink className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              You&apos;ll be redirected to Paychangu&apos;s secure checkout where you can pay with
              <strong> Airtel Money, TNM Mpambho, or card</strong>.
            </p>
          </div>

          {/* Escrow note */}
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700">
              Payment held in escrow — released to tutor only after session completes.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cancel
            </Button>
            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              onClick={handlePay}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Redirecting…</>
              ) : (
                <>Pay MWK {session.price.toLocaleString()} <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </div>

          <p className="text-[10px] text-center text-gray-400">
            You will be redirected to Paychangu&apos;s secure payment page.
            After payment you will be brought back automatically.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}