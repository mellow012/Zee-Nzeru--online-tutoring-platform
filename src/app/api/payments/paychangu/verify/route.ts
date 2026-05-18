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

    if (!verifyRes.ok || verifyData.status === 'failed') {
      console.log('[payments/verify] Paychangu transaction is pending/uncompleted:', verifyData);
      return NextResponse.json({
        success: false,
        status: 'pending',
        message: verifyData.message || 'Payment has not been completed yet.',
      });
    }

    const txStatus = verifyData.data?.status;

    if (txStatus !== 'success') {
      return NextResponse.json({
        success: false,
        status:  txStatus ?? 'pending',
        message: verifyData.data?.message ?? 'Payment has not been completed yet.',
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

    // Fetch session details for rich notifications
    const { data: session } = await supabase
      .from('sessions')
      .select('price, currency, subject, tutor:profiles!sessions_tutor_id_fkey(full_name), student:profiles!sessions_student_id_fkey(full_name)')
      .eq('id', payment.session_id)
      .single();

    const subject = session?.subject ?? 'Tutoring Session';
    const tutorName = (session?.tutor as any)?.full_name ?? 'Tutor';
    const studentName = (session?.student as any)?.full_name ?? 'Student';
    const price = session?.price ?? 0;
    const currency = session?.currency ?? 'MWK';

    // Notify tutor
    await supabase.from('notifications').insert({
      user_id:    payment.tutor_id,
      type:       'payment_received',
      title:      'Session Payment Received',
      message:    `Student ${studentName} has paid for the session. The session is now in progress.`,
      session_id: payment.session_id,
      action_url: `/tutor/sessions`,
    });

    // Notify student
    await supabase.from('notifications').insert({
      user_id:    payment.student_id,
      type:       'session_live',
      title:      'Class is Live! 🎥',
      message:    `Your payment is confirmed. Your ${subject} class with ${tutorName} has started.`,
      session_id: payment.session_id,
      action_url: `/classroom/${payment.session_id}`,
    });

    // Notify admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('user_id')
      .in('role', ['admin', 'superadmin']);

    if (admins && admins.length > 0) {
      const adminNotifications = admins.flatMap((adm) => [
        {
          user_id:    adm.user_id,
          type:       'admin_payment_received',
          title:      'Payment Confirmed 💰',
          message:    `Payment of ${currency} ${price.toLocaleString()} from Student ${studentName} received.`,
          session_id: payment.session_id,
          action_url: `/admin/activity`,
        },
        {
          user_id:    adm.user_id,
          type:       'admin_class_started',
          title:      'Class Started 🟢',
          message:    `Tutor ${tutorName} is live with Student ${studentName} for ${subject}.`,
          session_id: payment.session_id,
          action_url: `/admin/activity`,
        }
      ]);
      await supabase.from('notifications').insert(adminNotifications);
    }

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