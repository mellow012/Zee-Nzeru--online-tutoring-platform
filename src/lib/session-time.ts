import { format, isToday, isTomorrow, isYesterday, differenceInMinutes } from 'date-fns';

/**
 * Returns a human-readable date label.
 * "Today · 9:00 AM – 10:00 AM"
 * "Tomorrow · 2:00 PM – 3:00 PM"
 * "Mon, 12 Jan · 9:00 AM – 10:00 AM"
 */
export function formatSessionDateTime(
  startTime: string,
  endTime: string,
  opts: { showDuration?: boolean } = {}
): {
  dateLabel: string;   // "Today" | "Tomorrow" | "Mon, 12 Jan"
  timeLabel: string;   // "9:00 AM – 10:00 AM"
  fullLabel: string;   // combined
  duration: number;    // minutes
  isPast: boolean;
} {
  const start    = new Date(startTime);
  const end      = new Date(endTime);
  const duration = differenceInMinutes(end, start);
  const isPast   = end < new Date();

  const timeLabel = `${fmt12(start)} – ${fmt12(end)}`;

  let dateLabel: string;
  if (isToday(start))       dateLabel = 'Today';
  else if (isTomorrow(start)) dateLabel = 'Tomorrow';
  else if (isYesterday(start)) dateLabel = 'Yesterday';
  else                      dateLabel = format(start, 'EEE, d MMM');

  const durationLabel = opts.showDuration ? ` · ${formatDuration(duration)}` : '';
  const fullLabel     = `${dateLabel} · ${timeLabel}${durationLabel}`;

  return { dateLabel, timeLabel, fullLabel, duration, isPast };
}

/**
 * Compact time-only display: "9:00 AM – 10:00 AM (1h)"
 */
export function formatSlotTime(startTime: string, endTime: string): string {
  const start    = new Date(`1970-01-01T${startTime}`);
  const end      = new Date(`1970-01-01T${endTime}`);
  const duration = differenceInMinutes(end, start);
  return `${fmt12(start)} – ${fmt12(end)} (${formatDuration(duration)})`;
}

/**
 * Format duration in minutes to "1h", "1h 30m", "45m"
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0)          return `${h}h`;
  return `${m}m`;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function fmt12(date: Date): string {
  const h    = date.getHours();
  const m    = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}