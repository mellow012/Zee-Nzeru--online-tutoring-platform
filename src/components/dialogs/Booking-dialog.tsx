'use client';

import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, ChevronLeft, ChevronRight,
  CheckCircle2, Loader2, AlertCircle, BookOpen,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  getAvailableDates,
  getOpenSlotsForDate,
  type OpenSlot,
} from '@/app/availability/actions';
import type { TutorCard } from '@/app/student/action';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingDialogProps {
  tutor: TutorCard | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'date' | 'slot' | 'confirm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert date + HH:MM to ISO string with local timezone offset */
function toLocalISO(date: string, time: string): string {
  const offsetMin = -new Date().getTimezoneOffset(); // e.g. 120 for UTC+2
  const sign      = offsetMin >= 0 ? '+' : '-';
  const absOff    = Math.abs(offsetMin);
  const offH      = String(Math.floor(absOff / 60)).padStart(2, '0');
  const offM      = String(absOff % 60).padStart(2, '0');
  return `${date}T${time}:00${sign}${offH}:${offM}`;
}

function fmt(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  const steps: Step[] = ['date', 'slot', 'confirm'];
  const labels = ['Pick Date', 'Pick Time', 'Confirm'];
  const idx = steps.indexOf(step);

  return (
    <div className="flex items-center gap-2 mb-5">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 ${i <= idx ? 'text-emerald-600' : 'text-gray-400'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              i < idx  ? 'bg-emerald-500 text-white' :
              i === idx ? 'bg-emerald-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className="text-xs font-medium hidden sm:block">{labels[i]}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px w-8 ${i < idx ? 'bg-emerald-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Date picker ──────────────────────────────────────────────────────────────

function DatePicker({ availableDates, selected, onSelect }: {
  availableDates: string[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const today     = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const availSet    = new Set(availableDates);

  const navigate = (dir: number) => {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const days: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold">
          {MONTH_NAMES[month]} {year}
        </p>
        <button
          onClick={() => navigate(1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;

          const iso      = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isAvail  = availSet.has(iso);
          const isPast   = new Date(iso) <= today;
          const isSel    = selected === iso;
          const disabled = !isAvail || isPast;

          return (
            <button
              key={iso}
              onClick={() => !disabled && onSelect(iso)}
              disabled={disabled}
              className={`
                aspect-square rounded-xl text-xs font-medium transition-all
                ${isSel     ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' :
                  isAvail && !isPast ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' :
                  'text-gray-300 cursor-not-allowed'}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {availableDates.length === 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">
            This tutor hasn&apos;t set their availability yet.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Slot picker ──────────────────────────────────────────────────────────────

function SlotPicker({ date, tutorId, selected, onSelect }: {
  date: string;
  tutorId: string;
  selected: OpenSlot | null;
  onSelect: (slot: OpenSlot) => void;
}) {
  const [slots,   setSlots]   = useState<OpenSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Get browser's UTC offset in minutes (positive = east of UTC)
    const tzOffset = -new Date().getTimezoneOffset();
    getOpenSlotsForDate(tutorId, date, tzOffset).then((s) => {
      setSlots(s);
      setLoading(false);
    });
  }, [tutorId, date]);

  const dateLabel = format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
        <p className="text-sm font-semibold text-gray-900">{dateLabel}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading available slots…</span>
        </div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Clock className="w-8 h-8 text-gray-300" />
          <p className="text-sm text-muted-foreground">No open slots on this date</p>
          <p className="text-xs text-gray-400">Try selecting a different day</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {slots.map((slot) => {
            const isSel = selected?.startTime === slot.startTime;
            return (
              <button
                key={slot.startTime}
                onClick={() => onSelect(slot)}
                className={`
                  p-3 rounded-xl border text-left transition-all
                  ${isSel
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-100'
                    : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'}
                `}
              >
                <p className={`text-sm font-semibold ${isSel ? 'text-white' : 'text-gray-900'}`}>
                  {fmt(slot.startTime)}
                </p>
                <p className={`text-[11px] mt-0.5 ${isSel ? 'text-white/80' : 'text-gray-400'}`}>
                  to {fmt(slot.endTime)} · 1h
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function BookingDialog({ tutor, open, onClose, onSuccess }: BookingDialogProps) {
  const { toast } = useToast();

  const [step,           setStep]           = useState<Step>('date');
  const [selectedDate,   setSelectedDate]   = useState<string | null>(null);
  const [selectedSlot,   setSelectedSlot]   = useState<OpenSlot | null>(null);
  const [selectedSubject,setSelectedSubject]= useState('');
  const [notes,          setNotes]          = useState('');
  const [availDates,     setAvailDates]     = useState<string[]>([]);
  const [loadingDates,   setLoadingDates]   = useState(false);
  const [booking,        setBooking]        = useState(false);

  // Reset when dialog opens/tutor changes
  useEffect(() => {
    if (!open || !tutor) return;
    setStep('date');
    setSelectedDate(null);
    setSelectedSlot(null);
    setNotes('');
    setSelectedSubject(tutor.subjects[0] ?? '');
    setLoadingDates(true);
    const tz = -new Date().getTimezoneOffset();
    getAvailableDates(tutor.userId, tz).then((dates) => {
      setAvailDates(dates);
      setLoadingDates(false);
    });
  }, [open, tutor]);

  const price = tutor ? tutor.hourlyRate : 0;

  const handleBook = async () => {
    if (!tutor || !selectedDate || !selectedSlot) return;
    setBooking(true);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorId:            tutor.userId,
          subject:            selectedSubject,
          // Include timezone offset so Postgres stores the correct UTC time
          scheduledStartTime: toLocalISO(selectedDate, selectedSlot.startTime),
          scheduledEndTime:   toLocalISO(selectedDate, selectedSlot.endTime),
          studentNotes:       notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.success || res.ok) {
        toast({ title: 'Session requested!', description: 'Waiting for tutor confirmation.' });
        onSuccess();
        onClose();
      } else {
        toast({
          variant:     'destructive',
          title:       'Booking failed',
          description: data.error ?? 'Please try again.',
        });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Network error', description: 'Please try again.' });
    } finally {
      setBooking(false);
    }
  };

  if (!tutor) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <VisuallyHidden><DialogTitle>Book a session</DialogTitle></VisuallyHidden>

        <div className="space-y-1">
          {/* Tutor info */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {tutor.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">{tutor.fullName}</p>
              <p className="text-xs text-muted-foreground">
                MWK {tutor.hourlyRate.toLocaleString()} / hour
              </p>
            </div>
          </div>

          <StepBar step={step} />

          <AnimatePresence mode="wait">

            {/* ── Step 1: Date ── */}
            {step === 'date' && (
              <motion.div
                key="date"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Choose a date</p>
                  <p className="text-xs text-muted-foreground">Green dates have open slots</p>
                </div>

                {loadingDates ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading availability…</span>
                  </div>
                ) : (
                  <DatePicker
                    availableDates={availDates}
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                  />
                )}

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={!selectedDate}
                  onClick={() => setStep('slot')}
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {/* ── Step 2: Time slot ── */}
            {step === 'slot' && selectedDate && (
              <motion.div
                key="slot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Choose a time slot</p>
                  <p className="text-xs text-muted-foreground">All times are 1-hour sessions</p>
                </div>

                <SlotPicker
                  date={selectedDate}
                  tutorId={tutor.userId}
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                />

                {/* Subject picker */}
                {tutor.subjects.length > 1 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Subject</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {tutor.subjects.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelectedSubject(s)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            selectedSubject === s
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('date')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={!selectedSlot}
                    onClick={() => setStep('confirm')}
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Confirm ── */}
            {step === 'confirm' && selectedDate && selectedSlot && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <p className="text-sm font-semibold text-gray-900">Confirm booking</p>

                {/* Summary card */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-semibold">
                        {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="text-sm font-semibold">{selectedSlot.label}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <BookOpen className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Subject</p>
                      <p className="text-sm font-semibold">{selectedSubject}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Session fee</p>
                    <p className="text-base font-bold text-emerald-600">
                      MWK {price.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Notes for tutor <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    placeholder="Topics to cover, your current level, any specific questions…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('slot')} disabled={booking} className="flex-1">
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                    onClick={handleBook}
                    disabled={booking}
                  >
                    {booking
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Booking…</>
                      : <><CheckCircle2 className="w-4 h-4" />Confirm Booking</>}
                  </Button>
                </div>

                <p className="text-[11px] text-center text-gray-400">
                  Payment is collected after the tutor confirms the session.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}