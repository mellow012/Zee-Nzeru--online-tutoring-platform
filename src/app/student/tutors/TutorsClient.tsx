'use client';

import { useState, useRef,useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Search, CheckCircle2, GraduationCap, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookingDialog } from '@/components/dialogs/Booking-dialog';
import { PaymentDialog } from '@/components/dialogs/Payment-dialog';
import { useToast } from '@/hooks/use-toast';
import type { TutorCard } from '../action';
import type { Session } from '@/lib/types';

const POPULAR_SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'English', 'History', 'Computer Science', 'Economics',
];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function TutorSearchCard({ tutor, onBook, onMessage }: { tutor: TutorCard; onBook: (t: TutorCard) => void; onMessage: (t: TutorCard) => void }) {
  return (
    <Card className="shadow-sm border-0 hover:shadow-md transition-shadow duration-200 flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1 gap-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={tutor.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-emerald-50 text-emerald-700 font-semibold text-sm">
              {getInitials(tutor.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm truncate">{tutor.fullName}</p>
              {tutor.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium">{tutor.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                · {tutor.totalSessions} sessions · {tutor.experienceYears}y exp
              </span>
            </div>
          </div>
        </div>

        {tutor.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2">{tutor.bio}</p>
        )}

        <div className="flex flex-wrap gap-1.5 flex-1">
          {tutor.subjects.slice(0, 4).map((s) => (
            <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{s}</span>
          ))}
          {tutor.subjects.length > 4 && (
            <span className="text-xs text-muted-foreground self-center">+{tutor.subjects.length - 4}</span>
          )}
        </div>

        {tutor.languages.length > 0 && (
          <p className="text-xs text-muted-foreground">Teaches in: {tutor.languages.join(', ')}</p>
        )}

        {tutor.latestReview ? (
          <div className="mt-2 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`w-3 h-3 ${
                      idx < tutor.latestReview!.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-semibold text-slate-500">Latest Review</span>
            </div>
            <p className="text-[11px] text-slate-600 italic line-clamp-2">
              "{tutor.latestReview.comment || 'Excellent tutor, highly recommended!'}"
            </p>
            <p className="text-[9px] text-slate-400 font-medium text-right">
              — {tutor.latestReview.reviewer_name}
            </p>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div>
            <span className="text-base font-bold text-emerald-600">MWK {tutor.hourlyRate.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground"> /hr</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-8 text-xs gap-1"
              onClick={() => onMessage(tutor)}
            >
              Message
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs" onClick={() => onBook(tutor)}>
              Book Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Props {
  initialTutors: TutorCard[];
  total: number;
  initialQuery: string;
  initialSubject: string;
  initialPage: number;
  allSubjects: string[];
}

export function TutorsClient({ initialTutors, total, initialQuery, initialSubject, initialPage, allSubjects }: Props) {
  const router   = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [mounted,      setMounted]      = useState(false);
  const [query,        setQuery]        = useState(initialQuery);

  const popularSet  = new Set(POPULAR_SUBJECTS);
  const extraSubjects = allSubjects.filter((s) => !popularSet.has(s));
  const [subject,      setSubject]      = useState(initialSubject);
  const [page,         setPage]         = useState(initialPage);
  const [bookingTutor, setBookingTutor] = useState<TutorCard | null>(null);
  const [paymentSession, setPaymentSession] = useState<Session | null>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const PAGE_SIZE = 12;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const triggerSearch = (q: string, s: string, p: number) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (s) params.set('subject', s);
      if (p > 0) params.set('page', p.toString());
      startTransition(() => {
        router.push(`/student/tutors${params.toString() ? `?${params}` : ''}`);
      });
    }, 400);
  };

  const handleQueryChange = (v: string) => { setQuery(v); setPage(0); triggerSearch(v, subject, 0); };
  const handleSubjectChange = (v: string) => {
    const next = v === 'all' ? '' : v;
    setSubject(next);
    setPage(0);
    triggerSearch(query, next, 0);
  };
  const handlePageChange = (p: number) => {
    setPage(p);
    triggerSearch(query, subject, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookingSuccess = () => {
    toast({ title: 'Session requested!', description: 'Waiting for tutor confirmation.' });
    startTransition(() => router.refresh());
  };

  const handlePaymentSuccess = () => {
    toast({ title: 'Booking confirmed!' });
    router.push('/student/sessions');
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-semibold">Find a Tutor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} verified tutor{total !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Search bar */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or subject…"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="pl-9 pr-8 bg-white border-gray-200"
            />
            {query && (
              <button onClick={() => handleQueryChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {mounted ? (
            <Select value={subject || 'all'} onValueChange={handleSubjectChange}>
              <SelectTrigger className="w-full sm:w-48 bg-white border-gray-200">
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {POPULAR_SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                {extraSubjects.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">More subjects</div>
                    {extraSubjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </>
                )}
              </SelectContent>
            </Select>
          ) : (
            <div className="w-full sm:w-48 h-10 bg-white border border-gray-200 rounded-md animate-pulse" />
          )}
        </div>

        {/* Subject chips */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {POPULAR_SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => handleSubjectChange(subject === s ? '' : s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  subject === s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {extraSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pr-1">
                More
              </span>
              {extraSubjects.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSubjectChange(subject === s ? '' : s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    subject === s
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {isPending ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-3 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded w-4/5" />
                  <div className="flex gap-1.5">
                    <div className="h-5 w-16 bg-gray-100 rounded-md" />
                    <div className="h-5 w-20 bg-gray-100 rounded-md" />
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-50">
                    <div className="h-4 w-24 bg-gray-100 rounded" />
                    <div className="h-8 w-20 bg-gray-100 rounded-md" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : initialTutors.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
              <div className="p-3 rounded-full bg-gray-100">
                <GraduationCap className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium">No tutors found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  {query
                    ? `No tutors matching "${query}". Try a shorter name or browse by subject.`
                    : 'Try a different subject or clear your filters'}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setQuery(''); setSubject(''); setPage(0); router.push('/student/tutors'); }}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {initialTutors.map((tutor) => (
                <TutorSearchCard 
                  key={tutor.userId} 
                  tutor={tutor} 
                  onBook={setBookingTutor} 
                  onMessage={(t) => router.push(`/student/messages?peerId=${t.userId}`)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Pagination className="mt-8 justify-center pb-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(Math.max(0, page - 1))}
                      className={page === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }).map((_, i) => {
                    // Show first, last, current, and adjacent pages
                    if (i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1) {
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink 
                            isActive={page === i}
                            onClick={() => handlePageChange(i)}
                            className="cursor-pointer"
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    if (Math.abs(i - page) === 2) {
                      return <PaginationItem key={i}><PaginationEllipsis /></PaginationItem>;
                    }
                    return null;
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(Math.min(totalPages - 1, page + 1))}
                      className={page >= totalPages - 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>

      <BookingDialog
        tutor={bookingTutor}
        open={!!bookingTutor}
        onClose={() => setBookingTutor(null)}
        onSuccess={handleBookingSuccess}
      />
      {paymentSession && (
        <PaymentDialog
          session={paymentSession}
          open={!!paymentSession}
          onClose={() => setPaymentSession(null)}
        />
      )}
    </div>
  );
}