'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import { GraduationCap, LogOut, Home, Users, AlertCircle, CheckCircle, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AdminStats } from '@/lib/types';

interface AdminUser {
  id: string;
  user_id: string;
  full_name: string | null;
  role: string;
  created_at: string;
  tutor_profiles?: {
    verified: boolean;
    rating: number;
  } | null;
}

function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats>({
    totalStudents: 0,
    totalTutors: 0,
    verifiedTutors: 0,
    totalSessions: 0,
    pendingVerifications: 0,
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    const [statsRes, usersRes] = await Promise.all([
      fetch('/api/admin/users?type=stats'),
      fetch('/api/admin/users'),
    ]);
    if (statsRes.ok) setStats((await statsRes.json()).stats);
    if (usersRes.ok) setUsers((await usersRes.json()).users ?? []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const verifyTutor = async (tutorId: string, verified: boolean) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tutorId, verified }),
    });
    if (res.ok) {
      toast({ title: verified ? 'Tutor verified!' : 'Verification revoked' });
      fetchData();
    } else {
      toast({ variant: 'destructive', title: 'Action failed' });
    }
  };

  const tutors = users.filter((u) => u.role === 'tutor');
  const students = users.filter((u) => u.role === 'student');
  const pendingTutors = tutors.filter((u) => u.tutor_profiles && !u.tutor_profiles.verified);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-gray-800 to-gray-900 text-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-gray-800" />
            </div>
            <span className="text-xl font-bold">Zee Nzeru</span>
            <Badge className="bg-yellow-500 text-yellow-900 ml-2">Admin</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-gray-700 text-white">
                {user?.fullName?.[0] ?? 'A'}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium hidden sm:block">{user?.fullName}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-700"
              onClick={async () => { await logout(); router.push('/'); }}
            >
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview"><Home className="w-4 h-4 mr-2" />Overview</TabsTrigger>
            <TabsTrigger value="tutors"><GraduationCap className="w-4 h-4 mr-2" />Tutors</TabsTrigger>
            <TabsTrigger value="students"><Users className="w-4 h-4 mr-2" />Students</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-5 gap-6 mb-8">
              {[
                { label: 'Total Students', value: stats.totalStudents },
                { label: 'Total Tutors', value: stats.totalTutors },
                { label: 'Verified Tutors', value: stats.verifiedTutors },
                { label: 'Total Sessions', value: stats.totalSessions },
                { label: 'Pending Verifications', value: stats.pendingVerifications, highlight: true },
              ].map(({ label, value, highlight }) => (
                <Card key={label} className={highlight ? 'border-yellow-200 bg-yellow-50' : ''}>
                  <CardHeader className="pb-2">
                    <CardDescription>{label}</CardDescription>
                    <CardTitle className={`text-3xl ${highlight ? 'text-yellow-600' : ''}`}>
                      {value}
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {pendingTutors.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    <AlertCircle className="w-5 h-5" /> Tutors Pending Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingTutors.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{t.full_name?.[0] ?? 'T'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{t.full_name}</p>
                            <p className="text-sm text-gray-500">Joined {new Date(t.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600"
                            onClick={() => verifyTutor(t.user_id, false)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => verifyTutor(t.user_id, true)}
                          >
                            Verify
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tutors */}
          <TabsContent value="tutors">
            <Card>
              <CardHeader>
                <CardTitle>All Tutors ({tutors.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {tutors.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-teal-100 text-teal-700">
                              {t.full_name?.[0] ?? 'T'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{t.full_name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm text-gray-500">
                                {t.tutor_profiles?.rating.toFixed(1) ?? '0.0'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.tutor_profiles?.verified ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3 h-3 mr-1" /> Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                              Pending
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verifyTutor(t.user_id, !t.tutor_profiles?.verified)}
                          >
                            {t.tutor_profiles?.verified ? 'Revoke' : 'Verify'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>All Students ({students.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {students.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-emerald-100 text-emerald-700">
                              {s.full_name?.[0] ?? 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{s.full_name}</p>
                            <p className="text-sm text-gray-500">
                              Joined {new Date(s.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">Student</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminDashboardContent />
      <Toaster />
    </AuthProvider>
  );
}