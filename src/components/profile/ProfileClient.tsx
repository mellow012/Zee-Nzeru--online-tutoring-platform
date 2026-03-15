'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Camera, Save, Star, CheckCircle2, Shield, AlertCircle,
  BookOpen, Users, Wallet, GraduationCap, Mail, Phone,
  Globe, Plus, X, Pencil, Eye, Upload, FileText,
  Loader2, Clock, XCircle, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import {
  updateBaseProfile, updateStudentProfile, updateTutorProfile,
  uploadAvatarAction, saveVerificationDataAction,
} from '@/app/profile/actions';
import type { ProfileData, StudentProfileData, TutorProfileData } from '@/app/profile/actions';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEZONES = [
  'Africa/Blantyre', 'Africa/Nairobi', 'Africa/Lagos',
  'Africa/Johannesburg', 'Europe/London', 'UTC',
];
const EDUCATION_LEVELS = [
  'Primary', 'Junior Secondary', 'Senior Secondary',
  'Certificate', 'Diploma', "Bachelor's Degree",
  "Master's Degree", 'PhD', 'Other',
];
const LEARNING_STYLES = ['Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic'];
const COMMON_LANGUAGES = ['English', 'Chichewa', 'Tumbuka', 'Yao', 'French', 'Portuguese', 'Swahili'];
const COMMON_SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
  'History', 'Geography', 'Economics', 'Computer Science', 'French',
  'Accounting', 'Business Studies', 'Music', 'Art',
];

const ROLE_THEME = {
  student: { grad: 'from-sky-400 to-blue-500',      pill: 'bg-sky-100 text-sky-700 border-sky-200' },
  tutor:   { grad: 'from-emerald-400 to-teal-500',  pill: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  admin:   { grad: 'from-violet-400 to-fuchsia-500', pill: 'bg-violet-100 text-violet-700 border-violet-200' },
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Verification status banner ───────────────────────────────────────────────

function VerificationBanner({ status, reason }: { status: string; reason?: string | null }) {
  if (status === 'approved') return null;

  const config = {
    not_submitted: {
      icon: AlertCircle,
      bg:   'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      icon_color: 'text-amber-600',
      msg:  'Complete your profile and submit verification documents to start accepting bookings.',
    },
    pending_review: {
      icon: Clock,
      bg:   'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon_color: 'text-blue-600',
      msg:  'Your documents are under review. We\'ll notify you within 24–48 hours.',
    },
    rejected: {
      icon: XCircle,
      bg:   'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon_color: 'text-red-600',
      msg:  reason ?? 'Your application was not approved. Please update your details and resubmit.',
    },
  }[status as keyof typeof config];

  if (!config) return null;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${config.bg}`}>
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${config.icon_color}`} />
      <div>
        <p className={`text-sm font-medium ${config.text}`}>
          {status === 'not_submitted' && 'Verification Required'}
          {status === 'pending_review' && 'Under Review'}
          {status === 'rejected' && 'Application Not Approved'}
        </p>
        <p className={`text-xs mt-0.5 ${config.text} opacity-80`}>{config.msg}</p>
      </div>
    </div>
  );
}

// ─── Read-only field ──────────────────────────────────────────────────────────

function ReadField({ label, value, icon: Icon }: {
  label: string; value?: string | null; icon?: React.ElementType;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        <p className="text-sm text-gray-900">{value || <span className="text-gray-400 italic">Not set</span>}</p>
      </div>
    </div>
  );
}

