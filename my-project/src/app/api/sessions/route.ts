import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  return { supabase, user };
}

export async function GET() {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error) return error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    let query = supabase
      .from('sessions')
      .select(`*, profiles!sessions_tutor_id_fkey(*), tutor_profiles(*), profiles!sessions_student_id_fkey(*)`)
      .order('scheduled_start_time', { ascending: true });

    if (profile?.role === 'tutor') query = query.eq('tutor_id', user.id);
    else if (profile?.role === 'student') query = query.eq('student_id', user.id);
    // admin gets all — no filter

    const { data: sessions, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error) return error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'student') {
      return NextResponse.json({ success: false, error: 'Only students can book sessions' }, { status: 403 });
    }

    const { tutorId, subject, scheduledStartTime, scheduledEndTime } = await request.json();

    if (!tutorId || !subject || !scheduledStartTime || !scheduledEndTime) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
    }

    const { data: tutorProfile } = await supabase
      .from('tutor_profiles')
      .select('hourly_rate')
      .eq('user_id', tutorId)
      .single();

    if (!tutorProfile) {
      return NextResponse.json({ success: false, error: 'Tutor not found' }, { status: 404 });
    }

    const hours = (new Date(scheduledEndTime).getTime() - new Date(scheduledStartTime).getTime()) / (1000 * 60 * 60);
    const price = hours * tutorProfile.hourly_rate;

    const { data: session, error: insertError } = await supabase
      .from('sessions')
      .insert({
        tutor_id: tutorId,
        student_id: user.id,
        subject,
        scheduled_start_time: scheduledStartTime,
        scheduled_end_time: scheduledEndTime,
        price,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await supabase.from('notifications').insert({
      user_id: tutorId,
      type: 'booking',
      title: 'New Booking Request',
      message: `New booking request from ${profile.full_name} for ${subject}`,
      session_id: session.id,
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, error } = await requireAuth();
    if (error) return error;

    const { sessionId, status } = await request.json();

    if (!sessionId || !status) {
      return NextResponse.json({ success: false, error: 'Session ID and status are required' }, { status: 400 });
    }

    const { data: session, error: updateError } = await supabase
      .from('sessions')
      .update({ status })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}