// src/app/tutor/requests/page.tsx
import { getTutorSessions } from '../actions';
import { RequestsClient } from './RequestsClient';

export const metadata = { title: 'Booking Requests | TutorConnect' };

export default async function TutorRequestsPage() {
  // Fetch pending + recently declined so the tutor sees full context
  const [pending, recent] = await Promise.all([
    getTutorSessions('pending'),
    getTutorSessions('confirmed'),
  ]);

  return <RequestsClient pendingSessions={pending} confirmedSessions={recent} />;
}