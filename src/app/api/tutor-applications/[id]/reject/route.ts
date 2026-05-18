import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/app/notifications/actions';


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


// ─── POST /api/tutor-applications/[id]/reject ────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id: applicationId } = await params;

  let reason = '';
  try {
    const body = await request.json();
    reason = body.reason ?? '';
  } catch {
    // No body is fine — reason is optional
  }

  const { error } = await auth.supabase
    .from('tutor_applications')
    .update({
      status: 'rejected',
      rejection_reason: reason || null,
      reviewed_by: auth.adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }


  // 4. Notify the Applicant (if they have an existing account)
  try {
    const adminSupabase = createAdminClient();
    
    // Fetch application to get email
    const { data: app } = await auth.supabase
      .from('tutor_applications')
      .select('email')
      .eq('id', applicationId)
      .single();

    if (app?.email) {
      const { data: userId } = await adminSupabase.rpc('get_user_id_by_email', {
        lookup_email: app.email,
      });

      if (userId) {
        await createNotification({
          userId: userId,
          type: 'tutor_rejected',
          title: 'Application Update',
          message: 'Your tutor application was not approved at this time. You can still use your account as a student.',
        });
      }
    }
  } catch (notifErr) {
    console.error('[Reject] notification error:', notifErr);
  }

  return NextResponse.json({ success: true });

}
