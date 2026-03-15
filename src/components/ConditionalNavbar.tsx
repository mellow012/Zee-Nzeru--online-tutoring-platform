'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/NavBar';

// Routes where the Navbar should NOT appear
// (these have their own AppSidebar)
const NO_NAVBAR_PREFIXES = ['/student', '/tutor', '/admin', '/auth'];

export function ConditionalNavbar() {
  const pathname = usePathname();
  const hide = NO_NAVBAR_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (hide) return null;
  return <Navbar />;
}