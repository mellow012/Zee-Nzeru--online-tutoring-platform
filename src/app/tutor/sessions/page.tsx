// src/app/tutor/sessions/page.tsx
import { getTutorSessions } from '../actions';
import { TutorSessionsClient } from './TutorSessionsClient';

export const metadata = { title: 'My Sessions | TutorConnect' };

interface Props {
  searchParams: Promise<{ status?: string; view?: string }>;
}

export default async function TutorSessionsPage({ searchParams }: Props) {
  const { status, view } = await searchParams;
  const sessions = await getTutorSessions(status);

  return <TutorSessionsClient sessions={sessions} activeStatus={status ?? 'all'} activeView={view ?? 'list'} />;
}