'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

// Public signup only supports student or tutor — admin accounts are created manually
type PublicRole = 'student' | 'tutor';

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onClose: () => void;
}

export function SignupForm({ onSwitchToLogin, onClose }: SignupFormProps) {
  const { signup } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'student' as PublicRole,
    phoneNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await signup(formData);
    setIsLoading(false);

    if (result.success) {
      onClose();
      router.push('/auth/verify');
    } else {
      toast({ variant: 'destructive', title: 'Signup failed', description: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input
            placeholder="Your full name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <Label>I am a</Label>
          <Select
            value={formData.role}
            onValueChange={(value: PublicRole) => setFormData({ ...formData, role: value })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student looking for a tutor</SelectItem>
              <SelectItem value="tutor">Tutor offering lessons</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Phone Number (optional)</Label>
          <Input
            placeholder="+265 ..."
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Account'}
        </Button>
        <p className="text-sm text-gray-500 text-center">
          Already have an account?{' '}
          <button
            type="button"
            className="text-emerald-600 hover:underline"
            onClick={onSwitchToLogin}
          >
            Login
          </button>
        </p>
      </div>
    </form>
  );
}