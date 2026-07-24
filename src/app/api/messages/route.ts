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

    // 1. Fetch raw messages cleanly using select('*') to handle DB schema columns safely
    let query = supabase.from('messages').select('*');

    if (isAdmin) {
      query = query.order('created_at', { ascending: false }).limit(200);
    } else if (peerId) {
      query = query
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
    } else {
      query = query
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true });
    }

    let { data: rawMessages, error: msgError } = await query;

    // Fallback query if table uses receiver_id instead of recipient_id
    if (msgError) {
      let fallbackQuery = supabase.from('messages').select('*');
      if (isAdmin) {
        fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).limit(200);
      } else if (peerId) {
        fallbackQuery = fallbackQuery
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });
      } else {
        fallbackQuery = fallbackQuery
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: true });
      }
      const fallbackRes = await fallbackQuery;
      if (!fallbackRes.error) {
        rawMessages = fallbackRes.data;
        msgError = null;
      }
    }

    // Normalize DB columns (handles both recipient_id/receiver_id and body/content)
    const normalizedRawMessages = (rawMessages ?? []).map((m: any) => ({
      id: m.id,
      sender_id: m.sender_id,
      receiver_id: m.recipient_id || m.receiver_id,
      content: m.body || m.content || '',
      created_at: m.created_at,
      is_read: m.is_read ?? false,
    }));

    // Collect all user IDs
    const userIds = new Set<string>();
    for (const m of normalizedRawMessages) {
      if (m.sender_id) userIds.add(m.sender_id);
      if (m.receiver_id) userIds.add(m.receiver_id);
    }

    // Contacts from active sessions
    const { data: sessions } = await supabase
      .from('sessions')
      .select('student_id, tutor_id')
      .or(`student_id.eq.${user.id},tutor_id.eq.${user.id}`);

    for (const s of sessions ?? []) {
      if (s.student_id && s.student_id !== user.id) userIds.add(s.student_id);
      if (s.tutor_id && s.tutor_id !== user.id) userIds.add(s.tutor_id);
    }

    // Candidate contacts for starting new chats
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, role')
      .neq('user_id', user.id)
      .limit(50);

    for (const p of allProfiles ?? []) {
      if (p.user_id) userIds.add(p.user_id);
    }

    // Profile lookup map
    const profileMap = new Map<string, { full_name: string; avatar_url: string | null; role?: string }>();
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .in('user_id', Array.from(userIds));

      for (const p of profiles ?? []) {
        profileMap.set(p.user_id, {
          full_name: p.full_name || 'User',
          avatar_url: p.avatar_url || null,
          role: p.role,
        });
      }
    }

    const messages = normalizedRawMessages.map((m: any) => ({
      ...m,
      sender: profileMap.get(m.sender_id) ?? { full_name: 'User', avatar_url: null },
      receiver: profileMap.get(m.receiver_id) ?? { full_name: 'User', avatar_url: null },
    }));

    const contacts = (allProfiles ?? []).map((p: any) => ({
      user_id: p.user_id,
      full_name: p.full_name || 'User',
      avatar_url: p.avatar_url || null,
      role: p.role,
    }));

    return NextResponse.json({ success: true, messages, contacts });
  } catch (err: any) {
    console.error('Messages GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { receiverId, content } = await request.json();
    if (!receiverId || !content) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

    // Try inserting with recipient_id + body first
    let insertResult = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: receiverId,
      body: content,
      is_read: false
    } as any).select().single();

    // Fallback if recipient_id or body fails
    if (insertResult.error) {
      insertResult = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content: content,
        is_read: false
      } as any).select().single();
    }

    if (insertResult.error) throw insertResult.error;

    const raw = insertResult.data;
    const normalizedMessage = {
      id: raw.id,
      sender_id: raw.sender_id,
      receiver_id: raw.recipient_id || raw.receiver_id,
      content: raw.body || raw.content,
      created_at: raw.created_at,
      is_read: raw.is_read,
    };

    return NextResponse.json({ success: true, message: normalizedMessage });
  } catch (err: any) {
    console.error('Messages POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
