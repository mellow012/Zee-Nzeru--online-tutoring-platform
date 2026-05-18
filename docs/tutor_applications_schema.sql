-- ============================================
-- Tutor Applications Table
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.tutor_applications (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name              TEXT NOT NULL,
  email                  TEXT NOT NULL UNIQUE,
  phone_number           TEXT,
  subjects               JSONB DEFAULT '[]'::jsonb,
  experience_years       INTEGER DEFAULT 0,
  education_background   TEXT,
  bio                    TEXT,
  verification_documents TEXT[] DEFAULT '{}',
  status                 TEXT DEFAULT 'pending'
                           CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  rejection_reason       TEXT,
  reviewed_by            UUID,
  reviewed_at            TIMESTAMPTZ,
  invite_sent_at         TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-- 2. Create an index on status for fast admin queries
CREATE INDEX IF NOT EXISTS idx_tutor_applications_status
  ON public.tutor_applications (status);

-- 3. RLS policies

-- Enable RLS
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application (INSERT)
CREATE POLICY "Anyone can submit an application"
  ON public.tutor_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read applications
CREATE POLICY "Admins can read applications"
  ON public.tutor_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Only admins can update applications (approve/reject)
CREATE POLICY "Admins can update applications"
  ON public.tutor_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Service role bypasses RLS for invite operations
-- (No extra policy needed — service role key inherently bypasses RLS)

-- ============================================
-- Storage: Ensure verification-docs bucket exists
-- ============================================
-- Run in Supabase Dashboard > Storage > New Bucket:
--   Name: verification-docs
--   Public: false
--   Add policies for authenticated INSERT and admin SELECT
