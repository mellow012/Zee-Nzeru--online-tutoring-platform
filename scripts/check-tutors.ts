import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { error } = await supabase.from('tutor_profiles').update({ verified: true, verification_status: 'approved' }).neq('user_id', '00000000-0000-0000-0000-000000000000');
  console.log('Update Error:', error);
  const { data: tp } = await supabase.from('tutor_profiles').select('*');
  console.log('Approved Tutors:', tp?.filter(t => t.verified).length);
}

check();
