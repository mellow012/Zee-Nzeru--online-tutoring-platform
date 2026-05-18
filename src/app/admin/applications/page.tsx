'use client';

import { AdminApplicationsPanel } from '@/components/admin/AdminApplicationsPanel';

export default function AdminApplicationsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Tutor Applications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and manage applications from prospective tutors.
        </p>
      </div>

      <AdminApplicationsPanel />
    </div>
  );
}
