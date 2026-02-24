'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import {
  GraduationCap, Upload, CheckCircle, User,
  BookOpen, FileText, ChevronRight, ChevronLeft, AlertCircle,
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Personal Info', icon: User, description: 'Basic profile details' },
  { id: 2, title: 'Teaching Details', icon: BookOpen, description: 'Subjects and experience' },
  { id: 3, title: 'Verification Docs', icon: FileText, description: 'ID and certificates' },
];

interface FormData {
  bio: string;
  subjects: string;
  hourlyRate: string;
  experienceYears: string;
  educationBackground: string;
  teachingStyle: string;
  idDocument: File | null;
  qualificationDoc: File | null;
}

function TutorOnboardingContent() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    bio: '',
    subjects: '',
    hourlyRate: '',
    experienceYears: '',
    educationBackground: '',
    teachingStyle: '',
    idDocument: null,
    qualificationDoc: null,
  });

  const update = (field: keyof FormData, value: string | File | null) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const canProceed = () => {
    if (currentStep === 1) return form.bio.length >= 20;
    if (currentStep === 2) return form.subjects.trim() !== '' && form.hourlyRate.trim() !== '';
    if (currentStep === 3) return form.idDocument !== null;
    return false;
  };

  const uploadFile = async (file: File, userId: string, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('verification-docs').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('verification-docs').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const docUrls: string[] = [];

      // Upload ID document (required)
      if (form.idDocument) {
        const url = await uploadFile(form.idDocument, user.id, 'id');
        docUrls.push(url);
      }

      // Upload qualification doc (optional)
      if (form.qualificationDoc) {
        const url = await uploadFile(form.qualificationDoc, user.id, 'qualification');
        docUrls.push(url);
      }

      // Update tutor profile
      const { error } = await supabase
        .from('tutor_profiles')
        .update({
          bio: form.bio,
          subjects: form.subjects.split(',').map((s) => s.trim()).filter(Boolean),
          hourly_rate: parseFloat(form.hourlyRate),
          experience_years: parseInt(form.experienceYears) || 0,
          education_background: form.educationBackground,
          teaching_style: form.teachingStyle,
          verification_documents: docUrls,
        })
        .eq('user_id', user.id);

      // Also update profile bio
      await supabase
        .from('profiles')
        .update({ bio: form.bio })
        .eq('user_id', user.id);

      if (error) throw error;

      // Create notification for admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins?.length) {
        await supabase.from('notifications').insert(
          admins.map((a) => ({
            user_id: a.user_id,
            type: 'verification_request',
            title: 'New Tutor Verification Request',
            message: `A new tutor has submitted their verification documents for review.`,
          }))
        );
      }

      toast({ title: 'Submitted!', description: 'Your profile is under review.' });
      router.push('/tutor/pending');
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Submission failed', description: 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-8 pt-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Zee Nzeru
          </span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-3">
            {STEPS.map((step) => (
              <div key={step.id} className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step.id < currentStep
                    ? 'bg-emerald-500 text-white'
                    : step.id === currentStep
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.id < currentStep ? <CheckCircle className="w-4 h-4" /> : step.id}
                </div>
                <span className={`text-xs hidden sm:block ${step.id === currentStep ? 'text-emerald-700 font-medium' : 'text-gray-400'}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = STEPS[currentStep - 1].icon;
                return (
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                );
              })()}
              <div>
                <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
                <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">

            {/* Step 1 — Personal Info */}
            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Professional Bio <span className="text-red-500">*</span></Label>
                  <Textarea
                    placeholder="Tell students about your teaching background, experience, and what makes you a great tutor..."
                    rows={5}
                    value={form.bio}
                    onChange={(e) => update('bio', e.target.value)}
                  />
                  <p className={`text-xs ${form.bio.length < 20 ? 'text-red-400' : 'text-gray-400'}`}>
                    {form.bio.length}/20 characters minimum
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Teaching Style</Label>
                  <Input
                    placeholder="e.g. Patient, step-by-step, visual learner focused..."
                    value={form.teachingStyle}
                    onChange={(e) => update('teachingStyle', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Step 2 — Teaching Details */}
            {currentStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Subjects You Teach <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Mathematics, Physics, Chemistry (comma-separated)"
                    value={form.subjects}
                    onChange={(e) => update('subjects', e.target.value)}
                  />
                  {form.subjects && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.subjects.split(',').filter(Boolean).map((s, i) => (
                        <Badge key={i} variant="secondary">{s.trim()}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hourly Rate (MWK) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      placeholder="e.g. 15000"
                      value={form.hourlyRate}
                      onChange={(e) => update('hourlyRate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 5"
                      value={form.experienceYears}
                      onChange={(e) => update('experienceYears', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Education Background</Label>
                  <Input
                    placeholder="e.g. BSc Mathematics, University of Malawi"
                    value={form.educationBackground}
                    onChange={(e) => update('educationBackground', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Step 3 — Documents */}
            {currentStep === 3 && (
              <>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Why do we need these?</p>
                    <p>Documents are used to verify your identity and qualifications. They are only reviewed by our admin team and never shared publicly.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    National ID or Passport <span className="text-red-500">*</span>
                  </Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-emerald-300 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">Upload a clear photo of your ID</p>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      className="max-w-xs mx-auto"
                      onChange={(e) => update('idDocument', e.target.files?.[0] ?? null)}
                    />
                    {form.idDocument && (
                      <p className="text-xs text-emerald-600 mt-2">
                        ✓ {form.idDocument.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Teaching Certificate or Degree (optional)</Label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-emerald-300 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">Upload qualification documents</p>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      className="max-w-xs mx-auto"
                      onChange={(e) => update('qualificationDoc', e.target.files?.[0] ?? null)}
                    />
                    {form.qualificationDoc && (
                      <p className="text-xs text-emerald-600 mt-2">
                        ✓ {form.qualificationDoc.name}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep((s) => s - 1)}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>

              {currentStep < STEPS.length ? (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setCurrentStep((s) => s + 1)}
                  disabled={!canProceed()}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}

export default function TutorOnboardingPage() {
  return (
    <AuthProvider>
      <TutorOnboardingContent />
    </AuthProvider>
  );
}