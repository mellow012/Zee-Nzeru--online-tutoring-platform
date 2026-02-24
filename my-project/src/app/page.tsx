'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GraduationCap, UserCheck, Video, Pen, Shield } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form/LoginForm';
import { SignupForm } from '@/components/auth/signup-form/SignupForm';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';

type AuthMode = 'login' | 'signup';

export default function HomePage() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Zee Nzeru
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => openAuth('login')}>Login</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openAuth('signup')}>
                Get Started
              </Button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-emerald-200">
              🇲🇼 Malawi&apos;s Premier Tutoring Platform
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Learn from the Best <br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Tutors in Malawi
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Connect with verified tutors for personalized learning sessions with live video,
              interactive whiteboard, and secure payments.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8" onClick={() => openAuth('signup')}>
                Find a Tutor
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => openAuth('login')}>
                I&apos;m a Tutor
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: UserCheck, title: 'Verified Tutors', desc: 'All tutors vetted for quality', color: 'emerald' },
              { icon: Video, title: 'Live Sessions', desc: 'HD video with screen sharing', color: 'teal' },
              { icon: Pen, title: 'Whiteboard', desc: 'Interactive collaboration tools', color: 'cyan' },
              { icon: Shield, title: 'Secure Payments', desc: 'Escrow protection for all', color: 'green' },
            ].map((f) => (
              <Card key={f.title} className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-${f.color}-100 flex items-center justify-center mb-4`}>
                    <f.icon className={`w-6 h-6 text-${f.color}-600`} />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                  <CardDescription>{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="bg-gradient-to-r from-emerald-600 to-teal-600 py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
              {[['500+', 'Students'], ['50+', 'Verified Tutors'], ['1000+', 'Sessions'], ['4.8', 'Avg Rating']].map(
                ([val, label]) => (
                  <div key={label}>
                    <div className="text-4xl font-bold mb-2">{val}</div>
                    <div className="text-emerald-100">{label}</div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-gray-50 py-8">
          <div className="container mx-auto px-4 text-center text-gray-600">
            <p>© {new Date().getFullYear()} Zee Nzeru Education Services. All rights reserved.</p>
          </div>
        </footer>

        {/* Auth Dialog */}
        <Dialog open={showAuth} onOpenChange={setShowAuth}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{authMode === 'login' ? 'Login' : 'Create Account'}</DialogTitle>
            </DialogHeader>
            {authMode === 'login' ? (
              <LoginForm
                onSwitchToSignup={() => setAuthMode('signup')}
                onClose={() => setShowAuth(false)}
              />
            ) : (
              <SignupForm
                onSwitchToLogin={() => setAuthMode('login')}
                onClose={() => setShowAuth(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
      <Toaster />
    </AuthProvider>
  );
}