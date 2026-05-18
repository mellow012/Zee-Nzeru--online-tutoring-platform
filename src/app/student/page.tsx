// Server component — runs on the server, protected by middleware.
// Fetches all dashboard data before painting the page (no loading flash).

import { getStudentDashboardData } from './action';
import { StudentDashboard } from './StudentDashboard';

export const metadata = {
  title: 'Dashboard | TutorConnect',
};

export default async function StudentPage() {
  const data = await getStudentDashboardData();

  return <StudentDashboard data={data} />;
}