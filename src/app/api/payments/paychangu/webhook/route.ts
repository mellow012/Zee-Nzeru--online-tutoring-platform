import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Paychangu sends a POST to this URL on payment events
// Enable webhooks in your Paychangu dashboard and point to:
// https://yourdomain.com/api/payments/webhook

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[webhook/paychangu] received:', JSON.stringify(body));

    const { tx_ref, status } = body;
    if (!tx_ref) return NextResponse.json({ received: true });

    // Only process successful payments
    if (status !== 'success') return NextResponse.json({ received: true });

    const supabase = await createClient();

    const { data: payment } = await supabase
      .from('payments')
      .select('id, session_id, tutor_id, status')
      .eq('payment_gateway_id', tx_ref)
      .single();

    // Already processed
    if (!payment || payment.status === 'held') {
      return NextResponse.json({ received: true });
    }

    const now = new Date().toISOString();

    await supabase
      .from('payments')
      .update({ status: 'held', held_at: now, paid_at: now })
      .eq('id', payment.id);

    await supabase
      .from('sessions')
      .update({ status: 'in_progress', actual_start_time: now })
      .eq('id', payment.session_id);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook/paychangu] error:', err);
    // Always return 200 to Paychangu so it doesn't retry
    return NextResponse.json({ received: true });
  }
}