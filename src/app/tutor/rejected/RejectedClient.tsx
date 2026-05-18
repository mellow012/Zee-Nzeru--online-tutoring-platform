'use client';

import { useRouter } from 'next/navigation';
import { XCircle, RefreshCw, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  rejectionReason: string | null;
}

export function RejectedClient({ rejectionReason }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Application Not Approved</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Unfortunately, your tutor application was not approved this time.
            You're welcome to update your profile and resubmit.
          </p>
        </div>

        {rejectionReason && (
          <Card className="border border-red-100 bg-red-50/50 shadow-none text-left">
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Reason from reviewer</p>
              <p className="text-sm text-red-800">{rejectionReason}</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 h-11"
            onClick={() => router.push('/tutor/onboarding')}
          >
            <RefreshCw className="w-4 h-4" />
            Update & Resubmit
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => window.open('mailto:support@tutorconnect.mw', '_blank')}
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Common reasons for rejection: incomplete documents, unclear credential photos,
          or subjects outside our current coverage. Our team is happy to help.
        </p>
      </div>
    </div>
  );
}