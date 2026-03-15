// src/app/tutor/page.tsx
import { getTutorDashboardData } from './actions';
import { TutorDashboard } from './TutorDashboard';

export const metadata = { title: 'Dashboard | TutorConnect' };

export default async function TutorPage() {
  const data = await getTutorDashboardData();
  return <TutorDashboard data={data} />;
}