import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const peerId = searchParams.get('peerId');
    const isAdmin = searchParams.get('admin') === 'true';

    let query = supabase.from('messages').select(`
      id, sender_id, recipient_id, session_id, body, created_at, is_read
    `).order('created_at', { ascending: true });

    if (isAdmin) {
      // Admin gets all messages ordered by latest
      query = supabase.from('messages').select(`
        id, sender_id, recipient_id, session_id, body, created_at, is_read
      `).order('created_at', { ascending: false }).limit(200);
    } else if (peerId) {
      // Get conversation between user and peerId
      query = query.or(`and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`);
    } else {
      // Just return user's recent messages to build contact list
      query = query.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Collect all unique user IDs from messages to fetch profiles
    const userIds = new Set<string>();
    for (const msg of data ?? []) {
      if (msg.sender_id) userIds.add(msg.sender_id);
      if (msg.recipient_id) userIds.add(msg.recipient_id);
    }

    const profileMap = new Map<string, any>();
    if (userIds.size > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', Array.from(userIds));
        
      for (const p of profilesData ?? []) {
        profileMap.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url });
      }
    }

    // Attach sender and receiver to messages
    const messagesWithProfiles = (data ?? []).map(msg => ({
      ...msg,
      sender: profileMap.get(msg.sender_id) || null,
      receiver: profileMap.get(msg.recipient_id) || null
    }));

    let contacts: any[] = [];
    if (!peerId && !isAdmin) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('student_id, tutor_id')
        .or(`student_id.eq.${user.id},tutor_id.eq.${user.id}`);

      const peerIds = new Set<string>();
      for (const s of sessions ?? []) {
        if (s.student_id && s.student_id !== user.id) peerIds.add(s.student_id);
        if (s.tutor_id && s.tutor_id !== user.id) peerIds.add(s.tutor_id);
      }

      // Also add peers from existing messages (recipient/sender)
      for (const msg of data ?? []) {
        const peer = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        if (peer && peer !== user.id) peerIds.add(peer);
      }

      if (peerIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', Array.from(peerIds));
        contacts = profiles ?? [];
      }
    }

    return NextResponse.json({ messages: messagesWithProfiles, contacts });
  } catch (err: any) {
    console.error('Messages GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { receiverId, content } = await request.json();
    if (!receiverId || !content) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

    const { data, error } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: receiverId,
      body: content,
      is_read: false
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, message: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
