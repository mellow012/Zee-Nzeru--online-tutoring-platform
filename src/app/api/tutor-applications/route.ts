import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') return null;
  return { supabase, adminId: user.id };
}

// ─── GET /api/tutor-applications?status=pending ──────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let q = auth.supabase
    .from('tutor_applications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (status && status !== 'all') {
    q = q.eq('status', status);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, applications: data ?? [] });
}
