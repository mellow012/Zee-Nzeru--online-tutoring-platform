import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  try {
    const { supabase, error } = await requireAdmin();
    if (error) return error;

    // Fetch all payments that are held or ready for payout
    const { data: payouts, error: fetchError } = await supabase
      .from('payments')
      .select(`
        id, 
        amount, 
        currency, 
        platform_fee, 
        tutor_payout, 
        status, 
        held_at,
        tutor_id,
        sessions (id, subject, status),
        profiles!tutor_id (full_name, phone_number)
      `)
      .in('status', ['held', 'ready_for_payout'])
      .order('held_at', { ascending: false });

    if (fetchError) throw fetchError;

    // We can compute on the backend whether a payment is strictly 'eligible'
    const enrichedPayouts = payouts.map(payment => {
      const sessionData = Array.isArray(payment.sessions) ? payment.sessions[0] : payment.sessions;
      return {
        ...payment,
        is_eligible_now: sessionData && (sessionData as any).status === 'completed'
      };
    });

    return NextResponse.json({ success: true, payouts: enrichedPayouts });

  } catch (err: any) {
    console.error('Admin get payouts error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
