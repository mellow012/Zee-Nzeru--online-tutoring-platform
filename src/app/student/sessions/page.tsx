// src/app/student/sessions/page.tsx
// Server component — reads ?status= search param, fetches sessions, renders client.

import { getStudentSessions } from '../action';
import { SessionsClient } from './SessionClient';

export const metadata = { title: 'My Sessions | TutorConnect' };

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function StudentSessionsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const sessions = await getStudentSessions(status);

  return <SessionsClient sessions={sessions} activeStatus={status ?? 'all'} />;
}