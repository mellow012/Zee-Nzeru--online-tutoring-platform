import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ⚠️ ENV: PAYCHANGU_SECRET_KEY, NEXT_PUBLIC_APP_URL

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, student_id, tutor_id, subject, price, currency, status, scheduled_start_time')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Only the student can pay
    if (session.student_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only confirmed sessions can be paid
    if (!['confirmed', 'pending'].includes(session.status)) {
      return NextResponse.json({ error: 'Session is not in a payable state' }, { status: 400 });
    }

    // Check if already paid
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('session_id', sessionId)
      .in('status', ['held', 'released'])
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json({ error: 'Session already paid' }, { status: 400 });
    }

    // Fetch student profile for name/email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const fullName  = profile?.full_name ?? 'Student';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] ?? 'Student';
    const lastName  = nameParts.slice(1).join(' ') || 'User';

    // Unique transaction reference
    const txRef = `ZN-${sessionId}-${Date.now()}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // Initiate Paychangu Standard Checkout
    const paychanguRes = await fetch('https://api.paychangu.com/payment', {
      method:  'POST',
      headers: {
        'Accept':        'application/json',
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount:       String(session.price),
        currency:     session.currency ?? 'MWK',
        email:        user.email,
        first_name:   firstName,
        last_name:    lastName,
        callback_url: `${appUrl}/api/payments/paychangu/webhook`,
        return_url:   `${appUrl}/payments/return`,
        tx_ref:       txRef,
        customization: {
          title:       'Zee Nzeru — Session Payment',
          description: `${session.subject} session`,
        },
        meta: {
          session_id: sessionId,
          student_id: user.id,
          tutor_id:   session.tutor_id,
        },
      }),
    });

    const paychanguData = await paychanguRes.json();

    if (!paychanguRes.ok || paychanguData.status !== 'success') {
      console.error('[payments/initiate] Paychangu error:', paychanguData);
      return NextResponse.json(
        { error: paychanguData.message ?? 'Payment initiation failed' },
        { status: 502 }
      );
    }

    const checkoutUrl = paychanguData.data?.checkout_url;
    if (!checkoutUrl) {
      return NextResponse.json({ error: 'No checkout URL returned' }, { status: 502 });
    }

    // Create a pending payment record in our DB
    const platformFeePercent = 17.5;
    const platformFee        = (session.price * platformFeePercent) / 100;
    const tutorPayout        = session.price - platformFee;

    await supabase.from('payments').insert({
      session_id:               sessionId,
      student_id:               user.id,
      tutor_id:                 session.tutor_id,
      amount:                   session.price,
      currency:                 session.currency ?? 'MWK',
      platform_fee_percentage:  platformFeePercent,
      platform_fee:             platformFee,
      tutor_payout:             tutorPayout,
      status:                   'pending',
      payment_method:           'mobile_money',
      payment_gateway:          'paychangu',
      payment_gateway_id:       txRef,
    });

    return NextResponse.json({ success: true, checkoutUrl, txRef });

  } catch (err: any) {
    console.error('[payments/initiate] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}