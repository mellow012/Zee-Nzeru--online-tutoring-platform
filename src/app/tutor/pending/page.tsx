// src/app/tutor/pending/page.tsx
// Gate page — middleware redirects here when verification_status = 'pending_review'.

import { Clock, CheckCircle, Mail, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = { title: 'Under Review | TutorConnect' };

const STEPS = [
  { icon: FileText, label: 'Documents submitted',       done: true  },
  { icon: Clock,    label: 'Admin review in progress',  done: false },
  { icon: Mail,     label: 'Email confirmation sent',   done: false },
  { icon: CheckCircle, label: 'Profile approved',       done: false },
];

export default function TutorPendingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Application Under Review</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Thank you for submitting your tutor application. Our team is reviewing your
            credentials and will get back to you within <strong>24–48 hours</strong>.
          </p>
        </div>

        <Card className="border-0 shadow-sm text-left">
          <CardContent className="p-5 space-y-3">
            {STEPS.map(({ icon: Icon, label, done }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  done ? 'bg-emerald-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-4 h-4 ${done ? 'text-emerald-600' : 'text-gray-400'}`} />
                </div>
                <span className={`text-sm ${done ? 'text-gray-900 font-medium' : 'text-muted-foreground'}`}>
                  {label}
                </span>
                {done && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          You'll receive an email once your profile is approved. In the meantime,
          feel free to check back here for updates.
        </p>
      </div>
    </div>
  );
}