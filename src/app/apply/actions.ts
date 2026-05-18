'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '../notifications/actions';


// ─── Types ────────────────────────────────────────────────────────────────────

export interface TutorApplicationInput {
  fullName: string;
  email: string;
  phoneNumber?: string;
  subjects: string[];
  experienceYears: number;
  educationBackground: string;
  bio?: string;
}

// ─── Upload documents server-side (bypasses RLS) ─────────────────────────────

export async function uploadApplicationDocuments(
  formData: FormData
): Promise<{ success: boolean; paths?: string[]; error?: string }> {
  try {
    const email = formData.get('email') as string;
    if (!email) return { success: false, error: 'Email is required for upload' };

    const files = formData.getAll('documents') as File[];
    if (files.length === 0) return { success: true, paths: [] };

    const adminSupabase = createAdminClient();
    const uploadedPaths: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || file.size === 0) continue;

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `applications/${email.trim().toLowerCase()}/${Date.now()}-${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await adminSupabase.storage
        .from('verification-docs')
        .upload(path, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error(`[Upload] doc ${i + 1} failed:`, uploadError.message);
        return { success: false, error: `Document upload failed: ${uploadError.message}` };
      }

      uploadedPaths.push(path);
    }

    return { success: true, paths: uploadedPaths };
  } catch (err: any) {
    console.error('[uploadApplicationDocuments] error:', err);
    return { success: false, error: 'Document upload failed. Please try again.' };
  }
}

// ─── Submit application (public — no auth required) ──────────────────────────

export async function submitTutorApplication(
  input: TutorApplicationInput & { documentPaths?: string[] }
): Promise<{ success: boolean; error?: string }> {
  // Server-side validation
  if (!input.fullName?.trim()) return { success: false, error: 'Full name is required' };
  if (!input.email?.trim()) return { success: false, error: 'Email is required' };
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(input.email))
    return { success: false, error: 'Enter a valid email address' };
  if (!input.subjects?.length) return { success: false, error: 'Select at least one subject' };
  if (!input.educationBackground?.trim())
    return { success: false, error: 'Education background is required' };

  try {
    // Use admin client to bypass RLS for insert
    const supabase = createAdminClient();

    // Check if an application with this email already exists
    const { data: existing } = await supabase
      .from('tutor_applications')
      .select('id, status')
      .eq('email', input.email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending' || existing.status === 'under_review') {
        return {
          success: false,
          error: 'An application with this email is already under review.',
        };
      }
      if (existing.status === 'approved') {
        return {
          success: false,
          error: 'This email has already been approved. Check your inbox for your invite link.',
        };
      }
      // If rejected, allow reapplication — update existing row
      if (existing.status === 'rejected') {
        const { error: updateError } = await supabase
          .from('tutor_applications')
          .update({
            full_name: input.fullName.trim(),
            phone_number: input.phoneNumber?.trim() || null,
            subjects: input.subjects,
            experience_years: input.experienceYears || 0,
            education_background: input.educationBackground.trim(),
            bio: input.bio?.trim() || null,
            verification_documents: input.documentPaths ?? [],
            status: 'pending',
            rejection_reason: null,
            reviewed_by: null,
            reviewed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) return { success: false, error: updateError.message };
        return { success: true };
      }
    }

    // Check if user already exists in auth.users via secure RPC
    const { data: existingUserId, error: rpcError } = await supabase.rpc('get_user_id_by_email', {
      lookup_email: input.email.trim().toLowerCase(),
    });

    if (rpcError) {
      console.error('[submitTutorApplication] RPC error:', rpcError.message);
      // Continue anyway, but log it
    }

    // Insert new application
    const { error: insertError } = await supabase
      .from('tutor_applications')
      .insert({
        full_name: input.fullName.trim(),
        email: input.email.trim().toLowerCase(),
        phone_number: input.phoneNumber?.trim() || null,
        subjects: input.subjects,
        experience_years: input.experienceYears || 0,
        education_background: input.educationBackground.trim(),
        bio: input.bio?.trim() || null,
        verification_documents: input.documentPaths ?? [],
        status: 'pending',
      });

    if (insertError) {
      if (insertError.message.includes('unique') || insertError.message.includes('duplicate')) {
        return { success: false, error: 'An application with this email already exists.' };
      }
      return { success: false, error: insertError.message };
    }

    // ─── Post-submission Alerts ────────────────────────────────────────────────

    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('user_id')
        .in('role', ['admin', 'superadmin']);

      if (admins && admins.length > 0) {
        await Promise.all(
          admins.map((admin) =>
            createNotification({
              userId: admin.user_id,
              type: 'tutor_application',
              title: 'New Tutor Application',
              message: `Application received from ${input.fullName.trim()}.`,
              actionUrl: '/admin/applications',
              actionLabel: 'View Applications',
            })
          )
        );
      }
    } catch (notifErr) {
      console.error('[submitTutorApplication] notification error:', notifErr);
      // Don't fail the submission just because notification failed
    }

    // 2. Return success with special message if user already exists
    if (existingUserId) {
      return {
        success: true,
        error: 'ACCOUNT_EXISTS', // Special code for frontend to handle
      };
    }

    return { success: true };

  } catch (err: any) {
    console.error('[submitTutorApplication] error:', err);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
