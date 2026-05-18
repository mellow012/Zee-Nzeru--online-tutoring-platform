-- ============================================
-- Supabase Triggers for Automatic Profile Creation
-- Run these in your Supabase SQL Editor
-- ============================================

-- 1. Trigger to create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, full_name, phone_number, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone_number', NULL),
    true
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- 2. Trigger to create role-specific profiles when profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'tutor' THEN
    INSERT INTO public.tutor_profiles (
      user_id, subjects, hourly_rate, rating, verified,
      total_sessions, completed_sessions, experience_years, languages
    )
    VALUES (
      NEW.user_id, '[]'::jsonb, 0, 0, false, 0, 0, 0, '[]'::jsonb
    )
    ON CONFLICT (user_id) DO NOTHING;

  ELSIF NEW.role = 'student' THEN
    INSERT INTO public.student_profiles (
      user_id
    )
    VALUES (
      NEW.user_id
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Create trigger
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();


-- ============================================
-- Optional: Ensure tables have required columns
-- ============================================

-- Profiles table - add missing columns if needed
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Tutor profiles table - check structure
-- The table should have: user_id, subjects, hourly_rate, rating, verified, 
-- total_sessions, completed_sessions, experience_years, languages, verification_documents

-- Student profiles table - check structure
-- The table should have: user_id, preferred_subjects, learning_goals, availability
