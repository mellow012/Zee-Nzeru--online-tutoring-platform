'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Navbar }      from '@/components/NavBar';
import { LandingPage } from '@/components/LandingPage';
import { LoginForm }   from '@/components/auth/login-form/LoginForm';
import { SignupForm }  from '@/components/auth/signup-form/SignupForm';

type AuthModal = 'login' | 'signup' | null;

function AuthModalController({
  onLogin, onSignup,
}: {
  onLogin: () => void;
  onSignup: () => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const auth = searchParams.get('auth');
    // Only open once on mount — don't re-trigger on every render
    if (auth === 'login')  onLogin();
    if (auth === 'signup') onSignup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  return null;
}

export default function HomePage() {
  const [modal, setModal] = useState<AuthModal>(null);

  // useCallback ensures stable references so AuthModalController doesn't re-run
  const openLogin  = useCallback(() => setModal('login'),  []);
  const openSignup = useCallback(() => setModal('signup'), []);
  const close      = useCallback(() => setModal(null),     []);

  return (
    <>
    
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