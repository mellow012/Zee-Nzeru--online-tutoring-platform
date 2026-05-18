import { redirect } from 'next/navigation';

/**
 * Legacy onboarding page — tutors now apply via /apply
 * and are set up by the admin. Redirect to the tutor dashboard.
 */
export default function TutorOnboardingPage() {
  redirect('/tutor');
}