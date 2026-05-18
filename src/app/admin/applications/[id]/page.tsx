import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HRDetailsClient } from './HRDetailsClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (adminProfile?.role !== 'admin') redirect('/');

  // 2. Fetch the application
  const { data: app, error } = await supabase
    .from('tutor_applications')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !app) {
    console.error('[ApplicationDetails] Fetch error:', error);
    notFound();
  }

  // 3. Generate signed URLs for documents
  const documents: { name: string; url: string; type: 'pdf' | 'image' | 'other' }[] = [];

  if (app.verification_documents && app.verification_documents.length > 0) {
    await Promise.all(
      app.verification_documents.map(async (docPath: string) => {
        try {
          const { data } = await supabase.storage
            .from('verification-docs')
            .createSignedUrl(docPath, 60 * 60); // 1 hour expiry

          if (data?.signedUrl) {
            const name = docPath.split('/').pop() ?? 'Document';
            const ext = name.split('.').pop()?.toLowerCase();
            let type: 'pdf' | 'image' | 'other' = 'other';
            
            if (ext === 'pdf') type = 'pdf';
            else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext ?? '')) type = 'image';

            documents.push({ name, url: data.signedUrl, type });
          }
        } catch (e) {
          console.error(`Failed to sign URL for ${docPath}`, e);
        }
      })
    );
  }

  return <HRDetailsClient application={app} documents={documents} />;
}
