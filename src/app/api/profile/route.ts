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

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select(`*, tutor_profiles(*)`)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error) return error;

    const { fullName, phoneNumber, avatarUrl, subjects, hourlyRate, bio } = await request.json();

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone_number: phoneNumber, avatar_url: avatarUrl })
      .eq('user_id', user.id)
      .select('role')
      .single();

    if (updateError) throw updateError;

    if (profile.role === 'tutor') {
      const { error: tutorError } = await supabase
        .from('tutor_profiles')
        .update({
          ...(subjects && { subjects }),
          ...(hourlyRate !== undefined && { hourly_rate: parseFloat(hourlyRate) }),
          ...(bio !== undefined && { bio }),
        })
        .eq('user_id', user.id);

      if (tutorError) throw tutorError;
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}