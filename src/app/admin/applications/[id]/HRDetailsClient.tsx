'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Mail, Phone, Calendar, BookOpen,
  UserCheck, UserX, FileText, CheckCircle2, AlertCircle,
  ExternalLink, GraduationCap
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Document {
  name: string;
  url: string;
  type: 'pdf' | 'image' | 'other';
}

interface HRDetailsClientProps {
  application: any;
  documents: Document[];
}

export function HRDetailsClient({ application, documents }: HRDetailsClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [activeDocIndex, setActiveDocIndex] = useState(0);

  // Dialogs
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/tutor-applications/${application.id}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Application approved!',
        description: `An invite email has been sent to ${application.email}.`,
      });
      router.refresh();
      setShowApprove(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Approval failed', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/tutor-applications/${application.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({ title: 'Application rejected' });
      router.refresh();
      setShowReject(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Rejection failed', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Layout ──────────────────────────────────────────────────────────────

  const isPending = application.status === 'pending';
  const isApproved = application.status === 'approved';
  const isRejected = application.status === 'rejected';

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-4">
          <Link href="/admin/applications">
            <Button variant="ghost" size="icon" className="h-9 w-9 border">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{application.full_name}</h1>
              {isPending && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending Review</Badge>}
              {isApproved && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>}
              {isRejected && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Mail size={14} /> {application.email}
              {application.phone_number && (
                <>
                  <span className="text-gray-300">|</span>
                  <Phone size={14} /> {application.phone_number}
                </>
              )}
            </p>
          </div>
        </div>

        {isPending && (
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowReject(true)}>
              <UserX size={16} className="mr-2" /> Reject
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowApprove(true)}>
              <UserCheck size={16} className="mr-2" /> Approve & Invite
            </Button>
          </div>
        )}
      </div>

      {isRejected && application.rejection_reason && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Rejection Reason:</p>
            <p className="mt-1">{application.rejection_reason}</p>
          </div>
        </div>
      )}

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Details (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-gray-50/50 pb-4 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-600" /> Teaching Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subjects</p>
                <div className="flex flex-wrap gap-1.5">
                  {application.subjects.map((s: string) => (
                    <Badge key={s} variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar size={12} /> Experience
                  </p>
                  <p className="text-sm font-medium">{application.experience_years} years</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <GraduationCap size={12} /> Education
                  </p>
                  <p className="text-sm font-medium">{application.education_background || 'Not provided'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Short Bio</p>
                {application.bio ? (
                  <div className="p-3 bg-muted/30 rounded-lg text-sm text-gray-700 leading-relaxed border">
                    {application.bio}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No bio provided.</p>
                )}
              </div>

            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="bg-gray-50/50 pb-4 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" /> Application Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Submitted</span>
                <span className="font-medium">{new Date(application.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Documents Attached</span>
                <span className="font-medium">{documents.length} files</span>
              </div>
              {application.invite_sent_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invite Sent</span>
                  <span className="font-medium text-emerald-600">{new Date(application.invite_sent_at).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Col: Documents (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="border-border shadow-sm h-full min-h-[600px] flex flex-col overflow-hidden">
            <CardHeader className="bg-gray-50/50 pb-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText size={16} className="text-emerald-600" /> Verification Documents
                </CardTitle>
                <CardDescription className="mt-1">Review applicant credentials</CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 flex flex-col flex-1">
              {documents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <FileText size={24} className="opacity-50" />
                  </div>
                  <p className="font-medium text-gray-900">No documents attached</p>
                  <p className="text-sm mt-1 max-w-sm">This applicant did not upload any verification files. You may need to request them manually.</p>
                </div>
              ) : (
                <div className="flex flex-col h-full min-h-[500px]">
                  
                  {/* Tabs */}
                  <div className="flex overflow-x-auto border-b bg-muted/10 hide-scrollbar p-2 gap-2">
                    {documents.map((doc, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveDocIndex(idx)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all whitespace-nowrap ${
                          activeDocIndex === idx 
                            ? 'bg-white shadow-sm border border-gray-200 text-emerald-700 font-medium' 
                            : 'text-muted-foreground hover:bg-white/50 hover:text-gray-900'
                        }`}
                      >
                        <FileText size={14} />
                        <span className="truncate max-w-[150px]">{doc.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Viewer */}
                  <div className="flex-1 bg-gray-100/50 relative overflow-hidden group">
                    {documents[activeDocIndex].type === 'pdf' ? (
                      <iframe 
                        src={`${documents[activeDocIndex].url}#toolbar=0`} 
                        className="w-full h-[600px] border-0"
                        title={documents[activeDocIndex].name}
                      />
                    ) : documents[activeDocIndex].type === 'image' ? (
                      <div className="w-full h-[600px] relative p-4 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={documents[activeDocIndex].url} 
                          alt={documents[activeDocIndex].name}
                          className="max-w-full max-h-full object-contain rounded shadow-sm border bg-white"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-[600px] flex flex-col items-center justify-center bg-white">
                        <FileText size={48} className="text-gray-300 mb-4" />
                        <p className="text-muted-foreground font-medium">Cannot preview this file type directly.</p>
                        <a 
                          href={documents[activeDocIndex].url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-4 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm bg-emerald-50 px-4 py-2 rounded-full transition-colors"
                        >
                          Download File <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                    
                    {/* Open in new tab overlay button */}
                    <a 
                      href={documents[activeDocIndex].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-4 right-4 bg-white/90 backdrop-blur border shadow-sm text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-700 hover:text-emerald-600"
                    >
                      <ExternalLink size={12} /> Open original
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* ── Approve Dialog ── */}
      <Dialog open={showApprove} onOpenChange={setShowApprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck size={18} className="text-emerald-600" /> Approve Application
            </DialogTitle>
            <DialogDescription>
              This will send an invitation email to <strong>{application.email}</strong> with a link to activate their tutor account.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2 text-sm">
            <p className="font-medium text-emerald-800">What happens next:</p>
            <ul className="text-emerald-700 space-y-1 pl-4 list-disc text-xs">
              <li>Supabase sends a magic-link email to the applicant</li>
              <li>They click the link and set a password</li>
              <li>Their tutor account is created with pre-filled profile data</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprove(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? 'Sending invite…' : 'Confirm & Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ── */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX size={18} className="text-red-500" /> Reject Application
            </DialogTitle>
            <DialogDescription>
              Rejecting <strong>{application.full_name}</strong>&apos;s application. Provide an optional reason for internal records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="e.g. Insufficient experience..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              {isProcessing ? 'Rejecting…' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
