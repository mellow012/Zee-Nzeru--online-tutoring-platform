import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, role, full_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        userId: profile.user_id,
        email: user.email,
        role: profile.role,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}