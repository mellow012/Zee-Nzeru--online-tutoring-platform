'use server';

import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;       // 0=Sun … 6=Sat, null if specific date
  specificDate: string | null;
  startTime: string;       // "HH:MM"
  endTime: string;         // "HH:MM"
  isRecurring: boolean;
  isAvailable: boolean;
}

export interface OpenSlot {
  startTime: string;  // "HH:MM"
  endTime: string;
  durationMinutes: number;
  label: string;      // "09:00 – 11:00 (2h)"
}


// Explicit row type — avoids Supabase GenericStringError on select inference
type AvailabilityRow = {
  id: string;
  tutor_id?: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  is_available: boolean;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Tutor: get own availability ──────────────────────────────────────────────

export async function getTutorAvailability(): Promise<AvailabilitySlot[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await (supabase
    .from('availability')
    .select('id, day_of_week, specific_date, start_time, end_time, is_recurring, is_available')
    .eq('tutor_id', user.id)
    .order('day_of_week', { ascending: true })
    .order('start_time',  { ascending: true })
  ) as unknown as { data: AvailabilityRow[] | null; error: any };

  if (error) { console.error('[availability] get error:', error.message); return []; }

  return (data ?? []).map((r) => ({
    id:           r.id,
    dayOfWeek:    r.day_of_week,
    specificDate: r.specific_date,
    startTime:    r.start_time?.slice(0, 5) ?? '',
    endTime:      r.end_time?.slice(0, 5)   ?? '',
    isRecurring:  r.is_recurring,
    isAvailable:  r.is_available,
  }));
}

// ─── Tutor: upsert a slot ─────────────────────────────────────────────────────

export async function upsertAvailabilitySlot(slot: {
  id?: string;
  dayOfWeek?: number;
  specificDate?: string | null;
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (slot.startTime >= slot.endTime)
    return { success: false, error: 'End time must be after start time' };

  const payload: Record<string, any> = {
    tutor_id:      user.id,
    start_time:    slot.startTime,
    end_time:      slot.endTime,
    is_recurring:  slot.isRecurring ?? true,
    is_available:  true,
    updated_at:    new Date().toISOString(),
  };

  if (slot.specificDate) {
    payload.specific_date = slot.specificDate;
    payload.day_of_week   = null;
  } else {
    payload.day_of_week   = slot.dayOfWeek ?? 0;
    payload.specific_date = null;
  }

  let result;
  if (slot.id) {
    result = await supabase
      .from('availability')
      .update(payload)
      .eq('id', slot.id)
      .eq('tutor_id', user.id)
      .select('id')
      .single();
  } else {
    result = await supabase
      .from('availability')
      .insert(payload)
      .select('id')
      .single();
  }

  if (result.error) return { success: false, error: result.error.message };
  return { success: true, id: result.data?.id };
}

// ─── Tutor: delete a slot ─────────────────────────────────────────────────────

export async function deleteAvailabilitySlot(
  slotId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('availability')
    .delete()
    .eq('id', slotId)
    .eq('tutor_id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Student: get open slots for a tutor on a date ────────────────────────────
// Returns slots that are available and NOT already booked.

export async function getOpenSlotsForDate(
  tutorId: string,
  date: string,        // "YYYY-MM-DD" in tutor's local time
  tzOffset: number = 120  // client passes offset in minutes, default UTC+2 (Malawi)
): Promise<OpenSlot[]> {
  const supabase = await createClient();

  // Parse date safely — use noon local time to avoid day boundary issues
  const [y, m, d] = date.split('-').map(Number);
  const dayOfWeek = new Date(y, m - 1, d, 12).getDay();

  // Fetch recurring slots for this day + specific-date slots
  const { data: slots } = await (supabase
    .from('availability')
    .select('id, day_of_week, specific_date, start_time, end_time, is_recurring, is_available')
    .eq('tutor_id', tutorId)
    .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${date}`)
    .eq('is_available', true)
  ) as unknown as { data: AvailabilityRow[] | null };

  if (!slots?.length) return [];

  // Day boundaries in UTC — account for client timezone offset
  // e.g. Malawi UTC+2: 2025-06-15T00:00 local = 2025-06-14T22:00 UTC
  const offsetMs    = tzOffset * 60 * 1000;
  const localMidnight = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMs);
  const localEndOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59) - offsetMs);

  const { data: existingSessions } = await supabase
    .from('sessions')
    .select('scheduled_start_time, scheduled_end_time')
    .eq('tutor_id', tutorId)
    .in('status', ['pending', 'confirmed', 'in_progress'])
    .gte('scheduled_start_time', localMidnight.toISOString())
    .lte('scheduled_start_time', localEndOfDay.toISOString());

  // Convert UTC timestamps back to local "HH:MM" for comparison with slot times
  const bookedRanges = (existingSessions ?? []).map((s) => {
    const startUTC  = new Date(s.scheduled_start_time).getTime();
    const endUTC    = new Date(s.scheduled_end_time).getTime();
    const startLocal = new Date(startUTC + offsetMs);
    const endLocal   = new Date(endUTC   + offsetMs);
    return {
      start: `${String(startLocal.getUTCHours()).padStart(2,'0')}:${String(startLocal.getUTCMinutes()).padStart(2,'0')}`,
      end:   `${String(endLocal.getUTCHours()).padStart(2,'0')}:${String(endLocal.getUTCMinutes()).padStart(2,'0')}`,
    };
  });

  // Specific-date slots override recurring for the same date
  const specificDates = slots.filter((s) => s.specific_date === date);
  const recurring     = slots.filter((s) => !s.specific_date && s.is_recurring);
  const effective     = specificDates.length > 0 ? specificDates : recurring;

  const openSlots: OpenSlot[] = [];

  for (const slot of effective) {
    const start = slot.start_time.slice(0, 5);
    const end   = slot.end_time.slice(0, 5);

    const startMins = toMinutes(start);
    const endMins   = toMinutes(end);
    const duration  = endMins - startMins;

    // Split into 60-minute bookable chunks
    for (let offset = 0; offset + 60 <= duration; offset += 60) {
      const slotStart = fromMinutes(startMins + offset);
      const slotEnd   = fromMinutes(startMins + offset + 60);

      const isBooked = bookedRanges.some(
        (b) => slotStart < b.end && slotEnd > b.start
      );
      if (isBooked) continue;

      openSlots.push({
        startTime:       slotStart,
        endTime:         slotEnd,
        durationMinutes: 60,
        label:           `${fmt(slotStart)} – ${fmt(slotEnd)} (1h)`,
      });
    }
  }

  openSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return openSlots;
}

// ─── Student: get available dates for a tutor (next 30 days) ─────────────────

export async function getAvailableDates(tutorId: string, tzOffset: number = 120): Promise<string[]> {
  const supabase = await createClient();

  type AvailDateRow = { day_of_week: number | null; specific_date: string | null; is_available: boolean; is_recurring: boolean };
  const { data: slots } = await (supabase
    .from('availability')
    .select('day_of_week, specific_date, is_available, is_recurring')
    .eq('tutor_id', tutorId)
    .eq('is_available', true)
  ) as unknown as { data: AvailDateRow[] | null };

  if (!slots?.length) return [];

  const recurringDays = new Set(
    slots
      .filter((s) => s.day_of_week !== null && s.is_recurring !== false)
      .map((s) => s.day_of_week as number)
  );
  const specificDates = new Set(
    slots.filter((s) => s.specific_date).map((s) => s.specific_date as string)
  );

  const available: string[] = [];

  // Get today in the client's local timezone
  const nowUTC    = Date.now() + tzOffset * 60 * 1000;
  const todayDate = new Date(nowUTC);
  const todayY    = todayDate.getUTCFullYear();
  const todayM    = todayDate.getUTCMonth();
  const todayD    = todayDate.getUTCDate();

  for (let i = 1; i <= 60; i++) {
    const d   = new Date(Date.UTC(todayY, todayM, todayD + i));
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    const dow = d.getUTCDay();

    if (recurringDays.has(dow) || specificDates.has(iso)) {
      available.push(iso);
    }
  }

  return available;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(mins: number) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function fmt(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm   = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}