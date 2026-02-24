'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarView } from '@/components/shared/Calendar-view';
import { MaterialsPanel } from '@/components/shared/Materials-panel';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import {
  GraduationCap, Bell, LogOut, Star, CheckCircle, AlertCircle,
  Clock, Calendar, FileText, Video, DollarSign, Home,
  Settings, Wallet,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Session, Notification } from '@/lib/types';

interface TutorProfile {
  subjects: string[];
  hourly_rate: number;
  bio: string | null;
  verified: boolean;
  rating: number;
}

interface ProfileData {
  full_name: string;
  tutor_profiles: TutorProfile | null;
}

function TutorDashboardContent() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ subjects: '', hourlyRate: '', bio: '' });

  const fetchData = useCallback(async () => {
    const [profileRes, sessionsRes, notifRes] = await Promise.all([
      fetch('/api/profile'),
      fetch('/api/sessions'),
      fetch('/api/notifications'),
    ]);
    if (profileRes.ok) {
      const data = await profileRes.json();
      setProfile(data.profile);
      if (data.profile?.tutor_profiles) {
        setEditData({
          subjects: data.profile.tutor_profiles.subjects.join(', '),
          hourlyRate: String(data.profile.tutor_profiles.hourly_rate),
          bio: data.profile.tutor_profiles.bio ?? '',
        });
      }
    }
    if (sessionsRes.ok) setSessions((await sessionsRes.json()).sessions ?? []);
    if (notifRes.ok) setNotifications((await notifRes.json()).notifications ?? []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateProfile = async () => {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjects: editData.subjects.split(',').map((s) => s.trim()).filter(Boolean),
        hourlyRate: parseFloat(editData.hourlyRate),
        bio: editData.bio,
      }),
    });
    if (res.ok) {
      toast({ title: 'Profile updated!' });
      setEditMode(false);
      fetchData();
    } else {
      toast({ variant: 'destructive', title: 'Failed to update' });
    }
  };

  const updateSessionStatus = async (sessionId: string, status: string) => {
    const res = await fetch('/api/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, status }),
    });
    if (res.ok) {
      toast({ title: `Session ${status}` });
      fetchData();
    }
  };

  const pendingSessions = sessions.filter((s) => s.status === 'pending');
  const upcomingSessions = sessions.filter(
    (s) => s.status === 'confirmed' && new Date(s.scheduled_start_time) > new Date()
  );
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const totalEarnings = completedSessions.reduce((sum, s) => sum + s.price, 0);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const tutorProfile = profile?.tutor_profiles;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Zee Nzeru</span>
            {tutorProfile?.verified && (
              <Badge className="bg-emerald-100 text-emerald-700 ml-2">
                <CheckCircle className="w-3 h-3 mr-1" /> Verified
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-teal-100 text-teal-700">
                {user?.fullName?.[0] ?? 'T'}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium hidden sm:block">{user?.fullName}</span>
            <Button variant="ghost" size="sm" onClick={async () => { await logout(); router.push('/'); }}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="overview"><Home className="w-4 h-4 mr-2" />Overview</TabsTrigger>
            <TabsTrigger value="sessions"><Calendar className="w-4 h-4 mr-2" />Sessions</TabsTrigger>
            <TabsTrigger value="calendar"><Calendar className="w-4 h-4 mr-2" />Calendar</TabsTrigger>
            <TabsTrigger value="materials"><FileText className="w-4 h-4 mr-2" />Materials</TabsTrigger>
            <TabsTrigger value="earnings"><Wallet className="w-4 h-4 mr-2" />Earnings</TabsTrigger>
            <TabsTrigger value="profile"><Settings className="w-4 h-4 mr-2" />Profile</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending Requests</CardDescription>
                  <CardTitle className="text-3xl">{pendingSessions.length}</CardTitle>
                </CardHeader>
                <CardContent><Clock className="w-8 h-8 text-yellow-500" /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Upcoming Sessions</CardDescription>
                  <CardTitle className="text-3xl">{upcomingSessions.length}</CardTitle>
                </CardHeader>
                <CardContent><Calendar className="w-8 h-8 text-emerald-500" /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Earnings</CardDescription>
                  <CardTitle className="text-3xl">MWK {totalEarnings.toLocaleString()}</CardTitle>
                </CardHeader>
                <CardContent><DollarSign className="w-8 h-8 text-green-500" /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Rating</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-1">
                    {tutorProfile?.rating.toFixed(1) ?? '0.0'}
                    <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {pendingSessions.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" /> Pending Booking Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingSessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div>
                          <p className="font-medium">{s.subject}</p>
                          <p className="text-sm text-gray-600">Student: {s.student?.full_name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(s.scheduled_start_time).toLocaleDateString()} at{' '}
                            {new Date(s.scheduled_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-sm font-semibold text-emerald-600 mt-1">
                            MWK {s.price.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-red-200 text-red-600"
                            onClick={() => updateSessionStatus(s.id, 'cancelled')}>
                            Decline
                          </Button>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => updateSessionStatus(s.id, 'confirmed')}>
                            Accept
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Upcoming Confirmed Sessions</CardTitle></CardHeader>
              <CardContent>
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No upcoming sessions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingSessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{s.subject}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(s.scheduled_start_time).toLocaleDateString()} at{' '}
                            {new Date(s.scheduled_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => router.push(`/classroom/${s.id}`)}>
                          <Video className="w-4 h-4 mr-2" /> Start Session
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sessions */}
          <TabsContent value="sessions">
            <Card>
              <CardHeader><CardTitle>All Sessions</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {sessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{s.subject}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(s.scheduled_start_time).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={s.status === 'completed' ? 'default' : 'secondary'}>
                            {s.status}
                          </Badge>
                          <p className="text-sm font-semibold mt-1">MWK {s.price.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarView
              sessions={sessions}
              onSessionClick={(s) => {
                if (s.status === 'confirmed') router.push(`/classroom/${s.id}`);
              }}
            />
          </TabsContent>

          <TabsContent value="materials">
            <MaterialsPanel uploaderId={user?.userId} />
          </TabsContent>

          {/* Earnings */}
          <TabsContent value="earnings">
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardDescription>Total Earnings</CardDescription>
                  <CardTitle className="text-3xl text-emerald-600">MWK {totalEarnings.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Available for Withdrawal</CardDescription>
                  <CardTitle className="text-3xl">MWK {Math.floor(totalEarnings * 0.825).toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>Sessions This Month</CardDescription>
                  <CardTitle className="text-3xl">
                    {completedSessions.filter(
                      (s) => new Date(s.scheduled_start_time).getMonth() === new Date().getMonth()
                    ).length}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {completedSessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{s.subject}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(s.scheduled_start_time).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-semibold text-emerald-600">+MWK {s.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile">
            <Card className="max-w-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tutor Profile</CardTitle>
                    <CardDescription>Manage your tutoring details</CardDescription>
                  </div>
                  {!editMode && <Button onClick={() => setEditMode(true)}>Edit Profile</Button>}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!tutorProfile?.verified && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      Your profile is pending verification by an admin.
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="bg-teal-100 text-teal-700 text-2xl">
                      {user?.fullName?.[0] ?? 'T'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{user?.fullName}</h3>
                    <p className="text-gray-500">{user?.email}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{tutorProfile?.rating.toFixed(1) ?? '0.0'}</span>
                    </div>
                  </div>
                </div>

                {editMode ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subjects (comma-separated)</Label>
                      <Input
                        value={editData.subjects}
                        onChange={(e) => setEditData({ ...editData, subjects: e.target.value })}
                        placeholder="Mathematics, Physics, Chemistry"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hourly Rate (MWK)</Label>
                      <Input
                        type="number"
                        value={editData.hourlyRate}
                        onChange={(e) => setEditData({ ...editData, hourlyRate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea
                        value={editData.bio}
                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={updateProfile}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-500">Subjects</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {tutorProfile?.subjects.map((s) => (
                          <Badge key={s} variant="secondary">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-500">Hourly Rate</Label>
                      <p className="text-xl font-semibold">
                        MWK {tutorProfile?.hourly_rate.toLocaleString() ?? '0'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Bio</Label>
                      <p className="text-gray-700">{tutorProfile?.bio ?? 'No bio added yet'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function TutorPage() {
  return (
    <AuthProvider>
      <TutorDashboardContent />
      <Toaster />
    </AuthProvider>
  );
}