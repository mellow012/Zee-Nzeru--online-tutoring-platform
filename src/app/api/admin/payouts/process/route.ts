import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Reusable admin auth check 
async function requireAdmin() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 }) };
  }

  return { supabase, user };
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, error: authError } = await requireAdmin();
    if (authError) return authError;

    const { paymentId, tutorMobileNumber } = await request.json();
    
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
    }

    // 1. Fetch the payment record to ensure it is held and valid
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, sessions(status, subject)')
      .eq('id', paymentId)
      .in('status', ['held', 'ready_for_payout'])
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Valid held payment not found' }, { status: 404 });
    }

    if (payment.sessions.status !== 'completed') {
      return NextResponse.json({ error: 'Session must be completed before payout' }, { status: 400 });
    }

    // 2. Call Paychangu Transfer API (Option A Implementation)
    // NOTE: This assumes standard Paychangu payout API structure. Check exact docs if sandbox changes.
    const paychanguRes = await fetch('https://api.paychangu.com/transfer', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: String(payment.tutor_payout),
        currency: payment.currency || 'MWK',
        account_number: tutorMobileNumber || '000000000', // The tutor's TNM/Airtel number
        account_bank: 'MOBILE_MONEY', 
        narration: `Payout for session ${payment.sessions.subject}`,
        reference: `PAYOUT-${payment.id}-${Date.now()}`
      }),
    });

    const transferData = await paychanguRes.json();

    if (!paychanguRes.ok || transferData.status !== 'success') {
      console.error('[admin/payouts] Paychangu transfer error:', transferData);
      return NextResponse.json(
        { error: transferData.message ?? 'Payout transfer failed' },
        { status: 502 }
      );
    }

    // 3. Mark payment as released in DB
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        payout_reference: transferData.data?.reference || `PAYOUT-${payment.id}`
      })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    // 4. Notify Tutor
    await supabase.from('notifications').insert({
      user_id: payment.tutor_id,
      type: 'payout_released',
      title: 'Payment Released',
      message: `Your payout of ${payment.currency} ${payment.tutor_payout} for ${payment.sessions.subject} has been sent to your mobile wallet.`,
      action_url: `/tutor/earnings`,
    });

    return NextResponse.json({ success: true, message: 'Payout successfully processed' });

  } catch (error: any) {
    console.error('[admin/payouts] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
