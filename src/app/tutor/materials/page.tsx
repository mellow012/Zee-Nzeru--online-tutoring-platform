import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MaterialsPanel } from '@/components/shared/Materials-panel';

export default async function TutorMaterialsPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="flex items-start justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Materials</h1>
          <p className="text-muted-foreground mt-2">Upload and manage educational resources for your students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <MaterialsPanel uploaderId={user.id} />
      </div>
    </div>
  );
}
