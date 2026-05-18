// src/app/tutor/layout.tsx
// Wraps every /tutor/* page with the sidebar.
// Gate pages (onboarding, pending, rejected) are also wrapped — they show
// the sidebar so the user isn't in a completely blank shell.

import { AppSidebar } from '@/components/AppSidebar';

export default function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar role="tutor" />

      {/* Main content — offset for mobile top bar */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}