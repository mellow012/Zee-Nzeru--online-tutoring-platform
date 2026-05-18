import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[webhook/onekhusa] received:', JSON.stringify(body));

    // OneKhusa webhook payloads can vary, typically they send:
    // { event: 'payrequest.success', data: { SourceReferenceNumber: '...', status: 'Successful', ... } }
    // We extract the relevant details.
    const event = body.event || body.eventType || body.data?.event || body.data?.eventType || 'payment.success';
    const data = body.data || body;

    const txRef = data.referenceNumber || data.SourceReferenceNumber || data.tx_ref || data.reference || data.payout_reference;
    const status = (data.status || data.transactionStatus || '').toLowerCase();

    console.log(`[webhook/onekhusa] Processing event: "${event}", Reference: "${txRef}"`);

    const supabase = await createClient();
    const now = new Date().toISOString();

    // ─── 1. PAYMENT.SUCCESS (Or default payment collections) ──────────────────
    if (event === 'payment.success' || event === 'payrequest.success') {
      if (!txRef) return NextResponse.json({ received: true });

      const { data: payment } = await supabase
        .from('payments')
        .select('id, session_id, tutor_id, status')
        .eq('payment_gateway_id', txRef)
        .single();

      // Not found or already processed
      if (!payment || payment.status === 'held' || payment.status === 'released') {
        console.log(`[webhook/onekhusa] Payment already processed or not found for ref: ${txRef}`);
        return NextResponse.json({ received: true });
      }

      await supabase
        .from('payments')
        .update({ status: 'held', held_at: now, paid_at: now })
        .eq('id', payment.id);

      await supabase
        .from('sessions')
        .update({ status: 'in_progress', actual_start_time: now })
        .eq('id', payment.session_id);

      // Notify tutor
      await supabase.from('notifications').insert({
        user_id: payment.tutor_id,
        type: 'payment_received',
        title: 'Session Payment Received',
        message: 'Student has paid via OneKhusa. The session is now in progress.',
        session_id: payment.session_id,
        action_url: `/tutor/sessions`,
      });

      console.log(`[webhook/onekhusa] Successfully activated session for payment ref: ${txRef}`);
      return NextResponse.json({ received: true });
    }

    // ─── 2. PAYOUT.SUCCESS (Successful Disbursements) ───────────────────────────
    if (event === 'payout.success') {
      if (!txRef) return NextResponse.json({ received: true });

      // Look up payment by payout_reference or payment_gateway_id
      const { data: payment } = await supabase
        .from('payments')
        .select('id, tutor_id, tutor_payout, currency, sessions(subject)')
        .or(`payout_reference.eq."${txRef}",payment_gateway_id.eq."${txRef}"`)
        .single();

      if (!payment) {
        console.log(`[webhook/onekhusa] No matching payout request found for ref: ${txRef}`);
        return NextResponse.json({ received: true });
      }

      await supabase
        .from('payments')
        .update({
          status: 'released',
          released_at: now,
          payout_reference: txRef
        })
        .eq('id', payment.id);

      const sessionsData = payment.sessions as any;
      const subject = Array.isArray(sessionsData) ? sessionsData[0]?.subject : sessionsData?.subject;

      // Notify Tutor
      await supabase.from('notifications').insert({
        user_id: payment.tutor_id,
        type: 'payout_released',
        title: 'Payment Released',
        message: `Your payout of ${payment.currency} ${payment.tutor_payout} for ${subject || ' tutoring session'} has been sent to your mobile wallet.`,
        action_url: `/tutor/earnings`,
      });

      console.log(`[webhook/onekhusa] Payout confirmed & released for ref: ${txRef}`);
      return NextResponse.json({ received: true });
    }

    // ─── 3. BATCH.RECEIVED (Batch Disbursement Received) ─────────────────────────
    if (event === 'batch.received') {
      console.log(`[webhook/onekhusa] Batch disbursement received event for ref: ${txRef}`);
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook/onekhusa] error:', err);
    // Always return 200 so the gateway doesn't infinitely retry
    return NextResponse.json({ received: true });
  }
}
