import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createTestUser(
  email: string,
  password: string,
  fullName: string,
  role: 'student' | 'tutor'
) {
  console.log(`Creating ${role}: ${email}...`);
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (authErr) {
    if (authErr.message.includes('already exists')) {
      console.log(`User ${email} already exists, fetching id...`);
      const { data } = await supabase.from('profiles').select('user_id').eq('email', email).single();
      // Actually we should just get from auth.admin.listUsers but let's query profiles, or let's just ignore.
      return null;
    }
    console.error(`Error creating ${email}:`, authErr);
    return null;
  }

  const userId = authData.user.id;

  // Create profile
  const { error: profileErr } = await supabase.from('profiles').insert({
    user_id: userId,
    role,
    full_name: fullName,
    is_active: true,
  });

  if (profileErr) {
    // If it already exists due to trigger, that's fine
    console.log(`Profile creation note for ${email}:`, profileErr.message);
  }

  return userId;
}

async function seed() {
  console.log('--- Starting Seed ---');

  // 1. Create Tutors
  const tutor1Id = await createTestUser('tutor1@example.com', 'password123', 'Alice Tutor', 'tutor');
  const tutor2Id = await createTestUser('tutor2@example.com', 'password123', 'Bob Tutor', 'tutor');

  if (tutor1Id) {
    await supabase.from('tutor_profiles').upsert({
      user_id: tutor1Id,
      subjects: ['Math', 'Physics'],
      hourly_rate: 15,
      rating: 4.8,
      verified: true,
      total_sessions: 10,
      completed_sessions: 8,
      experience_years: 5,
      languages: ['English'],
      verification_status: 'approved',
      bio: 'Experienced Math and Physics tutor.',
    }, { onConflict: 'user_id' });
  }

  if (tutor2Id) {
    await supabase.from('tutor_profiles').upsert({
      user_id: tutor2Id,
      subjects: ['Biology', 'Chemistry'],
      hourly_rate: 20,
      rating: 4.9,
      verified: true,
      total_sessions: 15,
      completed_sessions: 14,
      experience_years: 3,
      languages: ['English', 'Spanish'],
      verification_status: 'approved',
      bio: 'Biology and Chemistry expert.',
    }, { onConflict: 'user_id' });
  }

  // 2. Create Students
  const student1Id = await createTestUser('student1@example.com', 'password123', 'Charlie Student', 'student');
  const student2Id = await createTestUser('student2@example.com', 'password123', 'Dave Student', 'student');

  if (student1Id) {
    await supabase.from('student_profiles').upsert({
      user_id: student1Id,
      preferred_subjects: ['Math'],
      grade_level: 'High School',
    }, { onConflict: 'user_id' });
  }

  if (student2Id) {
    await supabase.from('student_profiles').upsert({
      user_id: student2Id,
      preferred_subjects: ['Biology'],
      grade_level: 'College',
    }, { onConflict: 'user_id' });
  }

  console.log('--- Seed Completed ---');
  console.log('Tutors: tutor1@example.com, tutor2@example.com');
  console.log('Students: student1@example.com, student2@example.com');
  console.log('Passwords: password123');
}

seed().catch(console.error);
