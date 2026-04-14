import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Receipt, CheckCircle2, Search, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default async function StudentPaymentsPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      currency,
      status,
      created_at,
      payment_gateway_id,
      tutor:profiles!tutor_id(full_name),
      session:sessions(subject)
    `)
    .eq('student_id', user.id)
    .order('created_at', { ascending: false });

  const totalSpent = (payments || []).filter(p => ['held', 'released'].includes(p.status)).reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="flex items-start justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment History</h1>
          <p className="text-muted-foreground mt-2">View receipts and track your tutoring expenses.</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-4 border border-blue-100 min-w-[200px]">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800">Total Spent</p>
            <p className="text-2xl font-bold text-blue-900">MWK {totalSpent.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Your all-time transaction history.</CardDescription>
        </CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <div className="text-center py-10 text-gray-500 flex flex-col items-center">
              <Search className="w-10 h-10 text-gray-300 mb-3" />
              <p>No payments found.</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                        {format(new Date(p.created_at), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{p.session?.subject} Session</p>
                        <p className="text-gray-500 text-xs mt-0.5">with {p.tutor?.full_name}</p>
                      </td>
                      <td className="px-4 py-4">
                        {['held', 'released'].includes(p.status) ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0"><CheckCircle2 className="w-3 h-3 mr-1"/> Successful</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 bg-amber-50 border-0 border-amber-200">Pending</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-gray-900">
                        {p.currency} {p.amount.toLocaleString()}
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
