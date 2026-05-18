'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, CheckCircle2, Clock, Search, Loader2, ArrowUpRight, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  tutor_payout: number;
  status: string;
  created_at: string;
  payment_gateway_id: string;
  student: { full_name: string } | null;
  session: { subject: string } | null;
}

interface TutorEarningsClientProps {
  initialPayments: PaymentRow[];
  initialPhoneNumber: string | null;
}

export function TutorEarningsClient({ initialPayments, initialPhoneNumber }: TutorEarningsClientProps) {
  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || '');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Calculations
  const pendingEscrow = payments
    .filter(p => p.status === 'held')
    .reduce((acc, p) => acc + (p.tutor_payout || 0), 0);

  const availableBalance = payments
    .filter(p => p.status === 'ready_for_payout')
    .reduce((acc, p) => acc + (p.tutor_payout || 0), 0);

  const requestedBalance = payments
    .filter(p => p.status === 'payout_requested')
    .reduce((acc, p) => acc + (p.tutor_payout || 0), 0);

  const totalEarned = payments
    .filter(p => p.status === 'released')
    .reduce((acc, p) => acc + (p.tutor_payout || 0), 0);

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast({ variant: 'destructive', title: 'Phone number required' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tutor/earnings/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: phoneNumber }),
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        toast({ title: 'Withdrawal requested!', description: 'Your funds are being processed by admin.' });
        setWithdrawOpen(false);
        // Optimistically update statuses locally
        const updated = payments.map(p => {
          if (p.status === 'ready_for_payout') {
            return { ...p, status: 'payout_requested' };
          }
          return p;
        });
        setPayments(updated);
      } else {
        toast({ variant: 'destructive', title: 'Request failed', description: data.error });
      }
    } catch (err) {
      setIsSubmitting(false);
      toast({ variant: 'destructive', title: 'Request failed', description: 'Network error occurred.' });
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Earnings & Payouts</h1>
          <p className="text-slate-500 mt-1">Track your escrow balances and request mobile money withdrawals.</p>
        </div>
        {availableBalance > 0 && (
          <Button
            onClick={() => setWithdrawOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md px-5 gap-1.5 h-10 transition-all duration-200 self-start md:self-auto"
          >
            <ArrowUpRight className="w-4 h-4" /> Withdraw Available Funds
          </Button>
        )}
      </div>

      {/* Balance Boards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Released */}
        <div className="bg-emerald-50/50 p-6 rounded-2xl flex items-center gap-5 border border-emerald-100/80 shadow-sm">
          <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Withdrawn</p>
            <p className="text-2xl font-bold text-emerald-950 mt-1">MWK {totalEarned.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Settled to Mobile Wallet</p>
          </div>
        </div>

        {/* Available */}
        <div className="bg-indigo-50/50 p-6 rounded-2xl flex items-center gap-5 border border-indigo-100/80 shadow-sm relative group">
          <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">Available for Payout</p>
            <p className="text-2xl font-bold text-indigo-950 mt-1">MWK {availableBalance.toLocaleString()}</p>
            <p className="text-[10px] text-indigo-700 font-medium mt-0.5">Completed & withdrawable</p>
          </div>
        </div>

        {/* Escrow & Requested */}
        <div className="bg-amber-50/50 p-6 rounded-2xl flex items-center gap-5 border border-amber-100/80 shadow-sm">
          <div className="p-4 bg-amber-100 text-amber-600 rounded-full">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Escrow & Processing</p>
            <p className="text-2xl font-bold text-amber-950 mt-1">
              MWK {(pendingEscrow + requestedBalance).toLocaleString()}
            </p>
            <p className="text-[10px] text-amber-700 font-medium mt-0.5">
              Escrow: MWK {pendingEscrow.toLocaleString()} | Requested: MWK {requestedBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Ledger Card */}
      <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
          <CardTitle className="text-slate-800 text-lg font-semibold">Payout Ledger</CardTitle>
          <CardDescription className="text-slate-500">Your complete history of transaction settlements and escrow lifecycle.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 flex flex-col items-center">
              <Search className="w-12 h-12 text-slate-300 mb-3 opacity-60" />
              <p className="text-sm font-medium">No earnings history found.</p>
              <p className="text-xs text-slate-400 mt-1">Earned payouts will list here once class bookings are paid.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold text-xs uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3.5 font-semibold text-xs uppercase tracking-wider">Session</th>
                    <th className="px-6 py-3.5 font-semibold text-xs uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3.5 font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3.5 font-semibold text-xs uppercase tracking-wider text-right">Your Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                        {format(new Date(p.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-700">{p.session?.subject || 'Tutoring Session'}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        {p.student?.full_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        {p.status === 'released' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200/50 shadow-sm gap-1 py-1 px-2.5 text-[10px] font-semibold"><CheckCircle2 className="w-3 h-3"/> Released</Badge>
                        ) : p.status === 'payout_requested' ? (
                          <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200/50 shadow-sm gap-1 py-1 px-2.5 text-[10px] font-semibold animate-pulse"><Clock className="w-3 h-3"/> Payout Requested</Badge>
                        ) : p.status === 'ready_for_payout' ? (
                          <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border border-indigo-200/50 shadow-sm gap-1 py-1 px-2.5 text-[10px] font-semibold"><Smartphone className="w-3 h-3"/> Available to Withdraw</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 bg-slate-50/50 border-slate-200 shadow-sm gap-1 py-1 px-2.5 text-[10px] font-medium"><Clock className="w-3 h-3"/> Held in Escrow</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800 text-sm">
                        {p.currency} {p.tutor_payout ? p.tutor_payout.toLocaleString() : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Request Modal */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-[400px] border border-slate-200 rounded-2xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-5 h-5 text-indigo-600" /> Withdraw Funds
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Transfer your available balances directly to Airtel Money or TNM Mpamba.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleWithdrawalRequest} className="space-y-4 py-3">
            <div className="bg-indigo-50/50 p-4 border border-indigo-100 rounded-xl">
              <span className="text-xs font-semibold text-indigo-800 block">Total Withdrawble Amount</span>
              <span className="text-2xl font-bold text-indigo-950 mt-1 block">MWK {availableBalance.toLocaleString()}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Mobile Money Number</Label>
              <Input
                type="tel"
                placeholder="e.g. +265 888 12 34 56"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-10 text-sm border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
              />
              <span className="text-[10px] text-slate-400 block leading-normal">
                Supports Airtel (+265 99...) and TNM Mpamba (+265 88...) prefixes. Paychangu will disburse automatically based on your prefix.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setWithdrawOpen(false)} className="h-9 text-xs rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} size="sm" className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-4 gap-1 shadow-sm">
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                {isSubmitting ? 'Requesting...' : 'Request Withdrawal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
