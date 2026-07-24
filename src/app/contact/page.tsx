'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Mail, Phone, MapPin, Send, MessageSquare, Clock,
  CheckCircle2, Sparkles, AlertCircle, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    role: 'student',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setLoading(true);
    // Simulate contact submission
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  const faqs = [
    {
      q: 'How do I book my first session as a student?',
      a: 'Sign up for a free student account, browse verified tutors by subject or rate, choose a date and time from their availability calendar, and pay securely via Mobile Money or Card.',
    },
    {
      q: 'What are the requirements to become a tutor?',
      a: 'You need relevant academic qualifications (Degree, Diploma, or top MSCE scores), a valid government ID, and a brief intro video or application form. Our admin team reviews all applications within 24-48 hours.',
    },
    {
      q: 'What payment methods are supported in Malawi?',
      a: 'We support Airtel Money, TNM Mpamba, Bank Transfers, and major credit/debit cards via our integrated payment gateway.',
    },
    {
      q: 'Can I reschedule or cancel a booked session?',
      a: 'Yes, sessions can be rescheduled up to 4 hours before start time through your Student or Tutor Dashboard.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* ── HERO HEADER ──────────────────────────────────────────────────── */}
      <section className="relative border-b border-border bg-gradient-to-b from-emerald-50/50 via-background to-background dark:from-emerald-950/20 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
            We're Here To Help
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            Get in Touch with{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Zee Nzeru
            </span>
          </h1>
          <p className="text-muted-foreground text-base max-w-xl mx-auto leading-relaxed">
            Have questions about finding a tutor, joining as an educator, or payments? Our support team is available 7 days a week.
          </p>
        </div>
      </section>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-start">

            {/* Left: Contact Info & Support Cards */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight mb-2">Contact Details</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Reach out directly via email, phone, or visit our support center.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Us</p>
                    <p className="font-medium text-foreground text-sm">support@zeenzeru.com</p>
                    <p className="text-xs text-muted-foreground">Expect a reply within 2 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone / WhatsApp</p>
                    <p className="font-medium text-foreground text-sm">+265 999 123 456 / +265 888 654 321</p>
                    <p className="text-xs text-muted-foreground">Mon – Sun: 8:00 AM – 8:00 PM CAT</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main Hub</p>
                    <p className="font-medium text-foreground text-sm">Lilongwe Innovation Hub, City Centre</p>
                    <p className="text-xs text-muted-foreground">Lilongwe, Malawi</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Support Hours</p>
                    <p className="font-medium text-foreground text-sm">Monday – Sunday, 8:00 AM – 10:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Contact Form */}
            <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-2xl font-extrabold">Message Sent Successfully!</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Thank you for contacting Zee Nzeru. A member of our support team will review your inquiry and reach out to you shortly via email.
                  </p>
                  <Button
                    onClick={() => setSubmitted(false)}
                    variant="outline"
                    className="rounded-xl mt-4"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight">Send Us a Message</h2>
                    <p className="text-sm text-muted-foreground mt-1">Fill out the form below and we'll get back to you promptly.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Full Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g. Kondwani Tembo"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">I am a...</Label>
                      <select
                        id="role"
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      >
                        <option value="student">Student / Parent</option>
                        <option value="tutor">Applicant / Tutor</option>
                        <option value="institution">School / Organization</option>
                        <option value="other">Other Inquiry</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="e.g. Question about booking sessions"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Your Message</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      placeholder="Tell us how we can help you..."
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="rounded-xl resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 text-base font-semibold shadow-md gap-2"
                  >
                    {loading ? 'Sending Message...' : 'Send Message'}
                    {!loading && <Send size={16} />}
                  </Button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS ────────────────────────────────────── */}
      <section className="py-16 bg-accent/30 border-t border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <HelpCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
              Frequently Asked Questions
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">Got Questions? We Have Answers</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="p-6 rounded-2xl bg-card border border-border space-y-2">
                <h3 className="font-bold text-base text-foreground">{faq.q}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
