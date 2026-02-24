'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Session } from '@/lib/types';

interface PaymentDialogProps {
  session: Session;
  open: boolean;
  onClose: () => void;
  onPayment: () => void;
}

export function PaymentDialog({ session, open, onClose, onPayment }: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // TODO: Integrate real payment gateway (Flutterwave / Paychangu for MWK)
  const handlePayment = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 2000)); // Simulate processing
    setIsLoading(false);
    toast({ title: 'Payment successful!', description: 'Your session has been booked.' });
    onPayment();
    onClose();
  };

  const durationHours =
    (new Date(session.scheduled_end_time).getTime() -
      new Date(session.scheduled_start_time).getTime()) /
    3_600_000;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Payment
          </DialogTitle>
          <DialogDescription>Complete payment to confirm your booking</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Card className="bg-gray-50">
            <CardContent className="pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Subject</span>
                <span className="font-medium">{session.subject}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium">{durationHours} hour{durationHours !== 1 ? 's' : ''}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg">
                <span className="font-medium">Total</span>
                <span className="font-bold text-emerald-600">MWK {session.price.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="card">💳 Debit/Credit Card</SelectItem>
                <SelectItem value="mpesa">📱 Airtel Money / TNM Mpampho</SelectItem>
                <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'card' && (
            <div className="space-y-3">
              <Input placeholder="Card Number" />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="MM/YY" />
                <Input placeholder="CVV" />
              </div>
              <Input placeholder="Cardholder Name" />
            </div>
          )}

          {paymentMethod === 'mpesa' && (
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input placeholder="+265 99 000 0000" />
              <p className="text-xs text-gray-500">You will receive a prompt to confirm payment.</p>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
            <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm text-emerald-700">
              Payment held in escrow until session is completed
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handlePayment}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : `Pay MWK ${session.price.toLocaleString()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}