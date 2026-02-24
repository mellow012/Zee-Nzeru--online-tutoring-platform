import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  return { supabase, user };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const uploaderId = searchParams.get('uploaderId');
    const supabase = await createClient();

    let query = supabase
      .from('materials')
      .select(`*, profiles!materials_uploader_id_fkey(full_name, avatar_url, role)`)
      .order('created_at', { ascending: false });

    if (sessionId) query = query.eq('session_id', sessionId);
    if (uploaderId) query = query.eq('uploader_id', uploaderId);

    const { data: materials, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, materials });
  } catch (error) {
    console.error('Get materials error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const materialSessionId = formData.get('sessionId') as string | null;
    const isPublic = formData.get('isPublic') === 'true';

    if (!file || !title) {
      return NextResponse.json({ success: false, error: 'File and title required' }, { status: 400 });
    }

    // Upload to Supabase Storage (create a 'materials' bucket in your Supabase dashboard)
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('materials')
      .getPublicUrl(filePath);

    let fileType = 'document';
    if (file.type.startsWith('image/')) fileType = 'image';
    else if (file.type.startsWith('video/')) fileType = 'video';
    else if (file.type === 'application/pdf') fileType = 'pdf';

    const { data: material, error: insertError } = await supabase
      .from('materials')
      .insert({
        uploader_id: user.id,
        title,
        description,
        file_url: publicUrl,
        file_type: fileType,
        file_size_bytes: file.size,
        is_public: isPublic,
        ...(materialSessionId && { session_id: materialSessionId }),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, material });
  } catch (error) {
    console.error('Upload material error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error) return error;

    const { materialId } = await request.json();

    const { data: material } = await supabase
      .from('materials')
      .select('uploader_id, file_url')
      .eq('id', materialId)
      .single();

    if (!material) return NextResponse.json({ success: false, error: 'Material not found' }, { status: 404 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();

    if (material.uploader_id !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    // Delete from storage
    const filePath = material.file_url.split('/materials/')[1];
    await supabase.storage.from('materials').remove([filePath]);

    await supabase.from('materials').delete().eq('id', materialId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete material error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}