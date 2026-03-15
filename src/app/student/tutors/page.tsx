// src/app/student/tutors/page.tsx

import { searchTutors, getAllSubjects } from '../action';
import { TutorsClient } from './TutorsClient';

export const metadata = { title: 'Find Tutors | Zee Nzeru' };

interface Props {
  searchParams: Promise<{ q?: string; subject?: string; maxRate?: string }>;
}

export default async function TutorsPage({ searchParams }: Props) {
  const { q, subject, maxRate } = await searchParams;

  const [{ tutors, total }, allSubjects] = await Promise.all([
    searchTutors({
      query:   q,
      subject,
      maxRate: maxRate ? Number(maxRate) : undefined,
    }),
    getAllSubjects(),
  ]);

  return (
    <TutorsClient
      initialTutors={tutors}
      total={total}
      initialQuery={q ?? ''}
      initialSubject={subject ?? ''}
      allSubjects={allSubjects}
    />
  );
}