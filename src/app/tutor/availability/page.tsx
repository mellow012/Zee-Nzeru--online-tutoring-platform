'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, Trash2, Loader2, Info, CheckCircle2, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  getTutorAvailability,
  upsertAvailabilitySlot,
  deleteAvailabilitySlot,
  type AvailabilitySlot,
} from '@/app/availability/actions';

// ─── Config ───────────────────────────────────────────────────────────────────

const DAYS = [
  { label: 'Monday',    short: 'Mon', dow: 1 },
  { label: 'Tuesday',   short: 'Tue', dow: 2 },
  { label: 'Wednesday', short: 'Wed', dow: 3 },
  { label: 'Thursday',  short: 'Thu', dow: 4 },
  { label: 'Friday',    short: 'Fri', dow: 5 },
  { label: 'Saturday',  short: 'Sat', dow: 6 },
  { label: 'Sunday',    short: 'Sun', dow: 0 },
];

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:00`);
  if (h < 22) TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:30`);
}

function fmt(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// ─── Slot chip ────────────────────────────────────────────────────────────────

function SlotChip({ slot, onDelete }: {
  slot: AvailabilitySlot;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.15 }}
      className="group flex items-center justify-between gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-2"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Clock className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
        <span className="text-[11px] font-semibold text-emerald-800 leading-tight">
          {slot.specificDate && (
            <span className="block text-[10px] font-normal text-emerald-600 mb-0.5">{slot.specificDate}</span>
          )}
          {fmt(slot.startTime)}<br />
          <span className="font-normal text-emerald-500">→ {fmt(slot.endTime)}</span>
        </span>
      </div>
      <button
        onClick={async () => { setDeleting(true); await onDelete(slot.id); }}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-300 hover:text-red-400 shrink-0"
      >
        {deleting
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <Trash2 className="w-3 h-3" />}
      </button>
    </motion.div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Today as YYYY-MM-DD in local time
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── Inline add form ──────────────────────────────────────────────────────────

function AddSlotForm({ dayOfWeek, onAdd, onCancel }: {
  dayOfWeek: number;
  onAdd: (start: string, end: string, specificDate: string | null, isRecurring: boolean) => Promise<void>;
  onCancel: () => void;
}) {
  const [mode,   setMode]   = useState<'recurring'|'specific'>('specific');
  const [date,   setDate]   = useState(todayISO());
  const [start,  setStart]  = useState('09:00');
  const [end,    setEnd]    = useState('11:00');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleAdd = async () => {
    if (start >= end) { setError('End must be after start'); return; }
    if (mode === 'specific' && !date) { setError('Pick a date'); return; }
    setSaving(true);
    setError('');
    await onAdd(
      start,
      end,
      mode === 'specific' ? date : null,
      mode === 'recurring'
    );
    setStart('09:00');
    setEnd('11:00');
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
      className="overflow-hidden"
    >
      <div className="pt-2 space-y-2 border-t border-emerald-100 mt-2">
        <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
          Add slot
        </p>

        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-[10px] font-medium">
          <button
            onClick={() => setMode('specific')}
            className={`flex-1 py-1.5 transition-colors ${
              mode === 'specific'
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            Specific Date
          </button>
          <button
            onClick={() => setMode('recurring')}
            className={`flex-1 py-1.5 transition-colors ${
              mode === 'recurring'
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            Every Week
          </button>
        </div>

        {/* Date picker — only for specific mode */}
        {mode === 'specific' && (
          <div className="space-y-1">
            <p className="text-[10px] text-gray-500">Date</p>
            <input
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => { setDate(e.target.value); setError(''); }}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>
        )}

        {mode === 'recurring' && (
          <p className="text-[10px] text-gray-400 bg-gray-50 rounded-lg px-2 py-1.5">
            Repeats every {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayOfWeek]}
          </p>
        )}

        {/* Start time */}
        <div className="space-y-1">
          <p className="text-[10px] text-gray-500">Start</p>
          <select
            value={start}
            onChange={(e) => { setStart(e.target.value); setError(''); }}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          >
            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </div>

        {/* End time */}
        <div className="space-y-1">
          <p className="text-[10px] text-gray-500">End</p>
          <select
            value={end}
            onChange={(e) => { setEnd(e.target.value); setError(''); }}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          >
            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </div>

        {error && <p className="text-[10px] text-red-500">⚠ {error}</p>}

        <div className="flex gap-1.5">
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={saving}
            className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
          >
            {saving
              ? <><Loader2 className="w-3 h-3 animate-spin" />Saving…</>
              : <><CheckCircle2 className="w-3 h-3" />Add</>}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={saving} className="h-7 text-xs px-2.5">
            Done
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Day column ───────────────────────────────────────────────────────────────

function DayColumn({ day, slots, onAdd, onDelete }: {
  day: typeof DAYS[number];
  slots: AvailabilitySlot[];
  onAdd: (dow: number, start: string, end: string, specificDate: string | null, isRecurring: boolean) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const hasSlots = slots.length > 0;

  return (
    <div className="flex flex-col min-w-0">

      {/* Day header — always clearly readable */}
      <div className={`rounded-2xl p-3 text-center border-2 transition-all duration-200 ${
        hasSlots
          ? 'bg-white border-emerald-400 shadow-sm shadow-emerald-100'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {day.short}
        </p>
        <p className="text-sm font-bold mt-0.5 text-gray-800">
          {day.label}
        </p>
        {hasSlots ? (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            {slots.length} slot{slots.length !== 1 ? 's' : ''}
          </span>
        ) : (
          <p className="text-[10px] text-gray-400 mt-1.5">No slots</p>
        )}
      </div>

      {/* Card body — expands when form is open */}
      <div className={`mt-2 rounded-2xl border transition-all duration-200 ${
        showForm
          ? 'border-emerald-200 bg-emerald-50/50 shadow-sm'
          : 'border-transparent bg-transparent'
      }`}>
        <div className={`${showForm || hasSlots ? 'p-2.5' : 'p-1'} space-y-1.5`}>

          {/* Existing slots */}
          <AnimatePresence>
            {slots.map((slot) => (
              <SlotChip key={slot.id} slot={slot} onDelete={onDelete} />
            ))}
          </AnimatePresence>

          {/* Inline add form — expands below existing slots */}
          <AnimatePresence>
            {showForm && (
              <AddSlotForm
                dayOfWeek={day.dow}
                onAdd={async (start, end, specificDate, isRecurring) => {
                  await onAdd(day.dow, start, end, specificDate, isRecurring);
                }}
                onCancel={() => setShowForm(false)}
              />
            )}
          </AnimatePresence>

          {/* Add button — shown when form is closed */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-400 hover:text-emerald-600 border border-dashed border-gray-200 hover:border-emerald-300 rounded-xl transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TutorAvailabilityPage() {
  const { toast }  = useToast();
  const [slots,   setSlots]   = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTutorAvailability().then((data) => {
      setSlots(data);
      setLoading(false);
    });
  }, []);

  const getSlotsForDay = (dow: number) =>
    slots.filter((s) => s.dayOfWeek === dow && s.isRecurring);

  const handleAdd = async (dow: number, start: string, end: string, specificDate: string | null, isRecurring: boolean) => {
    const result = await upsertAvailabilitySlot({
      dayOfWeek:    isRecurring ? dow : undefined,
      specificDate: specificDate ?? undefined,
      startTime:    start,
      endTime:      end,
      isRecurring,
    });
    if (result.success && result.id) {
      setSlots((prev) => [...prev, {
        id:           result.id!,
        dayOfWeek:    isRecurring ? dow : dow,
        specificDate: specificDate,
        startTime:    start,
        endTime:      end,
        isRecurring,
        isAvailable:  true,
      }]);
      toast({ title: specificDate ? `Slot added for ${specificDate}` : 'Recurring slot added!' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to add', description: result.error });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteAvailabilitySlot(id);
    if (result.success) {
      setSlots((prev) => prev.filter((s) => s.id !== id));
      toast({ title: 'Slot removed' });
    } else {
      toast({ variant: 'destructive', title: 'Failed to remove', description: result.error });
    }
  };

  const totalSlots = slots.filter((s) => s.isRecurring).length;
  const activeDays = new Set(slots.filter((s) => s.isRecurring).map((s) => s.dayOfWeek)).size;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Weekly Availability</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set the days and times you&apos;re available. Students can only book during these windows.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-sm font-semibold">{activeDays}</span>
              <span className="text-xs text-muted-foreground">active days</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-sm font-semibold">{totalSlots}</span>
              <span className="text-xs text-muted-foreground">total slots</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-100 rounded-2xl">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Click <strong>Add</strong> under any day to set a time window. You can add as many slots
            per day as you like — students book 1-hour sessions within these windows.
            Hover a slot to delete it.
          </p>
        </div>

        {/* Week grid */}
        {loading ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="grid grid-cols-7 gap-3 min-w-[700px]">
                {DAYS.map((d) => (
                  <div key={d.dow} className="space-y-2">
                    <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                    <div className="h-8 bg-gray-50 rounded-xl animate-pulse" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="overflow-x-auto">
                <div className="grid grid-cols-7 gap-3 min-w-[700px]">
                  {DAYS.map((day) => (
                    <DayColumn
                      key={day.dow}
                      day={day}
                      slots={getSlotsForDay(day.dow)}
                      onAdd={handleAdd}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && totalSlots === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Click <strong>Add</strong> under any day to set your first availability slot.
          </p>
        )}
      </div>
    </div>
  );
}