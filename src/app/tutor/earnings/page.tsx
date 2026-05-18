import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TutorEarningsClient } from '@/components/tutor/TutorEarningsClient';

export const dynamic = 'force-dynamic';

export default async function TutorEarningsPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  const { data: payments } = await supabase
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('phone_number')
    .eq('user_id', user.id)
    .single();

  const validPayments = payments || [];

  return (
    <TutorEarningsClient 
      initialPayments={validPayments as any} 
      initialPhoneNumber={profile?.phone_number || ''} 
    />
  );
}
