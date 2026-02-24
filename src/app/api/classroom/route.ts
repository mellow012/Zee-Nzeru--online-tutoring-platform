import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  return { supabase, user };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error) return error;

    const sessionId = new URL(request.url).searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });

    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select(`
        *,
        tutor:profiles!sessions_tutor_id_fkey(*, tutor_profiles(*)),
        student:profiles!sessions_student_id_fkey(*),
        materials(*, profiles!materials_uploader_id_fkey(full_name))
      `)
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

    if (session.tutor_id !== user.id && session.student_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not authorized for this session' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      session,
      classroom: {
        agoraChannel: `session_${sessionId}`,
        agoraAppId: process.env.NEXT_PUBLIC_AGORA_APP_ID,
        // Generate real Agora token here when you integrate Agora SDK
      },
    });
  } catch (error) {
    console.error('Get classroom error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error) return error;

    const { sessionId, action, whiteboardData } = await request.json();

    if (!sessionId || !action) {
      return NextResponse.json({ success: false, error: 'Session ID and action required' }, { status: 400 });
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('tutor_id, student_id, actual_start_time')
      .eq('id', sessionId)
      .single();

    if (!session) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

    const isTutor = session.tutor_id === user.id;
    const isStudent = session.student_id === user.id;

    if (!isTutor && !isStudent) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    const now = new Date().toISOString();
    let updateData: Record<string, unknown> = {};

    switch (action) {
      case 'join':
        if (isTutor) {
          updateData.status = 'in_progress';
          if (!session.actual_start_time) updateData.actual_start_time = now;
        }
        break;
      case 'end':
        updateData.actual_end_time = now;
        updateData.status = 'completed';
        break;
      case 'save_whiteboard':
        updateData.session_notes = JSON.stringify(whiteboardData);
        break;
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error('Update classroom error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}