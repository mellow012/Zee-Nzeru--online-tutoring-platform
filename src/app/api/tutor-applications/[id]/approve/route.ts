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


// ─── POST /api/tutor-applications/[id]/approve ───────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id: applicationId } = await params;

  // 1. Fetch the application
  const { data: app, error: fetchError } = await auth.supabase
    .from('tutor_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (fetchError || !app) {
    return NextResponse.json(
      { success: false, error: 'Application not found' },
      { status: 404 }
    );
  }

  if (app.status === 'approved') {
    return NextResponse.json(
      { success: false, error: 'Application already approved' },
      { status: 400 }
    );
  }

  try {
    // 2. Use admin client to create the tutor account via invite
    const adminSupabase = createAdminClient();

    const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
      app.email,
      {
        data: {
          role: 'tutor',
          full_name: app.full_name,
          phone_number: app.phone_number,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/auth/callback`,
      }
    );

    let userId = inviteData?.user?.id;

    if (inviteError) {
      // If user already exists, we need to find their ID to promote them
      if (inviteError.message.includes('already been registered')) {
        const { data: existingId } = await adminSupabase.rpc('get_user_id_by_email', {
          lookup_email: app.email,
        });
        userId = existingId;
      } else {
        console.error('[Approve] invite error:', inviteError);
        return NextResponse.json(
          { success: false, error: `Invite failed: ${inviteError.message}` },
          { status: 500 }
        );
      }
    }


    // 3. Create profiles + tutor_profiles rows (using admin client to bypass RLS)
    if (userId) {
      // Create the base profile
      await adminSupabase.from('profiles').upsert({
        user_id: userId,
        role: 'tutor',
        full_name: app.full_name,
        phone_number: app.phone_number,
        is_active: true,
      }, { onConflict: 'user_id' });

      // Create the tutor profile with application data
      await adminSupabase.from('tutor_profiles').upsert({
        user_id: userId,
        subjects: app.subjects ?? [],
        hourly_rate: 0,
        currency: 'MWK',
        experience_years: app.experience_years ?? 0,
        education_background: app.education_background,
        bio: app.bio,
        verification_documents: app.verification_documents ?? [],
        verification_status: 'approved',
        verified: true,
        verified_at: new Date().toISOString(),
        reviewed_by: auth.adminId,
        reviewed_at: new Date().toISOString(),
        rating: 0,
        total_sessions: 0,
        completed_sessions: 0,
        languages: ['English'],
      }, { onConflict: 'user_id' });
    }

    // 4. Update the application status
    const { error: updateError } = await auth.supabase
      .from('tutor_applications')
      .update({
        status: 'approved',
        reviewed_by: auth.adminId,
        reviewed_at: new Date().toISOString(),
        invite_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('[Approve] update error:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    // 5. Notify the Applicant
    if (userId) {
      await createNotification({
        userId: userId,
        type: 'tutor_approved',
        title: 'Application Approved!',
        message: 'Welcome! Your tutor account is now active. You can now access the tutor dashboard.',
        actionUrl: '/tutor',
        actionLabel: 'Go to Dashboard',
      });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[Approve] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message ?? 'Unexpected error' },
      { status: 500 }
    );
  }
}
