import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── POST /api/sessions ────────────────────────────────────────────────────────
// Creates a new booking request. Called by BookingDialog.
// Security: authenticated student only; validates tutor is verified,
// time range is valid, and there are no scheduling conflicts.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the caller is a student (not a tutor booking themselves)
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!callerProfile || !['student', 'admin'].includes(callerProfile.role)) {
      return NextResponse.json(
        { success: false, error: 'Only students can create bookings' },
        { status: 403 }
      );
    }

    const { tutorId, subject, scheduledStartTime, scheduledEndTime, title, description } =
      await request.json();

    if (!tutorId || !subject || !scheduledStartTime || !scheduledEndTime) {
      return NextResponse.json(
        { success: false, error: 'tutorId, subject, scheduledStartTime, and scheduledEndTime are required' },
        { status: 400 }
      );
    }

    const start = new Date(scheduledStartTime);
    const end = new Date(scheduledEndTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { success: false, error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    if (start < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Cannot book sessions in the past' },
        { status: 400 }
      );
    }

    // Validate tutor exists and is approved
    const { data: tutorProfile } = await supabase
      .from('tutor_profiles')
      .select('hourly_rate, currency, verification_status, verified')
      .eq('user_id', tutorId)
      .single();

    if (!tutorProfile?.verified || tutorProfile.verification_status !== 'approved') {
      return NextResponse.json(
        { success: false, error: 'Tutor is not available for booking' },
        { status: 400 }
      );
    }

    // Check scheduling conflict — tutor must be free in the requested window.
    // PostgREST overlap: a conflict exists if an existing session's start < our end
    // AND its end > our start.
    const { data: conflict } = await supabase
      .from('sessions')
      .select('id')
      .eq('tutor_id', tutorId)
      .in('status', ['pending', 'confirmed'])
      .lt('scheduled_start_time', scheduledEndTime)
      .gt('scheduled_end_time', scheduledStartTime)
      .limit(1)
      .maybeSingle();

    if (conflict) {
      return NextResponse.json(
        { success: false, error: 'Tutor already has a booking in this time slot' },
        { status: 409 }
      );
    }

    // Calculate price: duration (hours) × hourly rate
    const durationHours =
      (end.getTime() - start.getTime()) / 3_600_000;
    const price =
      Math.round(durationHours * (tutorProfile.hourly_rate ?? 0) * 100) / 100;

    const { data: session, error: insertError } = await supabase
      .from('sessions')
      .insert({
        tutor_id: tutorId,
        student_id: user.id,
        subject,
        title: title ?? `${subject} session`,
        description: description ?? null,
        scheduled_start_time: scheduledStartTime,
        scheduled_end_time: scheduledEndTime,
        status: 'pending',
        price,
        currency: tutorProfile.currency ?? 'MWK',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/sessions] insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Notify the tutor — non-blocking, failure shouldn't fail the request
    supabase
      .from('notifications')
      .insert({
        user_id: tutorId,
        type: 'booking_request',
        title: 'New Booking Request',
        message: `New ${subject} session request for ${start.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })} at ${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
        session_id: session.id,
        action_url: '/tutor/requests',
        action_label: 'View Request',
      })
      .then(({ error }) => {
        if (error) console.warn('[POST /api/sessions] notification error:', error.message);
      });

    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/sessions] unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── GET /api/sessions ─────────────────────────────────────────────────────────
// Returns sessions for the current authenticated user (student or tutor view).

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role') ?? 'student';

    let q = supabase
      .from('sessions')
      .select('*')
      .order('scheduled_start_time', { ascending: false })
      .limit(50);

    q = role === 'tutor'
      ? q.eq('tutor_id', user.id)
      : q.eq('student_id', user.id);

    if (status && status !== 'all') q = q.eq('status', status);

    const { data: sessions, error } = await q;
    if (error) throw error;

    return NextResponse.json({ success: true, sessions });
  } catch (err) {
    console.error('[GET /api/sessions] error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}