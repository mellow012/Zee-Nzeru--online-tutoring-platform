import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wallet, CheckCircle2, Search, ArrowUpRight, Clock, Building } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default async function TutorEarningsPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      currency,
      tutor_payout,
      status,
      created_at,
      payment_gateway_id,
      student:profiles!student_id(full_name),
      session:sessions(subject)
    `)
    .eq('tutor_id', user.id)
    .order('created_at', { ascending: false });

  const validPayments = payments || [];
  
  // Held in escrow (paid by student, but session not completed or money not transferred)
  const pendingEscrow = validPayments
    .filter(p => ['held', 'ready_for_payout'].includes(p.status))
    .reduce((acc, p) => acc + (p.tutor_payout || 0), 0);

  // Funds released to tutor's mobile wallet
  const totalEarned = validPayments
    .filter(p => p.status === 'released')
    .reduce((acc, p) => acc + (p.tutor_payout || 0), 0);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="flex items-start justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Earnings & Payouts</h1>
          <p className="text-muted-foreground mt-2">Manage your escrow balance and view payout history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-50 p-6 rounded-2xl flex items-center gap-5 border border-emerald-100">
          <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full">
            <Wallet className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800">Total Released Earnings</p>
            <p className="text-3xl font-bold text-emerald-900">MWK {totalEarned.toLocaleString()}</p>
            <p className="text-xs text-emerald-700 mt-1">Directly to your Mobile Wallet</p>
          </div>
        </div>
        
        <div className="bg-amber-50 p-6 rounded-2xl flex items-center gap-5 border border-amber-100">
          <div className="p-4 bg-amber-100 text-amber-600 rounded-full">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">Pending Escrow Balance</p>
            <p className="text-3xl font-bold text-amber-900">MWK {pendingEscrow.toLocaleString()}</p>
            <p className="text-xs text-amber-700 mt-1">Awaiting Session Completion</p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle>Payout Ledger</CardTitle>
          <CardDescription>Your complete history of transaction settlements.</CardDescription>
        </CardHeader>
        <CardContent>
          {validPayments.length === 0 ? (
            <div className="text-center py-10 text-gray-500 flex flex-col items-center">
              <Search className="w-10 h-10 text-gray-300 mb-3" />
              <p>No earnings history found.</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Session</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Your Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {validPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                        {format(new Date(p.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{p.session?.subject}</p>
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {p.student?.full_name}
                      </td>
                      <td className="px-4 py-4">
                        {p.status === 'released' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0"><CheckCircle2 className="w-3 h-3 mr-1"/> Released</Badge>
                        ) : ['held', 'ready_for_payout'].includes(p.status) ? (
                          <Badge variant="outline" className="text-amber-600 bg-amber-50 border-0 border-amber-200"><Clock className="w-3 h-3 mr-1"/> Held in Escrow</Badge>
                        ) : (
                          <span className="text-gray-400 capitalize">{p.status}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900">
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
    </div>
  );
}