// ─── Tag chip ─────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange, placeholder, suggestions = [], editing }: {
  tags: string[]; onChange: (t: string[]) => void;
  placeholder?: string; suggestions?: string[]; editing: boolean;
}) {
  const [input, setInput] = useState('');

  const add = (val: string) => {
    const t = val.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  };
  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag));

  if (!editing) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {tags.length > 0
          ? tags.map((t) => (
              <span key={t} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                {t}
              </span>
            ))
          : <span className="text-sm text-gray-400 italic">None set</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
            {t}
            <button type="button" onClick={() => remove(t)}><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
          className="flex-1 h-8 text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => add(input)} className="h-8">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.filter((s) => !tags.includes(s)).slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Verification form (for unverified tutors) ────────────────────────────────

function VerificationForm({ data, onSubmitted }: {
  data: TutorProfileData;
  onSubmitted: () => void;
}) {
  const { toast }  = useToast();
  const [subjects,    setSubjects]    = useState<string[]>(data.subjects);
  const [hourlyRate,  setHourlyRate]  = useState(data.hourlyRate > 0 ? String(data.hourlyRate) : '');
  const [expYears,    setExpYears]    = useState(data.experienceYears > 0 ? String(data.experienceYears) : '');
  const [eduBg,       setEduBg]       = useState(data.educationBackground ?? '');
  const [bio,         setBio]         = useState(data.bio ?? '');
  const [style,       setStyle]       = useState(data.teachingStyle ?? '');
  const [docFiles,    setDocFiles]    = useState<File[]>([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [step,        setStep]        = useState('');
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  // Use a ref for the file input so re-renders don't wipe the file list
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRejected = data.verificationStatus === 'rejected';

  const validate = () => {
    const e: Record<string, string> = {};
    if (!subjects.length)     e.subjects  = 'Add at least one subject';
    if (!hourlyRate || Number(hourlyRate) <= 0) e.hourlyRate = 'Enter a valid rate';
    if (!eduBg.trim())        e.eduBg     = 'Required';
    if (!docFiles.length)     e.docs      = 'Upload at least one document';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const supabase = createClient();

    // Step 1: get current user client-side (avoids server action File serialization issue)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ variant: 'destructive', title: 'Session expired', description: 'Please sign in again.' });
      setSubmitting(false);
      return;
    }

    // Step 2: upload documents directly from browser to Supabase Storage
    const uploadedPaths: string[] = [];

    if (docFiles.length > 0) {
      for (let i = 0; i < docFiles.length; i++) {
        const file = docFiles[i];
        setStep(`Uploading document ${i + 1} of ${docFiles.length}…`);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path     = `${user.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('verification-docs')
          .upload(path, file, { upsert: false });

        if (uploadError) {
          const msg = uploadError.message;
          let friendly = `Upload failed: ${msg}`;
          if (msg.includes('Bucket') || msg.includes('not found'))
            friendly = 'Storage bucket "verification-docs" not found. Create it in Supabase dashboard.';
          else if (msg.includes('policy') || msg.includes('security') || msg.includes('403') || msg.includes('Unauthorized'))
            friendly = 'Storage permission denied. Add the upload RLS policy for verification-docs bucket.';

          toast({ variant: 'destructive', title: 'Upload failed', description: friendly });
          setSubmitting(false);
          setStep('');
          return;
        }
        uploadedPaths.push(path);
      }
    }

    // Step 3: call server action with serializable data only (no File objects)
    setStep('Saving profile…');
    const result = await saveVerificationDataAction({
      subjects,
      hourlyRate:          Number(hourlyRate),
      experienceYears:     Number(expYears) || 0,
      educationBackground: eduBg,
      bio,
      teachingStyle:       style,
      uploadedPaths,
    });

    setSubmitting(false);
    setStep('');

    if (result.success) {
      toast({ title: 'Submitted for review!', description: 'Our team will verify your profile within 24–48 hours.' });
      onSubmitted();
    } else {
      toast({ variant: 'destructive', title: 'Submission failed', description: result.error });
    }
  };

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    if (!newFiles.length) return;
    setDocFiles((p) => [...p, ...newFiles].slice(0, 5));
    // Reset via ref — safer than e.target.value on re-renders
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {isRejected ? 'Resubmit Verification' : 'Submit for Verification'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fill in all required fields and upload your credentials
          </p>
        </div>
        {isRejected && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <RefreshCw className="w-3 h-3" /> Resubmitting
          </span>
        )}
      </div>

      {/* Subjects */}
      <div className="space-y-1.5">
        <Label>Subjects You Teach <span className="text-red-500">*</span></Label>
        <TagInput tags={subjects} onChange={(t) => { setSubjects(t); setErrors((p) => ({ ...p, subjects: '' })); }} placeholder="Add subject…" suggestions={COMMON_SUBJECTS} editing />
        {errors.subjects && <p className="text-xs text-red-500">⚠ {errors.subjects}</p>}
      </div>

      {/* Rate + Experience */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Hourly Rate (MWK) <span className="text-red-500">*</span></Label>
          <Input
            type="number" placeholder="e.g. 15000" min="0"
            value={hourlyRate}
            onChange={(e) => { setHourlyRate(e.target.value); setErrors((p) => ({ ...p, hourlyRate: '' })); }}
            className={errors.hourlyRate ? 'border-red-300' : ''}
          />
          {errors.hourlyRate && <p className="text-xs text-red-500">⚠ {errors.hourlyRate}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Years of Experience</Label>
          <Input type="number" placeholder="e.g. 3" min="0" value={expYears} onChange={(e) => setExpYears(e.target.value)} />
        </div>
      </div>

      {/* Education background */}
      <div className="space-y-1.5">
        <Label>Education Background <span className="text-red-500">*</span></Label>
        <Input
          placeholder="e.g. BSc Mathematics, University of Malawi"
          value={eduBg}
          onChange={(e) => { setEduBg(e.target.value); setErrors((p) => ({ ...p, eduBg: '' })); }}
          className={errors.eduBg ? 'border-red-300' : ''}
        />
        {errors.eduBg && <p className="text-xs text-red-500">⚠ {errors.eduBg}</p>}
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <Label>Short Bio</Label>
        <Textarea placeholder="Describe your teaching approach…" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} />
      </div>

      {/* Teaching style */}
      <div className="space-y-1.5">
        <Label>Teaching Style <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
        <Input placeholder="e.g. Socratic method, problem-based" value={style} onChange={(e) => setStyle(e.target.value)} />
      </div>

      {/* Documents */}
      <div className="space-y-2">
        <Label>Verification Documents <span className="text-red-500">*</span></Label>
        {/* Hidden file input controlled via ref — not wrapped in label to avoid re-render issues */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={addFiles}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors"
        >
          <Upload className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Click to upload credentials</span>
          <span className="text-xs text-gray-400">Degree certificate, teaching licence — PDF, PNG, JPG</span>
        </button>
        {docFiles.length > 0 && (
          <div className="space-y-2">
            {docFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</p>
                </div>
                <button type="button" onClick={() => setDocFiles((p) => p.filter((_, j) => j !== i))}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
        {errors.docs && <p className="text-xs text-red-500">⚠ {errors.docs}</p>}
      </div>

      {/* Progress */}
      {submitting && step && (
        <div className="flex items-center gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
          <p className="text-sm text-emerald-700">{step}</p>
        </div>
      )}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" />{step}</>
        ) : (
          <>{isRejected ? <RefreshCw className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          {isRejected ? 'Resubmit for Review' : 'Submit for Verification'}</>
        )}
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileClient({ data }: { data: ProfileData }) {
  const { toast }  = useToast();
  const router     = useRouter();
  const fileRef    = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(data.avatarUrl);

  const theme    = ROLE_THEME[data.role];
  const sd       = data.role === 'student' ? (data as StudentProfileData) : null;
  const td       = data.role === 'tutor'   ? (data as TutorProfileData)   : null;

  const needsVerification = td && !td.verified &&
    (td.verificationStatus === 'not_submitted' || td.verificationStatus === 'rejected');

  const isPendingReview = td?.verificationStatus === 'pending_review';

  // ── Editable state ─────────────────────────────────────────────────────────
  const [fullName,    setFullName]    = useState(data.fullName);
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber ?? '');
  const [bio,         setBio]         = useState(data.bio ?? '');
  const [timezone,    setTimezone]    = useState(data.timezone);

  // Student
  const [educationLevel, setEducationLevel] = useState(sd?.educationLevel ?? '');
  const [interests,      setInterests]      = useState<string[]>(sd?.interests ?? []);
  const [learningGoals,  setLearningGoals]  = useState(sd?.learningGoals ?? '');
  const [learningStyle,  setLearningStyle]  = useState(sd?.preferredLearningStyle ?? '');

  // Tutor (non-verification editable fields)
  const [subjects,      setSubjects]      = useState<string[]>(td?.subjects ?? []);
  const [hourlyRate,    setHourlyRate]     = useState(String(td?.hourlyRate ?? ''));
  const [expYears,      setExpYears]       = useState(String(td?.experienceYears ?? ''));
  const [languages,     setLanguages]      = useState<string[]>(td?.languages ?? ['English']);
  const [eduBg,         setEduBg]          = useState(td?.educationBackground ?? '');
  const [teachStyle,    setTeachStyle]     = useState(td?.teachingStyle ?? '');
  const [acceptsGroup,  setAcceptsGroup]   = useState(td?.acceptsGroupSessions ?? false);

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarSrc(URL.createObjectURL(file));
    const fd = new FormData();
    fd.append('avatar', file);
    const result = await uploadAvatarAction(fd);
    if (result.success && result.url) {
      setAvatarSrc(result.url);
      toast({ title: 'Avatar updated!' });
      startTransition(() => router.refresh());
    } else {
      toast({ variant: 'destructive', title: 'Upload failed', description: result.error });
      setAvatarSrc(data.avatarUrl);
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);

    const baseResult = await updateBaseProfile({ fullName, phoneNumber, bio, timezone });
    if (!baseResult.success) {
      toast({ variant: 'destructive', title: 'Save failed', description: baseResult.error });
      setSaving(false);
      return;
    }

    if (data.role === 'student') {
      const r = await updateStudentProfile({ educationLevel, interests, learningGoals, preferredLearningStyle: learningStyle });
      if (!r.success) { toast({ variant: 'destructive', title: 'Save failed', description: r.error }); setSaving(false); return; }
    }

    if (data.role === 'tutor' && td?.verified) {
      const r = await updateTutorProfile({ subjects, hourlyRate: Number(hourlyRate) || 0, experienceYears: Number(expYears) || 0, languages, educationBackground: eduBg, teachingStyle: teachStyle, acceptsGroupSessions: acceptsGroup });
      if (!r.success) { toast({ variant: 'destructive', title: 'Save failed', description: r.error }); setSaving(false); return; }
    }

    toast({ title: 'Profile saved!' });
    setSaving(false);
    setEditing(false);
    startTransition(() => router.refresh());
  };

  const handleCancel = () => {
    // Reset all editable fields to original data
    setFullName(data.fullName);
    setPhoneNumber(data.phoneNumber ?? '');
    setBio(data.bio ?? '');
    setTimezone(data.timezone);
    if (sd) { setEducationLevel(sd.educationLevel ?? ''); setInterests(sd.interests); setLearningGoals(sd.learningGoals ?? ''); setLearningStyle(sd.preferredLearningStyle ?? ''); }
    if (td) { setSubjects(td.subjects); setHourlyRate(String(td.hourlyRate)); setExpYears(String(td.experienceYears)); setLanguages(td.languages); setEduBg(td.educationBackground ?? ''); setTeachStyle(td.teachingStyle ?? ''); setAcceptsGroup(td.acceptsGroupSessions); }
    setEditing(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Verification banner for tutors */}
        {td && (
          <VerificationBanner
            status={td.verificationStatus}
            reason={td.rejectionReason}
          />
        )}

        {/* ── Header card ── */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className={`h-20 bg-gradient-to-r ${theme.grad} opacity-15`} />
          <CardContent className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              {/* Avatar */}
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <Avatar className="w-20 h-20 border-4 border-white shadow-md">
                  <AvatarImage src={avatarSrc ?? undefined} />
                  <AvatarFallback className={`bg-gradient-to-br ${theme.grad} text-white font-bold text-xl`}>
                    {getInitials(fullName || data.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              {/* Edit / Save / Cancel buttons */}
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                  </>
                ) : (
                  // Only show Edit button if approved or not a tutor
                  (!td || td.verified) && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit Profile
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Name + role */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{data.fullName}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${theme.pill}`}>
                  {data.role.charAt(0).toUpperCase() + data.role.slice(1)}
                </span>
                {td?.verified && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />{data.email}
              </p>
              <p className="text-xs text-muted-foreground">
                Member since {format(new Date(data.createdAt), 'MMMM yyyy')}
              </p>
            </div>

            {/* Stats */}
            {sd && (
              <div className="grid grid-cols-3 gap-3 mt-5">
                {[
                  { icon: BookOpen, label: 'Sessions',   value: sd.totalSessions },
                  { icon: CheckCircle2, label: 'Completed', value: sd.completedSessions },
                  { icon: Wallet, label: 'Spent (MWK)', value: sd.totalSpent.toLocaleString() },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-lg font-bold">{value}</span>
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            )}

            {td && td.verified && (
              <div className="grid grid-cols-4 gap-3 mt-5">
                {[
                  { icon: Star,     label: 'Rating',   value: td.rating > 0 ? td.rating.toFixed(1) : '—' },
                  { icon: BookOpen, label: 'Sessions', value: td.totalSessions },
                  { icon: Users,    label: 'Students', value: td.totalStudents },
                  { icon: Wallet,   label: 'Rate/hr',  value: td.hourlyRate.toLocaleString() },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-lg font-bold">{value}</span>
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Basic info ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Basic Information</CardTitle>
            {editing && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><Pencil className="w-3 h-3" />Editing</span>}
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <Input className="pl-9" placeholder="+265 99 000 0000" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Bio</Label>
                  <Textarea placeholder="Tell others about yourself…" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={data.email} disabled className="bg-gray-50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <ReadField label="Full Name"   value={data.fullName}    />
                <ReadField label="Phone"       value={data.phoneNumber} icon={Phone} />
                <ReadField label="Email"       value={data.email}       icon={Mail}  />
                <ReadField label="Timezone"    value={data.timezone}    icon={Globe} />
                {data.bio && (
                  <div className="sm:col-span-2 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bio</p>
                    <p className="text-sm text-gray-900 leading-relaxed">{data.bio}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Student learning profile ── */}
        {data.role === 'student' && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Learning Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Education Level</Label>
                      <Select value={educationLevel} onValueChange={setEducationLevel}>
                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                        <SelectContent>{EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Learning Style</Label>
                      <Select value={learningStyle} onValueChange={setLearningStyle}>
                        <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                        <SelectContent>{LEARNING_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subjects I'm Interested In</Label>
                    <TagInput tags={interests} onChange={setInterests} placeholder="Add subject…" suggestions={COMMON_SUBJECTS} editing />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Learning Goals</Label>
                    <Textarea placeholder="What do you want to achieve?" value={learningGoals} onChange={(e) => setLearningGoals(e.target.value)} rows={2} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <ReadField label="Education Level"  value={sd?.educationLevel} />
                  <ReadField label="Learning Style"   value={sd?.preferredLearningStyle} />
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Interests</p>
                    <TagInput tags={sd?.interests ?? []} onChange={() => {}} editing={false} />
                  </div>
                  {sd?.learningGoals && (
                    <div className="sm:col-span-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Learning Goals</p>
                      <p className="text-sm text-gray-900 leading-relaxed">{sd.learningGoals}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Tutor — verified: show teaching profile (read/edit) ── */}
        {td && td.verified && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Teaching Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Subjects</Label>
                    <TagInput tags={subjects} onChange={setSubjects} placeholder="Add subject…" suggestions={COMMON_SUBJECTS} editing />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Hourly Rate (MWK)</Label>
                      <Input type="number" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Years of Experience</Label>
                      <Input type="number" min="0" value={expYears} onChange={(e) => setExpYears(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Languages</Label>
                    <TagInput tags={languages} onChange={setLanguages} placeholder="Add language…" suggestions={COMMON_LANGUAGES} editing />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Education Background</Label>
                    <Input value={eduBg} onChange={(e) => setEduBg(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Teaching Style</Label>
                    <Input value={teachStyle} onChange={(e) => setTeachStyle(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-medium">Accept Group Sessions</p>
                      <p className="text-xs text-muted-foreground">Allow multiple students per session</p>
                    </div>
                    <Switch checked={acceptsGroup} onCheckedChange={setAcceptsGroup} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subjects</p>
                    <TagInput tags={td.subjects} onChange={() => {}} editing={false} />
                  </div>
                  <ReadField label="Hourly Rate"          value={`MWK ${td.hourlyRate.toLocaleString()}`} icon={Wallet} />
                  <ReadField label="Experience"           value={`${td.experienceYears} year${td.experienceYears !== 1 ? 's' : ''}`} />
                  <ReadField label="Education Background" value={td.educationBackground} />
                  <ReadField label="Teaching Style"       value={td.teachingStyle} />
                  <div className="sm:col-span-2 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Languages</p>
                    <TagInput tags={td.languages} onChange={() => {}} editing={false} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Tutor — not verified: show verification form ── */}
        {td && needsVerification && (
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
            <CardContent className="pt-6">
              <VerificationForm
                data={td}
                onSubmitted={() => {
                  startTransition(() => router.push('/tutor/pending'));
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* ── Tutor — pending review ── */}
        {td && isPendingReview && (
          <Card className="border-0 shadow-sm border-l-4 border-l-blue-400">
            <CardContent className="pt-6 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Verification in progress</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your documents have been submitted and are being reviewed by our admin team.
                  This typically takes 24–48 hours. You'll be notified by email when a decision is made.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Admin badge ── */}
        {data.role === 'admin' && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Platform Administrator</p>
                <p className="text-xs text-muted-foreground">Full platform access.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom save button (only when editing) */}
        {editing && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Changes</>}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}