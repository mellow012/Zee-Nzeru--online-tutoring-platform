import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { txRef } = await request.json();
    if (!txRef) {
      return NextResponse.json({ error: 'txRef required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Find the payment record
    const { data: payment } = await supabase
      .from('payments')
      .select('id, session_id, student_id, tutor_id, status')
      .eq('payment_gateway_id', txRef)
      .single();

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    if (payment.status === 'held' || payment.status === 'released') {
      return NextResponse.json({ success: true, status: 'success', sessionId: payment.session_id });
    }

    const baseUrl = process.env.NEXT_PUBLIC_ONEKHUSA_BASE_URL ?? 'https://api.onekhusa.com/sandbox/v1';

    // 1. Get OAuth Access Token from OneKhusa using the official /account/getAccessToken endpoint
    const tokenRes = await fetch(`${baseUrl}/account/getAccessToken`, {
      method: 'POST',
      headers: {
        'Accept-Language': 'en',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.ONEKHUSA_CLIENT_ID || '',
        apiSecret: process.env.ONEKHUSA_CLIENT_SECRET || '',
        organisationId: process.env.ONEKHUSA_ORGANISATION_ID || 'FYH0NTVW0DXK',
        merchantAccountNumber: parseInt(process.env.ONEKHUSA_MERCHANT_ACCOUNT || '0', 10),
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ error: 'Verification failed - Auth error' }, { status: 502 });
    }

    const tokenData = await tokenRes.json();
    const access_token = tokenData.data?.accessToken || 
                         tokenData.data?.access_token || 
                         tokenData.accessToken || 
                         tokenData.access_token || 
                         tokenData.data?.token || 
                         tokenData.token;

    if (!access_token) {
      console.error('[payments/onekhusa/verify] Token not found in response:', tokenData);
      return NextResponse.json({ error: 'Verification failed - Auth token error' }, { status: 502 });
    }

    // 2. Verify with OneKhusa
    // Depending on the exact API, usually it's a GET to /collections/status/{txRef} or similar
    const verifyRes = await fetch(`${baseUrl}/collections/status/${txRef}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!verifyRes.ok) {
      const errData = await verifyRes.text();
      console.error('[payments/onekhusa/verify] OneKhusa verify error:', errData);
      return NextResponse.json({ error: 'Verification failed', status: 'failed' }, { status: 502 });
    }

    const verifyData = await verifyRes.json();
    
    // Assume success status is 'Successful' or 'success'
    const txStatus = verifyData.data?.status?.toLowerCase() || verifyData.status?.toLowerCase();

    if (txStatus !== 'success' && txStatus !== 'successful') {
      return NextResponse.json({
        success: false,
        status: txStatus ?? 'pending',
        message: 'Payment is not yet successful',
      });
    }

    // Payment confirmed — update our DB
    const now = new Date().toISOString();

    await supabase
      .from('payments')
      .update({
        status: 'held',
        held_at: now,
        paid_at: now,
      })
      .eq('id', payment.id);

    await supabase
      .from('sessions')
      .update({
        status: 'in_progress',
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
      user_id: payment.tutor_id,
      type: 'payment_received',
      title: 'Session Payment Received',
      message: `Student ${studentName} has paid for the session. The session is now in progress.`,
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
      success: true,
      status: 'success',
      sessionId: payment.session_id,
    });

  } catch (err: any) {
    console.error('[payments/onekhusa/verify] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
