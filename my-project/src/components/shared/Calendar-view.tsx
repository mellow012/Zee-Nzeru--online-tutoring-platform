'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Session } from '@/lib/types';

interface CalendarViewProps {
  sessions: Session[];
  onSessionClick?: (session: Session) => void;
}

export function CalendarView({ sessions, onSessionClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getSessionsForDay = (day: number) => {
    return sessions.filter((s) => {
      const d = new Date(s.scheduled_start_time);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const navigate = (direction: number) =>
    setCurrentDate(new Date(year, month + direction, 1));

  const statusColor: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    confirmed: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" /> My Calendar
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 font-medium min-w-[150px] text-center">{monthName}</span>
            <Button variant="outline" size="icon" onClick={() => navigate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-24 p-1 bg-gray-50 rounded" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const daySessions = getSessionsForDay(day);
            const today = new Date();
            const isToday =
              today.getDate() === day &&
              today.getMonth() === month &&
              today.getFullYear() === year;

            return (
              <div
                key={day}
                className={`h-24 p-1 rounded border ${
                  isToday ? 'bg-emerald-50 border-emerald-200' : 'bg-white'
                }`}
              >
                <div className={`text-sm mb-1 ${isToday ? 'font-bold text-emerald-600' : 'text-gray-600'}`}>
                  {day}
                </div>
                <div className="space-y-1 overflow-hidden">
                  {daySessions.slice(0, 2).map((s, idx) => (
                    <div
                      key={idx}
                      className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer ${
                        statusColor[s.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => onSessionClick?.(s)}
                    >
                      {new Date(s.scheduled_start_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      {s.subject}
                    </div>
                  ))}
                  {daySessions.length > 2 && (
                    <div className="text-xs text-gray-500">+{daySessions.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}