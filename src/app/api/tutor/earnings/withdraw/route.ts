import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { mobileNumber } = await request.json();
    if (!mobileNumber || !/^(\+265|0)[1-9][0-9]{7,8}$/.test(mobileNumber.replace(/\s+/g, ''))) {
      return NextResponse.json({ success: false, error: 'Invalid Malawian mobile number format' }, { status: 400 });
    }

    // 1. Update the tutor's phone number in their profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ phone_number: mobileNumber })
      .eq('user_id', user.id);

    if (profileError) throw profileError;

    // 2. Fetch all payments that are 'ready_for_payout'
    const { data: payments, error: fetchError } = await supabase
      .from('payments')
      .select('id')
      .eq('tutor_id', user.id)
      .eq('status', 'ready_for_payout');

    if (fetchError) throw fetchError;

    if (!payments || payments.length === 0) {
      return NextResponse.json({ success: false, error: 'No available funds to withdraw' }, { status: 400 });
    }

    const paymentIds = payments.map(p => p.id);

    // 3. Update their status to 'payout_requested'
    const { error: updateError } = await supabase
      .from('payments')
      .update({ status: 'payout_requested' })
      .in('id', paymentIds);

    if (updateError) throw updateError;

    // 4. Create an admin notification
    const totalAmount = payments.length; // just a broadcast log
    await supabase.from('notifications').insert({
      type: 'payout_requested',
      title: 'New Payout Request',
      message: `A tutor has requested settlement of ${payments.length} completed session payment(s) to ${mobileNumber}.`,
      action_url: '/admin/payouts',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Withdrawal error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
