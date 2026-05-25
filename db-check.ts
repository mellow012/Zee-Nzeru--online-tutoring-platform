import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Try inserting with sender_id and body to see what other columns are required
  const { error } = await supabase.from('messages').insert({
    sender_id: '00000000-0000-0000-0000-000000000000',
    body: 'test',
  } as any);
  console.log('sender_id + body:', error?.message?.slice(0, 200));

  // Try with recipient_id
  const { error: e2 } = await supabase.from('messages').insert({
    sender_id: '00000000-0000-0000-0000-000000000000',
    recipient_id: '00000000-0000-0000-0000-000000000001',
    body: 'test',
  } as any);
  console.log('+ recipient_id:', e2?.message?.slice(0, 200));

  // Try with session_id
  const { error: e3 } = await supabase.from('messages').insert({
    sender_id: '00000000-0000-0000-0000-000000000000',
    recipient_id: '00000000-0000-0000-0000-000000000001',
    session_id: '00000000-0000-0000-0000-000000000002',
    body: 'test',
  } as any);
  console.log('+ session_id:', e3?.message?.slice(0, 200));

  // Try a select to see actual columns returned
  const { data, error: selErr } = await supabase.from('messages').select('*').limit(1);
  console.log('Select error:', selErr?.message);
  // Can we get column names from metadata?
  const { data: d2, error: e4 } = await supabase.from('messages').select('id, sender_id, recipient_id, session_id, body, created_at, is_read').limit(1);
  console.log('Full select error:', e4?.message?.slice(0, 200) || 'OK, columns: id, sender_id, recipient_id, session_id, body, created_at, is_read');
}

check();
