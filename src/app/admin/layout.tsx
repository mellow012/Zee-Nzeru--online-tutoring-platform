// src/app/admin/layout.tsx
// All /admin/* sub-pages get AppSidebar.
// The main /admin page (AdminDashboard) also renders inside main —
// its own built-in sidebar is removed in favour of this shared one.
// NOTE: If AdminDashboard still has its own <aside>, update it to just
// render the content area without the outer flex wrapper.

import { AppSidebar } from '@/components/AppSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar role="admin" />
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}