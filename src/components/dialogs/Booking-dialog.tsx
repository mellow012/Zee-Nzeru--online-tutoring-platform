'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { TutorWithProfile, Session } from '@/lib/types';

interface BookingDialogProps {
  tutor: TutorWithProfile | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (session: Session) => void;
}

export function BookingDialog({ tutor, open, onClose, onSuccess }: BookingDialogProps) {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tutor?.subjects?.length) setSubject(tutor.subjects[0]);
  }, [tutor]);

  const estimatedCost = (() => {
    if (!date || !startTime || !endTime || !tutor) return null;
    const hours =
      (new Date(`${date}T${endTime}`).getTime() - new Date(`${date}T${startTime}`).getTime()) /
      3_600_000;
    if (hours <= 0) return null;
    return hours * tutor.hourlyRate;
  })();

  const handleBook = async () => {
    if (!tutor || !date || !startTime || !endTime) {
      toast({ variant: 'destructive', title: 'Please fill all fields' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorId: tutor.userId,
          subject,
          scheduledStartTime: `${date}T${startTime}`,
          scheduledEndTime: `${date}T${endTime}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Session created!' });
        onSuccess(data.session);
        onClose();
      } else {
        toast({ variant: 'destructive', title: 'Booking failed', description: data.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book a Session</DialogTitle>
          <DialogDescription>Schedule a lesson with {tutor?.profile.fullName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {tutor?.subjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          {estimatedCost !== null && (
            <div className="p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-gray-600">Estimated cost:</p>
              <p className="text-2xl font-bold text-emerald-600">
                MWK {estimatedCost.toLocaleString()}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleBook}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Continue to Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}