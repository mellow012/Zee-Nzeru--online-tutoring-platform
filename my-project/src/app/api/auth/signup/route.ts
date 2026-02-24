import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, role, phoneNumber } = await request.json();

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be filled' },
        { status: 400 }
      );
    }

    if (!['student', 'tutor'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }

    const supabase = await createClient();

    // Supabase handles duplicate email check automatically
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: { full_name: fullName, role, phone_number: phoneNumber || null },
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: error?.message ?? 'Signup failed' },
        { status: 400 }
      );
    }

    // Profile + tutor_profile are auto-created by your handle_new_user() trigger
    return NextResponse.json({
      success: true,
      user: {
        userId: data.user.id,
        email: data.user.email,
        role,
        fullName,
        avatarUrl: null,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}