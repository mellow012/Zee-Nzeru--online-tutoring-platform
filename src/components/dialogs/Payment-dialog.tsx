'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  CreditCard, Shield, Calendar, Clock,
  BookOpen, ArrowRight, Loader2, Copy, CheckCircle2,
  AlertCircle, Building, Smartphone, ExternalLink
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
}

export function PaymentDialog({ session, open, onClose }: PaymentDialogProps) {
  const { toast }  = useToast();
  const router = useRouter();
  const [step, setStep] = useState<'init' | 'paying_onekhusa' | 'paying_paychangu' | 'success'>('init');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  const [tan, setTan] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('15:00');
  const [selectedMethod, setSelectedMethod] = useState<'paychangu' | 'onekhusa' | null>(null);

  useEffect(() => {
    if (open) {
      setStep('init');
      setTan(null);
      setTxRef(null);
      setExpiresAt(null);
      setLoading(false);
      setVerifying(false);
      setSelectedMethod(null);
    }
  }, [open]);

  useEffect(() => {
    let interval: number | undefined;

    if (step === 'paying_onekhusa' && expiresAt) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const diff = expiresAt - now;
        
        if (diff <= 0) {
          setTimeLeft('00:00');
          if (interval) window.clearInterval(interval);
          toast({ variant: 'destructive', title: 'Payment Expired', description: 'The Timed Account Number has expired.' });
          setStep('init');
        } else {
          const m = Math.floor(diff / 60000).toString().padStart(2, '0');
          const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
          setTimeLeft(`${m}:${s}`);
        }
      }, 1000);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [step, expiresAt, toast]);

  if (!session) return null;

  const durationHours =
    (new Date(session.scheduled_end_time).getTime() -
     new Date(session.scheduled_start_time).getTime()) / 3_600_000;

  const handleInitiate = async () => {
    if (!selectedMethod) return;
    setLoading(true);

    if (selectedMethod === 'paychangu') {
      try {
        const res = await fetch('/api/payments/paychangu/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        });
        const data = await res.json();

        if (!res.ok || !data.checkoutUrl) {
          toast({
            variant: 'destructive',
            title: 'Payment failed to start',
            description: data.error ?? 'Please try again.',
          });
          setLoading(false);
          return;
        }

        setTxRef(data.txRef);
        // Open checkout URL in a popup window
        window.open(data.checkoutUrl, '_blank');
        setStep('paying_paychangu');
        setLoading(false);
      } catch {
        toast({ variant: 'destructive', title: 'Network error', description: 'Please try again.' });
        setLoading(false);
      }
    } else {
      try {
        const res = await fetch('/api/payments/onekhusa/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        });
        const data = await res.json();

        if (!res.ok || !data.tan) {
          toast({
            variant: 'destructive',
            title: 'Payment failed to start',
            description: data.error ?? 'Please try again.',
          });
          setLoading(false);
          return;
        }

        setTan(data.tan);
        setTxRef(data.txRef);
        setExpiresAt(Date.now() + (data.expiresIn * 1000 || 900000));
        setStep('paying_onekhusa');
        setLoading(false);
      } catch {
        toast({ variant: 'destructive', title: 'Network error', description: 'Please try again.' });
        setLoading(false);
      }
    }
  };

  const handleVerify = async () => {
    if (!txRef) return;
    setVerifying(true);
    try {
      const endpoint = selectedMethod === 'paychangu' 
        ? '/api/payments/paychangu/verify' 
        : '/api/payments/onekhusa/verify';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txRef }),
      });
      const data = await res.json();

      if (data.success && data.status === 'success') {
        setStep('success');
      } else {
        toast({
          title: 'Payment not received yet',
          description: selectedMethod === 'paychangu'
            ? 'Complete the payment in the opened tab before verifying.'
            : 'Please ensure you have sent the money to the provided TAN.',
        });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Verification error', description: 'Could not reach the server.' });
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = () => {
    if (tan) {
      navigator.clipboard.writeText(tan);
      toast({ title: 'Copied to clipboard', description: 'TAN copied. You can paste it in your banking app.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <VisuallyHidden><DialogTitle>Pay for session</DialogTitle></VisuallyHidden>

        <AnimatePresence mode="wait">
          {step === 'init' && (
            <motion.div
              key="init"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Pay for Session</p>
                  <p className="text-xs text-muted-foreground">Select how you want to pay</p>
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

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Select Payment Option</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Instant Mobile Pay Card */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMethod('paychangu')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                      selectedMethod === 'paychangu'
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2 shrink-0">
                      <Smartphone className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-900 leading-tight">Instant Mobile Money</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Airtel / TNM PIN prompt</span>
                  </motion.button>

                  {/* Bank Transfer Card */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMethod('onekhusa')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                      selectedMethod === 'onekhusa'
                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2 shrink-0">
                      <Building className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-900 leading-tight">Manual Bank Transfer</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Pay via Virtual TAN Account</span>
                  </motion.button>
                </div>
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
                  whileHover={{ scale: (loading || !selectedMethod) ? 1 : 1.02 }}
                  whileTap={{ scale: (loading || !selectedMethod) ? 1 : 0.98 }}
                  onClick={handleInitiate}
                  disabled={loading || !selectedMethod}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
                  ) : (
                    <>Pay MWK {session.price.toLocaleString()} <ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 'paying_paychangu' && (
            <motion.div
              key="paying_paychangu"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 py-4 text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-xl text-gray-900">Awaiting Instant Payment</h3>
                <p className="text-sm text-gray-500 px-4">
                  We opened the secure billing portal in a new tab. Enter your phone number there to receive the PIN prompt on your phone!
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-left space-y-3">
                <p className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Instructions:</p>
                <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside">
                  <li>Enter your Airtel Money / TNM Mpamba phone number on the checkout screen.</li>
                  <li>Unlock your phone and enter your Mobile Wallet PIN to authorize the transaction.</li>
                  <li>Click the button below as soon as you complete the payment.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleVerify} 
                  disabled={verifying}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-semibold"
                >
                  {verifying ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying...</> : 'I Have Completed Payment'}
                </Button>
                <Button variant="ghost" onClick={() => setStep('init')} disabled={verifying} className="w-full text-gray-500">
                  Go Back
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'paying_onekhusa' && (
            <motion.div
              key="paying_onekhusa"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 py-2"
            >
              <div className="text-center space-y-2">
                <h3 className="font-bold text-xl text-gray-900">Complete Bank Transfer</h3>
                <p className="text-sm text-gray-500 px-4">
                  Send <strong className="text-emerald-600">MWK {session.price.toLocaleString()}</strong> to the Timed Account Number below using your bank app or mobile wallet.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Timed Account Number (TAN)</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl font-black text-gray-900 tracking-widest font-mono">{tan}</span>
                  <button onClick={copyToClipboard} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-900">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-200">
                  <Clock className="w-3.5 h-3.5" /> Expires in {timeLeft}
                </div>
              </div>

              {/* Custom step-by-step instructions */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-left space-y-3">
                <p className="font-bold text-xs text-muted-foreground uppercase tracking-wider">How to Pay:</p>
                <ol className="text-xs text-gray-600 space-y-2.5 list-decimal list-inside">
                  <li>Log in to your Malawian banking application (National Bank, Standard Bank, FDH, etc.) or MNO app.</li>
                  <li>Choose <strong>Transfer Funds</strong> &rarr; <strong>To Mobile Wallet</strong> or <strong>Other Bank</strong>.</li>
                  <li>Select <strong>OneKhusa / Virtual Wallet</strong> as the target institution.</li>
                  <li>Enter the 8-digit TAN <strong className="font-mono text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{tan}</strong> as the Account/Wallet Number.</li>
                  <li>Transfer exactly <strong>MWK {session.price.toLocaleString()}</strong> and complete authentication.</li>
                </ol>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleVerify} 
                  disabled={verifying}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-semibold"
                >
                  {verifying ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying...</> : 'I Have Sent Payment'}
                </Button>
                <Button variant="ghost" onClick={() => setStep('init')} disabled={verifying} className="w-full text-gray-500">
                  Go Back
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-6"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-2xl text-gray-900">Payment Verified!</h3>
                <p className="text-sm text-gray-500">Your session is now active. You can join the classroom.</p>
              </div>
              <Button 
                onClick={() => router.push(`/classroom/${session.id}`)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-semibold shadow-lg shadow-emerald-200"
              >
                Join Classroom
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}