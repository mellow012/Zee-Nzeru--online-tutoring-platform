import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

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

    // 1. GET THE ID FIRST
    const sessionId = new URL(request.url).searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });

    // 2. FETCH SESSION FROM SUPABASE
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

    // 3. CHECK AUTHORIZATION
    if (session.tutor_id !== user.id && session.student_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    // 4. NOW GENERATE THE TOKEN (sessionId is now defined and verified)
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE!;
    const channelName = `session_${sessionId}`;
    const uid = 0; 
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600; 
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId, 
      appCertificate, 
      channelName, 
      uid, 
      role, 
      privilegeExpiredTs, 
      privilegeExpiredTs
    );

    return NextResponse.json({
      success: true,
      session,
      classroom: {
        agoraChannel: channelName,
        agoraAppId: appId,
        agoraToken: token,
      },
    });
  } catch (error) {
    console.error('Get classroom error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}