
'use server'; // Critical for Next.js Server Actions

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';


export async function sendSessionPing(sessionId: string, receiverId: string) {
  try {
    const supabase = await createClient(); // This helper handles cookie injection
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('session_pings')
      .insert({
        session_id: sessionId,
        sender_id: user.id,
        receiver_id: receiverId,
      });

    if (error) {
      console.error('Ping error:', error);
      return { success: false, error: error.message };
    }

    // Optional: Refresh the path so the UI knows a ping was sent
    revalidatePath(`/classroom/${sessionId}`);
    
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Internal server error' };
  }
}
export async function completeSessionAction(sessionId: string, notes?: string) {
  const supabase = await createClient();
  
  // 1. Verify user is the tutor for this session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const now = new Date().toISOString();

  // 2. Update session with "Proof of Class" metadata
  const { data, error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
     actual_end_time: now,
     completed_by_student: true,
     completion_confirmed_at: new Date().toISOString(),
      completed_by_tutor: true,
      session_notes: notes || null,
      updated_at: now
    })
    .eq('id', sessionId)
    .eq('tutor_id', user.id) // Security check
    .select('student_id, tutor_id, subject')
    .single();

  if (error) return { success: false, error: error.message };

  // 3. Trigger Revalidation
  revalidatePath(`/classroom/${sessionId}`);
  
  return { success: true, session: data };
}
export async function disputeSessionAction(sessionId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'cancelled', // Or a new 'disputed' status if you add it to your enum
      cancellation_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .eq('student_id', user.id);

  return { success: !error };
}