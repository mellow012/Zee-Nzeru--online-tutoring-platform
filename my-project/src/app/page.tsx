'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Navbar }      from '@/components/NavBar';
import { LandingPage } from '@/components/LandingPage';
import { LoginForm }   from '@/components/auth/login-form/LoginForm';
import { SignupForm }  from '@/components/auth/signup-form/SignupForm';

type AuthModal = 'login' | 'signup' | null;

// ── Isolate useSearchParams in its own component so it can be Suspense-wrapped
function AuthModalController({
  onLogin, onSignup,
}: {
  onLogin: () => void;
  onSignup: () => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const auth = searchParams.get('auth');
    if (auth === 'login')  onLogin();
    if (auth === 'signup') onSignup();
  }, [searchParams, onLogin, onSignup]);

  return null; // purely side-effect — renders nothing
}

export default function HomePage() {
  const [modal, setModal] = useState<AuthModal>(null);

  const openLogin  = () => setModal('login');
  const openSignup = () => setModal('signup');
  const close      = () => setModal(null);

  return (
    <>
      {/* Suspense required by Next.js for any component using useSearchParams */}
      <Suspense fallback={null}>
        <AuthModalController onLogin={openLogin} onSignup={openSignup} />
      </Suspense>

      <LandingPage onLogin={openLogin} onSignup={openSignup} />

      {/* Login dialog */}
      <Dialog open={modal === 'login'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <VisuallyHidden><DialogTitle>Sign in</DialogTitle></VisuallyHidden>
          <LoginForm
            onSwitchToSignup={() => setModal('signup')}
            onClose={close}
          />
        </DialogContent>
      </Dialog>

      {/* Signup dialog */}
      <Dialog open={modal === 'signup'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-[440px]">
          <VisuallyHidden><DialogTitle>Create account</DialogTitle></VisuallyHidden>
          <SignupForm
            onSwitchToLogin={() => setModal('login')}
            onClose={close}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}