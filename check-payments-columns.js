const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zjprenwrsinssuiyrzfq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcHJlbndyc2luc3N1aXlyemZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjIxODMsImV4cCI6MjA4NTkzODE4M30.f4naVSyI4MXEGqpujtwB_VDcSdpgsF5UVA4dEblnrcA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('payments').select('*').limit(1);
  if (error) {
    console.error('Error fetching payments:', error);
  } else {
    console.log('Payment record columns:', Object.keys(data[0] || {}));
    console.log('Sample payment:', data[0]);
  }
}

check();
