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
      id, sender_id, receiver_id, content, created_at, is_read,
      sender:profiles!sender_id(full_name, avatar_url),
      receiver:profiles!receiver_id(full_name, avatar_url)
    `).order('created_at', { ascending: true });

    if (isAdmin) {
      // Admin gets all messages ordered by latest
      query = supabase.from('messages').select(`
        id, sender_id, receiver_id, content, created_at, is_read,
        sender:profiles!sender_id(full_name, avatar_url),
        receiver:profiles!receiver_id(full_name, avatar_url)
      `).order('created_at', { ascending: false }).limit(200);
    } else if (peerId) {
      // Get conversation between user and peerId
      query = query.or(`and(sender_id.eq.${user.id},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${user.id})`);
    } else {
      // Just return user's recent messages to build contact list
      query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ messages: data });
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
      receiver_id: receiverId,
      content,
      is_read: false
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, message: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
