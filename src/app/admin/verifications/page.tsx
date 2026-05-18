'use client';

import { AdminVerificationsPanel } from '@/components/admin/AdminVerificationsPanel';

export default function AdminVerificationsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Tutor Verifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve profiles submitted by existing tutors.
        </p>
      </div>

      <AdminVerificationsPanel />
    </div>
  );
}
