'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Payout {
  id: string;
  amount: number;
  currency: string;
  tutor_payout: number;
  status: string;
  held_at: string;
  is_eligible_now: boolean;
  profiles: {
    full_name: string;
    phone_number: string | null;
  };
  sessions: {
    subject: string;
    status: string;
  };
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const res = await fetch('/api/admin/payouts');
      const data = await res.json();
      if (data.success) {
        setPayouts(data.payouts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const processPayout = async (paymentId: string, phone: string | null) => {
    if (!phone) {
      toast({ title: "Phone Required", description: "Tutor does not have a registered phone number.", variant: "destructive" });
      return;
    }
    setProcessingId(paymentId);
    try {
      const res = await fetch('/api/admin/payouts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, tutorMobileNumber: phone })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: "Payout processed via Paychangu." });
        fetchPayouts(); // refresh list
      } else {
        toast({ title: "Error", description: data.error || "Failed to process payout.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Network error processing payout.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-emerald-500" /></div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tutor Payouts</h1>
          <p className="text-muted-foreground mt-2">Manage session payments in escrow and disburse mobile money to tutors.</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-full">
            <DollarSign className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800">Total Escrow Balance</p>
            <p className="text-2xl font-bold text-emerald-900">
              MWK {payouts.reduce((sum, p) => sum + p.tutor_payout, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Payouts</CardTitle>
          <CardDescription>Only sessions marked as completed are eligible for immediate payout.</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No pending payouts found.</div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Tutor</p>
                      <p className="font-semibold text-gray-900">{payout.profiles?.full_name}</p>
                      <p className="text-xs text-gray-500">{payout.profiles?.phone_number || 'No phone set'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Session</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-gray-900">{payout.sessions?.subject}</span>
                        {payout.is_eligible_now ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none"><CheckCircle className="w-3 h-3 mr-1"/> Completed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 bg-amber-50 border-none"><AlertCircle className="w-3 h-3 mr-1"/> Pending</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-500">Amount Due</p>
                      <p className="text-xl font-bold tracking-tight text-emerald-600">
                        {payout.currency} {payout.tutor_payout.toLocaleString()}
                      </p>
                    </div>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 min-w-32"
                      disabled={!payout.is_eligible_now || processingId === payout.id}
                      onClick={() => processPayout(payout.id, payout.profiles?.phone_number)}
                    >
                      {processingId === payout.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
                      {processingId === payout.id ? "Processing" : "Payout Now"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
