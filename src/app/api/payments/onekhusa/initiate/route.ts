import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Only confirmed or pending sessions can be paid
    if (!['confirmed', 'pending'].includes(session.status)) {
      return NextResponse.json({ error: 'Session is not in a payable state' }, { status: 400 });
    }

    // Check if already paid (held or released)
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('session_id', sessionId)
      .in('status', ['held', 'released'])
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json({ error: 'Session already paid' }, { status: 400 });
    }

    // Fetch student profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const fullName = profile?.full_name ?? 'Student';
    const cleanSessionId = sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const txRef = `ZN${cleanSessionId}${Date.now()}`;
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
        organisationId: process.env.ONEKHUSA_ORGANISATION_ID || 'CFU3IMWI4KLH',
        merchantAccountNumber: parseInt(process.env.ONEKHUSA_MERCHANT_ACCOUNT || '0', 10),
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      console.error('[payments/onekhusa/initiate] Token error:', errData);
      return NextResponse.json({ error: 'Failed to authenticate with payment gateway' }, { status: 502 });
    }

    const tokenData = await tokenRes.json();
    const access_token = tokenData.data?.accessToken ||
      tokenData.data?.access_token ||
      tokenData.accessToken ||
      tokenData.access_token ||
      tokenData.data?.token ||
      tokenData.token;

    if (!access_token) {
      console.error('[payments/onekhusa/initiate] Token not found in response:', tokenData);
      return NextResponse.json({ error: 'Failed to authenticate with payment gateway' }, { status: 502 });
    }

    // 2. Initiate Request To Pay
    const rtpRes = await fetch(`${baseUrl}/collections/requestToPay/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
        'X-Idempotency-Key': txRef,
        'Accept-Language': 'en',
      },
      body: JSON.stringify({
        merchantAccountNumber: parseInt(process.env.ONEKHUSA_MERCHANT_ACCOUNT || '0', 10),
        transactionAmount: session.price,
        transactionDescription: `${session.subject} session`,
        referenceNumber: txRef,
        capturedBy: 'quantumbyteslab012@gmail.com', // Must be the registered sandbox merchant user
      }),
    });

    if (!rtpRes.ok) {
      const errData = await rtpRes.text();
      console.error('[payments/onekhusa/initiate] RTP error:', errData);
      return NextResponse.json({ error: 'Failed to initiate payment collection' }, { status: 502 });
    }

    const rtpData = await rtpRes.json();

    // OneKhusa returns timedAccountNumber in the response root or data sub-object
    const tan = rtpData.timedAccountNumber || rtpData.TimedAccountNumber || rtpData.data?.timedAccountNumber || rtpData.data?.TimedAccountNumber;

    if (!tan) {
      console.error('[payments/onekhusa/initiate] No TAN returned:', rtpData);
      return NextResponse.json({ error: 'No Timed Account Number (TAN) generated' }, { status: 502 });
    }

    // Create a pending payment record in our DB
    const platformFeePercent = 17.5;
    const platformFee = (session.price * platformFeePercent) / 100;
    const tutorPayout = session.price - platformFee;

    await supabase.from('payments').insert({
      session_id: sessionId,
      student_id: user.id,
      tutor_id: session.tutor_id,
      amount: session.price,
      currency: session.currency ?? 'MWK',
      platform_fee_percentage: platformFeePercent,
      platform_fee: platformFee,
      tutor_payout: tutorPayout,
      status: 'pending',
      payment_method: 'mobile_money',
      payment_gateway: 'onekhusa',
      payment_gateway_id: txRef,
    });

    return NextResponse.json({
      success: true,
      tan,
      txRef,
      expiresIn: 900 // 15 minutes in seconds
    });

  } catch (err: any) {
    console.error('[payments/onekhusa/initiate] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
