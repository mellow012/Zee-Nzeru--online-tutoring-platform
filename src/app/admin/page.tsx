// src/app/admin/page.tsx
// Server component — fetches all dashboard data before paint.
// Protected by middleware (admin only) AND requireAdmin() inside actions.

import { getAdminDashboardData } from './actions';
import { AdminDashboard } from './AdminDashboard';

export const metadata = { title: 'Admin | Zee Nzeru' };

export default async function AdminPage() {
  const data = await getAdminDashboardData();
  return <AdminDashboard data={data} />;
}