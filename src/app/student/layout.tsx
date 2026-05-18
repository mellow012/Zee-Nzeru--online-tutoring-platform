// src/app/student/layout.tsx
// Wraps every /student/* page with the sidebar.
// The sidebar handles its own auth state via useAuth().

import { AppSidebar } from '@/components/AppSidebar';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar role="student" />

      {/* Main content — offset for mobile top bar */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}