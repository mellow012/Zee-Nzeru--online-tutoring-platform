'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap, Upload, Plus, X, AlertCircle,
  CheckCircle2, Loader2, FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/auth-context';

const COMMON_SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'English', 'History', 'Geography', 'Economics',
  'Computer Science', 'French', 'Spanish', 'Portuguese',
  'Accounting', 'Business Studies', 'Art', 'Music',
];

export default function TutorOnboardingPage() {
  const { user }   = useAuth();
  const router     = useRouter();
  const { toast }  = useToast();

  // Form state
  const [selectedSubjects,    setSelectedSubjects]    = useState<string[]>([]);
  const [customSubject,       setCustomSubject]       = useState('');
  const [hourlyRate,          setHourlyRate]          = useState('');
  const [experienceYears,     setExperienceYears]     = useState('');
  const [bio,                 setBio]                 = useState('');
  const [educationBackground, setEducationBackground] = useState('');
  const [teachingStyle,       setTeachingStyle]       = useState('');
  const [docFiles,            setDocFiles]            = useState<File[]>([]);

  // Submit state
  const [uploading,    setUploading]    = useState(false);
  const [uploadStep,   setUploadStep]   = useState('');   // shows current progress
  const [fieldErrors,  setFieldErrors]  = useState<Record<string, string>>({});

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const toggleSubject = (s: string) =>
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (trimmed && !selectedSubjects.includes(trimmed)) {
      setSelectedSubjects((prev) => [...prev, trimmed]);
      setCustomSubject('');
    }
  };

  const addDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setDocFiles((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = '';
  };

  const removeDoc = (idx: number) =>
    setDocFiles((prev) => prev.filter((_, i) => i !== idx));

  // ── Validation ────────────────────────────────────────────────────────────────

  const validate = () => {
    const errs: Record<string, string> = {};
    if (selectedSubjects.length === 0)
      errs.subjects = 'Select at least one subject you teach';
    if (!hourlyRate || isNaN(Number(hourlyRate)) || Number(hourlyRate) <= 0)
      errs.hourlyRate = 'Enter a valid hourly rate greater than 0';
    if (!educationBackground.trim())
      errs.educationBackground = 'Education background is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not signed in', description: 'Please sign in and try again.' });
      return;
    }

    if (!validate()) {
      toast({ variant: 'destructive', title: 'Please fix the errors below' });
      return;
    }

    setUploading(true);
    setUploadStep('');
    const supabase = createClient();

    try {
      // ── Step 1: Upload documents (if any) ────────────────────────────────────
      const uploadedPaths: string[] = [];

      if (docFiles.length > 0) {
        setUploadStep(`Uploading documents (0 / ${docFiles.length})…`);

        for (let i = 0; i < docFiles.length; i++) {
          const file = docFiles[i];
          setUploadStep(`Uploading document ${i + 1} of ${docFiles.length}…`);

          // Sanitise filename — remove spaces and special chars
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path     = `${user.userId}/${Date.now()}-${safeName}`;

          const { error: uploadError } = await supabase.storage
            .from('verification-docs')
            .upload(path, file, { upsert: false });

          if (uploadError) {
            // Provide a specific message for common storage errors
            if (uploadError.message.includes('Bucket not found') ||
                uploadError.message.includes('bucket') ||
                uploadError.message.includes('not found')) {
              throw new Error(
                'Storage bucket "verification-docs" does not exist. ' +
                'Please create it in your Supabase dashboard under Storage.'
              );
            }
            if (uploadError.message.includes('row-level security') ||
                uploadError.message.includes('policy') ||
                uploadError.message.includes('unauthorized') ||
                uploadError.message.includes('403')) {
              throw new Error(
                'Storage permission denied. Please add the upload policy for ' +
                '"verification-docs" bucket in your Supabase dashboard.'
              );
            }
            throw new Error(`Document upload failed: ${uploadError.message}`);
          }

          uploadedPaths.push(path);
        }
      }

      // ── Step 2: Save tutor profile ────────────────────────────────────────────
      setUploadStep('Saving your profile…');

      const profileData = {
        user_id:              user.userId,
        subjects:             selectedSubjects,
        hourly_rate:          Number(hourlyRate),
        currency:             'MWK',
        experience_years:     experienceYears ? Number(experienceYears) : 0,
        bio:                  bio.trim() || null,
        education_background: educationBackground.trim() || null,
        teaching_style:       teachingStyle.trim() || null,
        verification_status:  docFiles.length > 0 ? 'pending_review' : 'not_submitted',
        verified:             false,
        // Only include documents field if we uploaded something
        ...(uploadedPaths.length > 0 && { verification_documents: uploadedPaths }),
      };

      const { error: profileError } = await supabase
        .from('tutor_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (profileError) {
        if (profileError.message.includes('row-level security') ||
            profileError.message.includes('policy') ||
            profileError.code === '42501') {
          throw new Error(
            'Database permission denied. Please add the RLS insert/update ' +
            'policy for "tutor_profiles" in your Supabase SQL editor.'
          );
        }
        throw new Error(`Profile save failed: ${profileError.message}`);
      }

      // ── Success ───────────────────────────────────────────────────────────────
      setUploadStep('Done!');
      toast({
        title: docFiles.length > 0 ? 'Profile submitted!' : 'Profile saved!',
        description: docFiles.length > 0
          ? "We'll review your documents within 24–48 hours."
          : 'Add verification documents when ready to go live.',
      });

      router.push(docFiles.length > 0 ? '/tutor/pending' : '/tutor');

    } catch (err: any) {
      console.error('[Onboarding] submit error:', err);
      toast({
        variant:     'destructive',
        title:       'Submission failed',
        description: err.message ?? 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setUploading(false);
      setUploadStep('');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold">Complete Your Tutor Profile</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Tell us about yourself and upload your credentials. Our team verifies
            your account within 24–48 hours.
          </p>
        </div>

        {/* ── Section 1: Subjects & Rate ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">What do you teach?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Subject chips */}
            <div className="flex flex-wrap gap-2">
              {COMMON_SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    toggleSubject(s);
                    setFieldErrors((p) => ({ ...p, subjects: '' }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    selectedSubjects.includes(s)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Custom subject input */}
            <div className="flex gap-2">
              <Input
                placeholder="Add another subject…"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSubject(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addCustomSubject} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Selected subjects */}
            {selectedSubjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedSubjects.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
                    {s}
                    <button type="button" onClick={() => toggleSubject(s)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {fieldErrors.subjects && (
              <p className="text-xs text-red-500">⚠ {fieldErrors.subjects}</p>
            )}

            {/* Rate + experience */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label>Hourly Rate (MWK) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  placeholder="e.g. 15000"
                  value={hourlyRate}
                  onChange={(e) => { setHourlyRate(e.target.value); setFieldErrors((p) => ({ ...p, hourlyRate: '' })); }}
                  min="0"
                  className={fieldErrors.hourlyRate ? 'border-red-300 focus:ring-red-400' : ''}
                />
                {fieldErrors.hourlyRate && (
                  <p className="text-xs text-red-500">⚠ {fieldErrors.hourlyRate}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Years of Experience</Label>
                <Input
                  type="number"
                  placeholder="e.g. 3"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  min="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: About You ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">About You</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Education Background <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. BSc Mathematics, University of Malawi"
                value={educationBackground}
                onChange={(e) => { setEducationBackground(e.target.value); setFieldErrors((p) => ({ ...p, educationBackground: '' })); }}
                className={fieldErrors.educationBackground ? 'border-red-300' : ''}
              />
              {fieldErrors.educationBackground && (
                <p className="text-xs text-red-500">⚠ {fieldErrors.educationBackground}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Short Bio</Label>
              <Textarea
                placeholder="Describe yourself and your teaching approach…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teaching Style <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Input
                placeholder="e.g. Socratic method, problem-based learning"
                value={teachingStyle}
                onChange={(e) => setTeachingStyle(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Section 3: Documents ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Verification Documents</CardTitle>
            <CardDescription>
              Upload your degree certificate, teaching licence, or any credential.
              PDF or image, max 5 files. You can skip this and add documents later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload documents</span>
              <span className="text-xs text-gray-400">PDF, PNG, JPG — up to 10MB each</span>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={addDocFile}
              />
            </label>

            {docFiles.length > 0 && (
              <div className="space-y-2">
                {docFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center border border-gray-200 shrink-0">
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(f.size / 1024).toFixed(0)} KB · {f.name.split('.').pop()?.toUpperCase()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDoc(i)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-700 border border-amber-100">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Documents are stored securely and only reviewed by our admin team.
            </div>
          </CardContent>
        </Card>

        {/* Progress indicator */}
        {uploading && uploadStep && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">{uploadStep}</p>
          </div>
        )}

        {/* Submit button */}
        <Button
          type="button"
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base gap-2"
          onClick={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploadStep || 'Submitting…'}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              {docFiles.length > 0 ? 'Submit for Review' : 'Save Profile'}
            </>
          )}
        </Button>

        {docFiles.length === 0 && (
          <p className="text-center text-xs text-muted-foreground -mt-2">
            No documents added — your profile will be saved but you&apos;ll need to
            upload credentials before you can be verified.
          </p>
        )}
      </div>
    </div>
  );
}