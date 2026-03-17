'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { LandingPage } from '@/components/LandingPage';
import { LoginForm }   from '@/components/auth/login-form/LoginForm';
import { SignupForm }  from '@/components/auth/signup-form/SignupForm';
import { useEffect } from 'react';

type AuthModal = 'login' | 'signup' | null;

function AuthModalController({ onOpen }: { onOpen: (m: AuthModal) => void }) {
  const searchParams = useSearchParams();
  const router       = useRouter();

  useEffect(() => {
    const auth = searchParams.get('auth');
    if (auth === 'login' || auth === 'signup') {
      onOpen(auth);
      // Clean URL immediately so this doesn't re-trigger
      router.replace('/', { scroll: false });
    }
  }, [searchParams]); // re-run when URL params change

  return null;
}

export default function HomePage() {
  const [modal, setModal] = useState<AuthModal>(null);

  const openModal  = useCallback((m: AuthModal) => setModal(m), []);
  const openLogin  = useCallback(() => setModal('login'),  []);
  const openSignup = useCallback(() => setModal('signup'), []);
  const close      = useCallback(() => setModal(null),     []);

  return (
    <>
      <Suspense fallback={null}>
        <AuthModalController onOpen={openModal} />
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