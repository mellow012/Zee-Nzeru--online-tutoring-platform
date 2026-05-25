'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BookOpen, Video, Users, CheckCircle2, Star, 
  ArrowRight, Sparkles, GraduationCap, Clock, Award
} from 'lucide-react';

interface Tutor {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  subjects: string[];
  hourlyRate: number;
  currency: string;
  rating: number;
  totalSessions: number;
}

interface Review {
  id: string;
  quote: string;
  name: string;
  role: string;
  initials: string;
  avatarUrl: string | null;
  rating: number;
}

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
  topTutors?: Tutor[];
  publicReviews?: Review[];
}

import Autoplay from 'embla-carousel-autoplay';

export function LandingPage({ onLogin, onSignup, topTutors = [], publicReviews = [] }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'tutors'>('students');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* ── Hero Section ── */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[600px] bg-emerald-300/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 mb-6 px-3 py-1.5 text-sm font-medium">
              <Sparkles className="w-4 h-4 mr-2 inline" /> Revolutionizing Online Learning
            </Badge>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
              Master any subject with <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">expert tutors</span>.
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
              Connect with top-rated educators globally. Experience personalized 1-on-1 sessions, interactive virtual classrooms, and real-time collaboration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="h-14 px-8 text-base bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20" onClick={onSignup}>
                Start Learning Now <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base border-slate-200 hover:bg-slate-50" onClick={onLogin}>
                Explore Tutors
              </Button>
            </div>
            
            <div className="mt-12 flex items-center gap-6 text-sm font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-slate-200 z-${5-i}`} />
                  ))}
                </div>
                <span>500+ Active Tutors</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span>4.9/5 Average Rating</span>
              </div>
            </div>
          </div>

          <div className="relative lg:h-[600px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-teal-50 rounded-[3rem] transform rotate-3 scale-105 opacity-50" />
            
            {/* Carousel for Hero Images */}
            <Carousel 
              className="w-full max-w-lg relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-white/20"
              plugins={[Autoplay({ delay: 3000, stopOnInteraction: true })]}
            >
              <CarouselContent>
                <CarouselItem>
                  <div className="aspect-[4/3] relative">
                    <img src="/images/hero1.png" alt="Platform UI" className="object-cover w-full h-full" />
                  </div>
                </CarouselItem>
                <CarouselItem>
                  <div className="aspect-[4/3] relative bg-slate-900">
                    <img src="/images/hero2.png" alt="Platform Dark UI" className="object-cover w-full h-full opacity-90" />
                  </div>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious className="left-4 bg-white/50 backdrop-blur border-none hover:bg-white/80" />
              <CarouselNext className="right-4 bg-white/50 backdrop-blur border-none hover:bg-white/80" />
            </Carousel>

            {/* Floating Glass UI Elements */}
            <div className="absolute -bottom-6 -left-6 bg-white/80 backdrop-blur-xl border border-slate-100 p-4 rounded-2xl shadow-xl z-20 flex items-center gap-4 animate-bounce duration-1000">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Video className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Live Classroom</p>
                <p className="text-xs text-slate-500">Interactive whiteboard</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bento Grid Features ── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything you need to excel</h2>
            <p className="mt-4 text-lg text-slate-600">A comprehensive suite of tools designed for the modern learner and educator.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Feature Card */}
            <Card className="md:col-span-2 bg-slate-50 border-0 shadow-none relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="p-8 md:p-12 h-full flex flex-col justify-center relative z-10">
                <div className="w-14 h-14 bg-white shadow-sm rounded-2xl flex items-center justify-center mb-6 border border-slate-100">
                  <Video className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Advanced Virtual Classroom</h3>
                <p className="text-slate-600 text-lg leading-relaxed max-w-md">Experience seamless HD video, real-time interactive whiteboards, and instant file sharing. Built for focus, designed for results.</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 text-white border-0 shadow-none relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-500">
                <Clock className="w-32 h-32" />
              </div>
              <CardContent className="p-8 h-full flex flex-col justify-end relative z-10 min-h-[300px]">
                <h3 className="text-xl font-bold mb-3">Flexible Scheduling</h3>
                <p className="text-slate-400">Book sessions that fit your lifestyle. Reschedule effortlessly.</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-600 text-white border-0 shadow-none relative overflow-hidden group">
              <div className="absolute -bottom-8 -right-8 opacity-20 group-hover:rotate-12 transition-transform duration-500">
                <Award className="w-48 h-48" />
              </div>
              <CardContent className="p-8 h-full flex flex-col justify-end relative z-10 min-h-[300px]">
                <h3 className="text-xl font-bold mb-3">Verified Experts</h3>
                <p className="text-emerald-100">Every tutor undergoes a rigorous vetting process ensuring top-tier quality.</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 bg-slate-50 border-0 shadow-none relative overflow-hidden group">
              <CardContent className="p-8 h-full flex items-center justify-between relative z-10">
                <div>
                  <div className="w-12 h-12 bg-white shadow-sm rounded-xl flex items-center justify-center mb-4 border border-slate-100">
                    <BookOpen className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Rich Materials Library</h3>
                  <p className="text-slate-600 max-w-sm">Access session recordings, shared documents, and notes anytime.</p>
                </div>
                <div className="hidden md:block w-48 h-32 bg-white rounded-xl shadow-sm border border-slate-200 transform rotate-[-5deg] group-hover:rotate-0 transition-transform duration-500 p-4">
                  <div className="h-2 w-1/2 bg-slate-200 rounded mb-3" />
                  <div className="h-2 w-3/4 bg-slate-100 rounded mb-2" />
                  <div className="h-2 w-2/3 bg-slate-100 rounded" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Top Tutors (Real Data) ── */}
      <section id="tutors" className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Learn from the best</h2>
              <p className="mt-2 text-slate-600">Top-rated educators ready to help you succeed.</p>
            </div>
            <Button variant="outline" className="mt-4 md:mt-0 font-medium border-slate-200 hover:bg-slate-100" onClick={onLogin}>
              View All Tutors <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topTutors.map((tutor) => (
              <Card key={tutor.userId} className="group hover:shadow-xl transition-all duration-300 border-slate-200/60 overflow-hidden bg-white">
                <CardContent className="p-0">
                  <div className="h-24 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 relative">
                    <Avatar className="absolute -bottom-6 left-6 h-16 w-16 border-4 border-white shadow-sm">
                      <AvatarImage src={tutor.avatarUrl || undefined} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                        {tutor.fullName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="pt-10 pb-6 px-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-slate-900 truncate pr-2">{tutor.fullName}</h3>
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-xs font-medium shrink-0">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {tutor.rating.toFixed(1)}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-1">{tutor.subjects.join(' • ')}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Hourly</p>
                        <p className="text-sm font-bold text-emerald-600">{tutor.currency} {tutor.hourlyRate}</p>
                      </div>
                      <Button size="sm" variant="secondary" className="bg-slate-100 hover:bg-slate-200 text-slate-900" onClick={onLogin}>
                        Book
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA / Dual Role Section ── */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to transform your journey?</h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">Join thousands of students and tutors already experiencing the future of online education.</p>
          
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <GraduationCap className="w-10 h-10 text-emerald-400 mb-4 mx-auto" />
              <h3 className="text-xl font-bold mb-2">For Students</h3>
              <p className="text-slate-400 text-sm mb-6">Find the perfect tutor and start learning instantly.</p>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={onSignup}>Find a Tutor</Button>
            </div>
            
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <Users className="w-10 h-10 text-teal-400 mb-4 mx-auto" />
              <h3 className="text-xl font-bold mb-2">For Tutors</h3>
              <p className="text-slate-400 text-sm mb-6">Share your expertise and manage your business seamlessly.</p>
              <Button className="w-full bg-white text-slate-900 hover:bg-slate-200" onClick={onSignup}>Become a Tutor</Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* ── Footer ── */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <span className="text-lg font-bold text-slate-900">ZeeNzeru</span>
        </div>
        <p>&copy; {new Date().getFullYear()} ZeeNzeru Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}