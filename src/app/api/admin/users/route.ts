import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

// GET - Get all users or stats (admin only)
export async function GET(request: NextRequest) {
  try {
    const { supabase, error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'stats') {
      const [
        { count: totalStudents },
        { count: totalTutors },
        { count: verifiedTutors },
        { count: totalSessions },
        { count: pendingVerifications },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'tutor'),
        supabase.from('tutor_profiles').select('*', { count: 'exact', head: true }).eq('verified', true),
        supabase.from('sessions').select('*', { count: 'exact', head: true }),
        supabase.from('tutor_profiles').select('*', { count: 'exact', head: true }).eq('verified', false),
      ]);

      return NextResponse.json({
        success: true,
        stats: { totalStudents, totalTutors, verifiedTutors, totalSessions, pendingVerifications },
      });
    }

    // Get all users with their tutor profiles
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        *,
        tutor_profiles (*)
      `)
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    return NextResponse.json({ success: true, users });

  } catch (error) {
    console.error('Admin get users error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Verify/unverify a tutor (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const { supabase, error } = await requireAdmin();
    if (error) return error;

    const { tutorId, verified } = await request.json();

    const { data: updatedTutor, error: updateError } = await supabase
      .from('tutor_profiles')
      .update({ 
        verified,
        verified_at: verified ? new Date().toISOString() : null,
      })
      .eq('user_id', tutorId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create notification for tutor
    await supabase.from('notifications').insert({
      user_id: tutorId,
      type: 'verification',
      title: verified ? 'Profile Verified!' : 'Verification Revoked',
      message: verified
        ? 'Congratulations! Your tutor profile has been verified.'
        : 'Your tutor verification has been revoked.',
    });

    return NextResponse.json({ success: true, tutor: updatedTutor });

  } catch (error) {
    console.error('Admin verify tutor error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}