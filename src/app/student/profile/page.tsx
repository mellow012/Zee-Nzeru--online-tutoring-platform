// src/app/student/profile/page.tsx
import { getProfileData } from '@/app/profile/actions';
import { ProfileClient } from '@/components/profile/ProfileClient';

export const metadata = { title: 'My Profile | Zee Nzeru' };

export default async function StudentProfilePage() {
  const data = await getProfileData();
  return <ProfileClient data={data} />;
}