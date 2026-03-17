import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Called from the /payments/return page after Paychangu redirects back
// Verifies the transaction and updates session + payment status

export async function POST(request: NextRequest) {
  try {
    const { txRef } = await request.json();
    if (!txRef) {
      return NextResponse.json({ error: 'tx_ref required' }, { status: 400 });
    }

    // Verify with Paychangu
    const verifyRes = await fetch(`https://api.paychangu.com/verify-payment/${txRef}`, {
      method:  'GET',
      headers: {
        'Accept':        'application/json',
        'Authorization': `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
      },
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok) {
      console.error('[payments/verify] Paychangu verify error:', verifyData);
      return NextResponse.json({ error: 'Verification failed', status: 'failed' }, { status: 502 });
    }

    const txStatus = verifyData.data?.status;

    if (txStatus !== 'success') {
      return NextResponse.json({
        success: false,
        status:  txStatus ?? 'failed',
        message: verifyData.data?.message ?? 'Payment was not successful',
      });
    }

    // Payment confirmed — update our DB
    const supabase = await createClient();

    // Find the payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('id, session_id, student_id, tutor_id')
      .eq('payment_gateway_id', txRef)
      .single();

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Update payment status to 'held' (escrow — released after session completes)
    await supabase
      .from('payments')
      .update({
        status:   'held',
        held_at:  now,
        paid_at:  now,
      })
      .eq('id', payment.id);

    // Update session status to 'in_progress'
    await supabase
      .from('sessions')
      .update({
        status:            'in_progress',
        actual_start_time: now,
      })
      .eq('id', payment.session_id);

    // Notify tutor
    await supabase.from('notifications').insert({
      user_id:    payment.tutor_id,
      type:       'payment_received',
      title:      'Session Payment Received',
      message:    'Student has paid for the session. The session is now in progress.',
      session_id: payment.session_id,
      action_url: `/tutor/sessions`,
    });

    return NextResponse.json({
      success:   true,
      status:    'success',
      sessionId: payment.session_id,
    });

  } catch (err: any) {
    console.error('[payments/verify] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}