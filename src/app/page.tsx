import { HomePageClient } from './HomePageClient';
import { searchTutors } from '@/app/student/action';
import { createClient } from '@/lib/supabase/server';

// Revalidate home page every hour
export const revalidate = 3600;

export default async function HomePage() {
  // Fetch top 4 tutors
  const { tutors } = await searchTutors({ page: 0 });
  const topTutors = tutors.slice(0, 4);

  // Fetch recent public reviews (at least 4 stars)
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment, reviewer:profiles!reviewer_id(full_name, avatar_url), tutor:profiles!reviewee_id(full_name)
    `)
    .eq('is_public', true)
    .gte('rating', 4)
    .order('created_at', { ascending: false })
    .limit(3);

  // Format reviews for the LandingPage
  const publicReviews = (reviews || []).map((r: any) => {
    const reviewer = Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer;
    const tutor = Array.isArray(r.tutor) ? r.tutor[0] : r.tutor;
    return {
      id: r.id,
      quote: r.comment || 'Great session!',
      name: reviewer?.full_name || 'Student',
      role: `Learned from ${tutor?.full_name || 'a Tutor'}`,
      initials: (reviewer?.full_name || 'S').split(' ').map((n: string) => n[0]).join('').substring(0, 2),
      avatarUrl: reviewer?.avatar_url || null,
      rating: r.rating,
    };
  });

  return <HomePageClient topTutors={topTutors} publicReviews={publicReviews} />;
}