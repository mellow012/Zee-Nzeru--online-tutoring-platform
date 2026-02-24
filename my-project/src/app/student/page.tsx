'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarView } from '@/components/shared/Calendar-view';
import { MaterialsPanel } from '@/components/shared/Materials-panel';
import { BookingDialog } from '@/components/dialogs/Booking-dialog';
import { PaymentDialog } from '@/components/dialogs/Payment-dialog';
import { ReviewDialog } from '@/components/dialogs/Review-dialog';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import {
  GraduationCap, Bell, LogOut, Search, Star, CheckCircle,
  Clock, Calendar, FileText, Video, BookOpen,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TutorWithProfile, Session, Notification, Review } from '@/lib/types';

function StudentDashboardContent() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [tutors, setTutors] = useState<TutorWithProfile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchSubject, setSearchSubject] = useState('');
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedTutor, setSelectedTutor] = useState<TutorWithProfile | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [tutorReviews, setTutorReviews] = useState<Review[]>([]);
  const [showReviews, setShowReviews] = useState(false);

  const fetchData = useCallback(async () => {
    const [tutorsRes, sessionsRes, notifRes] = await Promise.all([
      fetch('/api/tutors?verified=true'),
      fetch('/api/sessions'),
      fetch('/api/notifications'),
    ]);
    if (tutorsRes.ok) setTutors((await tutorsRes.json()).tutors ?? []);
    if (sessionsRes.ok) setSessions((await sessionsRes.json()).sessions ?? []);
    if (notifRes.ok) setNotifications((await notifRes.json()).notifications ?? []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredTutors = tutors.filter(
    (t) => !searchSubject || t.subjects.some((s) => s.toLowerCase().includes(searchSubject.toLowerCase()))
  );

  const upcomingSessions = sessions.filter(
    (s) => ['pending', 'confirmed', 'in_progress'].includes(s.status) && new Date(s.scheduled_start_time) > new Date()
  );
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const viewReviews = async (tutorId: string) => {
    const res = await fetch(`/api/reviews?tutorId=${tutorId}`);
    if (res.ok) {
      setTutorReviews((await res.json()).reviews ?? []);
      setShowReviews(true);
    }
  };

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Zee Nzeru</span>
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
              <AvatarFallback className="bg-emerald-100 text-emerald-700">
                {user?.fullName?.[0] ?? 'S'}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium hidden sm:block">{user?.fullName}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="discover"><Search className="w-4 h-4 mr-2" />Find Tutors</TabsTrigger>
            <TabsTrigger value="sessions"><Calendar className="w-4 h-4 mr-2" />My Sessions</TabsTrigger>
            <TabsTrigger value="calendar"><Calendar className="w-4 h-4 mr-2" />Calendar</TabsTrigger>
            <TabsTrigger value="materials"><FileText className="w-4 h-4 mr-2" />Materials</TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />Notifications
              {unreadCount > 0 && <Badge className="ml-2 bg-red-500 text-white">{unreadCount}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Discover */}
          <TabsContent value="discover">
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by subject..."
                  className="pl-10"
                  value={searchSubject}
                  onChange={(e) => setSearchSubject(e.target.value)}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTutors.map((tutor) => (
                <Card key={tutor.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg">
                            {tutor.profile.fullName?.[0] ?? 'T'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{tutor.profile.fullName}</CardTitle>
                          <button
                            className="flex items-center gap-1 text-sm text-yellow-600 hover:underline"
                            onClick={() => viewReviews(tutor.userId)}
                          >
                            <Star className="w-4 h-4 fill-current" />
                            {tutor.rating.toFixed(1)}
                          </button>
                        </div>
                      </div>
                      {tutor.verified && (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <CheckCircle className="w-3 h-3 mr-1" /> Verified
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {tutor.subjects.map((s) => (
                          <Badge key={s} variant="secondary">{s}</Badge>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{tutor.bio}</p>
                      <div className="flex items-center justify-between pt-2">
                        <span className="font-semibold text-emerald-600">
                          MWK {tutor.hourlyRate.toLocaleString()}/hr
                        </span>
                        <Button size="sm" onClick={() => { setSelectedTutor(tutor); setShowBooking(true); }}>
                          Book Session
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Sessions */}
          <TabsContent value="sessions">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" /> Upcoming Sessions
                  </CardTitle>
                </CardHeader>
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
                            <Badge className={`mt-2 ${
                              s.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              s.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {s.status}
                            </Badge>
                          </div>
                          {s.status === 'confirmed' && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => router.push(`/classroom/${s.id}`)}
                            >
                              <Video className="w-4 h-4 mr-2" /> Join
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-gray-400" /> Completed Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {completedSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No completed sessions</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-64">
                      <div className="space-y-4">
                        {completedSessions.map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{s.subject}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(s.scheduled_start_time).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {!s.review ? (
                                <Button size="sm" variant="outline" onClick={() => { setSelectedSession(s); setShowReview(true); }}>
                                  Review
                                </Button>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-700">
                                  <Star className="w-3 h-3 mr-1" /> {s.review.rating}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
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

          <TabsContent value="notifications">
            <Card>
              <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-4 rounded-lg cursor-pointer ${n.is_read ? 'bg-gray-50' : 'bg-emerald-50 border border-emerald-200'}`}
                          onClick={() => !n.is_read && markRead(n.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{n.title}</p>
                              <p className="text-sm text-gray-600">{n.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(n.created_at).toLocaleString()}
                              </p>
                            </div>
                            {!n.is_read && <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <BookingDialog
        tutor={selectedTutor}
        open={showBooking}
        onClose={() => setShowBooking(false)}
        onSuccess={(s) => { setPendingSession(s); setShowPayment(true); }}
      />
      {pendingSession && (
        <PaymentDialog
          session={pendingSession}
          open={showPayment}
          onClose={() => { setShowPayment(false); setPendingSession(null); }}
          onPayment={fetchData}
        />
      )}
      {selectedSession && (
        <ReviewDialog
          session={selectedSession}
          open={showReview}
          onClose={() => { setShowReview(false); setSelectedSession(null); }}
          onSubmit={fetchData}
        />
      )}

      {/* Tutor Reviews */}
      <Dialog open={showReviews} onOpenChange={setShowReviews}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Tutor Reviews</DialogTitle></DialogHeader>
          <ScrollArea className="h-96">
            <div className="space-y-4 py-4">
              {tutorReviews.map((r) => (
                <div key={r.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-700">{r.comment ?? 'No comment'}</p>
                  <p className="text-sm text-gray-500 mt-2">— {r.reviewer?.full_name}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StudentPage() {
  return (
    <AuthProvider>
      <StudentDashboardContent />
      <Toaster />
    </AuthProvider>
  );
}