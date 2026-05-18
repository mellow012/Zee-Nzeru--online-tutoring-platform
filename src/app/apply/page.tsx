'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';

import {
  GraduationCap, Upload, Plus, X, AlertCircle,
  CheckCircle2, Loader2, FileText, Mail, Phone, User,
  BookOpen, ArrowRight, ArrowLeft, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { submitTutorApplication, uploadApplicationDocuments } from './actions';
import Link from 'next/link';

const COMMON_SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'English', 'History', 'Geography', 'Economics',
  'Computer Science', 'French', 'Spanish', 'Portuguese',
  'Accounting', 'Business Studies', 'Art', 'Music',
];

type Step = 1 | 2 | 3;

export default function TutorApplicationPage() {
  const router    = useRouter();
  const { toast } = useToast();

  // Step state
  const [step, setStep] = useState<Step>(1);
  const [dir, setDir]   = useState(1);

  // Form fields — Step 1: Contact Info
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Step 2: Education & Subjects
  const [selectedSubjects, setSelectedSubjects]       = useState<string[]>([]);
  const [customSubject, setCustomSubject]              = useState('');
  const [experienceYears, setExperienceYears]          = useState('');
  const [educationBackground, setEducationBackground]  = useState('');
  const [bio, setBio]                                  = useState('');

  // Step 3: Documents
  const [docFiles, setDocFiles] = useState<File[]>([]);

  // State
  const [uploading, setUploading]     = useState(false);
  const [uploadStep, setUploadStep]   = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted]     = useState(false);
  const [accountExists, setAccountExists] = useState(false);


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

  // ── Navigation ───────────────────────────────────────────────────────────────

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setDir(1);
    setStep((s) => Math.min(s + 1, 3) as Step);
  };

  const goBack = () => {
    setDir(-1);
    setFieldErrors({});
    setStep((s) => Math.max(s - 1, 1) as Step);
  };

  // ── Validation ────────────────────────────────────────────────────────────────

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) errs.email = 'Enter a valid email address';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (selectedSubjects.length === 0) errs.subjects = 'Select at least one subject';
    if (!educationBackground.trim()) errs.educationBackground = 'Education background is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setUploading(true);
    setUploadStep('');

    try {
      // Upload documents server-side if any (bypasses RLS via admin client)
      let uploadedPaths: string[] = [];

      if (docFiles.length > 0) {
        setUploadStep(`Uploading ${docFiles.length} document(s)…`);

        const formData = new FormData();
        formData.append('email', email.trim());
        docFiles.forEach((file) => formData.append('documents', file));

        const uploadResult = await uploadApplicationDocuments(formData);

        if (!uploadResult.success) {
          throw new Error(uploadResult.error ?? 'Document upload failed');
        }

        uploadedPaths = uploadResult.paths ?? [];
      }

      // Submit application
      setUploadStep('Submitting your application…');

      const result = await submitTutorApplication({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        subjects: selectedSubjects,
        experienceYears: experienceYears ? Number(experienceYears) : 0,
        educationBackground: educationBackground.trim(),
        bio: bio.trim() || undefined,
        documentPaths: uploadedPaths.length > 0 ? uploadedPaths : undefined,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Submission failed');
      }

      if (result.error === 'ACCOUNT_EXISTS') {
        setAccountExists(true);
      }

      setSubmitted(true);

    } catch (err: any) {
      console.error('[Apply] submit error:', err);
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: err.message ?? 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setUploading(false);
      setUploadStep('');
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Application Submitted!</h1>
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
              Thank you for your interest in teaching on Zee Nzeru.
              Our team will review your application within <strong>24–48 hours</strong>.
            </p>
            {accountExists && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 text-left flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-blue-500" />
                <p>
                  <strong>Note:</strong> We found an existing account with this email. 
                  If approved, we will simply upgrade your existing account to a Tutor role.
                </p>
              </div>
            )}
          </div>


          <Card className="border-0 shadow-sm text-left">
            <CardContent className="p-5 space-y-3">
              {[
                { icon: CheckCircle2, label: 'Application received', done: true },
                { icon: BookOpen, label: 'Admin review in progress', done: false },
                { icon: Mail, label: 'Invite email sent on approval', done: false },
                { icon: GraduationCap, label: 'Set up your account & start teaching', done: false },
              ].map(({ icon: Icon, label, done }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    done ? 'bg-emerald-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-4 h-4 ${done ? 'text-emerald-600' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-sm ${done ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {label}
                  </span>
                  {done && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />}
                </div>
              ))}
            </CardContent>
          </Card>

          <Link href="/">
            <Button variant="outline" className="mt-4">
              Back to Home
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Form slides ───────────────────────────────────────────────────────────────

  const slide: Variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { 
      x: 0, 
      opacity: 1, 
      transition: { 
        duration: 0.35, 
        ease: [0.22, 1, 0.36, 1] as any 
      } 
    },
    exit: (d: number) => ({ 
      x: d > 0 ? -60 : 60, 
      opacity: 0, 
      transition: { duration: 0.25 } 
    }),
  };



  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Apply to Teach on Zee Nzeru</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Share your expertise with students across Malawi. Fill in your details below
            and we&apos;ll review your application.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {[
            { num: 1, label: 'Contact' },
            { num: 2, label: 'Education' },
            { num: 3, label: 'Documents' },
          ].map(({ num, label }) => (
            <div key={num} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                num === step
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : num < step
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {num < step ? <CheckCircle2 className="w-4 h-4" /> : num}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${
                num === step ? 'text-emerald-700' : 'text-gray-400'
              }`}>
                {label}
              </span>
              {num < 3 && <div className={`w-8 h-0.5 rounded-full ${num < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Form content */}
        <AnimatePresence mode="wait" custom={dir}>

          {/* ── Step 1: Contact Info ── */}
          {step === 1 && (
            <motion.div key="step1" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" /> Personal Information
                  </CardTitle>
                  <CardDescription>Tell us who you are</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full Name <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Input
                        placeholder="Your full name"
                        value={fullName}
                        onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => ({ ...p, fullName: '' })); }}
                        className={`pl-10 ${fieldErrors.fullName ? 'border-red-300' : ''}`}
                      />
                    </div>
                    {fieldErrors.fullName && <p className="text-xs text-red-500">⚠ {fieldErrors.fullName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Email Address <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: '' })); }}
                        className={`pl-10 ${fieldErrors.email ? 'border-red-300' : ''}`}
                      />
                    </div>
                    {fieldErrors.email && <p className="text-xs text-red-500">⚠ {fieldErrors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Phone <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <Input
                        type="tel"
                        placeholder="+265 99 000 0000"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Step 2: Education & Subjects ── */}
          {step === 2 && (
            <motion.div key="step2" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
              <div className="space-y-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600" /> What do you teach?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {COMMON_SUBJECTS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { toggleSubject(s); setFieldErrors((p) => ({ ...p, subjects: '' })); }}
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
                    {fieldErrors.subjects && <p className="text-xs text-red-500">⚠ {fieldErrors.subjects}</p>}

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
                  </CardContent>
                </Card>

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
                      <Label>Short Bio <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
                      <Textarea
                        placeholder="Briefly describe yourself and why you want to teach…"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Documents ── */}
          {step === 3 && (
            <motion.div key="step3" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" /> Verification Documents
                  </CardTitle>
                  <CardDescription>
                    Upload your degree certificate, teaching licence, or any credential.
                    PDF or image, max 5 files.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex flex-col items-center gap-2 p-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500 font-medium">Click to upload documents</span>
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
                            <p className="text-xs text-gray-400">
                              {(f.size / 1024).toFixed(0)} KB · {f.name.split('.').pop()?.toUpperCase()}
                            </p>
                          </div>
                          <button type="button" onClick={() => removeDoc(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-700 border border-amber-100">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    Documents are stored securely and only reviewed by our admin team.
                    You can also submit without documents and add them later.
                  </div>
                </CardContent>
              </Card>

              {/* Application summary */}
              <Card className="border-0 shadow-sm mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> Application Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="font-medium text-gray-900">{fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="font-medium text-gray-900">{email}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Subjects</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedSubjects.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Education</p>
                    <p className="font-medium text-gray-900">{educationBackground}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Documents</p>
                    <p className="font-medium text-gray-900">
                      {docFiles.length > 0 ? `${docFiles.length} file(s) attached` : 'None attached'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload progress */}
        {uploading && uploadStep && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">{uploadStep}</p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={goBack} disabled={uploading} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          )}

          {step < 3 ? (
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11 text-base gap-2"
              onClick={goNext}
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11 text-base gap-2"
              onClick={handleSubmit}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {uploadStep || 'Submitting…'}</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Submit Application</>
              )}
            </Button>
          )}
        </div>

        {/* Sign in link */}
        <p className="text-center text-xs text-gray-400">
          Already have an account?{' '}
          <Link href="/?auth=login" className="text-emerald-600 font-medium hover:text-emerald-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
