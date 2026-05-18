import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
      .select('*')
      .order('created_at', { ascending: false });

    if (sessionId) query = query.eq('session_id', sessionId);
    if (uploaderId) query = query.eq('uploader_id', uploaderId);

    const { data: materials, error } = await query;
    if (error) throw error;

    let enrichedMaterials = [];
    if (materials && materials.length > 0) {
      const uploaderIds = [...new Set(materials.map((m: any) => m.uploader_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .in('user_id', uploaderIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      enrichedMaterials = materials.map((m: any) => ({
        ...m,
        profiles: profileMap.get(m.uploader_id) ?? null,
      }));
    }

    return NextResponse.json({ success: true, materials: enrichedMaterials });
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
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const materialSessionId = formData.get('sessionId') as string | null;
    const isPublic = formData.get('isPublic') === 'true';
    const linkUrl = formData.get('linkUrl') as string | null;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    let fileUrl = '';
    let fileType = 'document';
    let fileSizeBytes = 0;

    if (linkUrl) {
      fileUrl = linkUrl;
      fileType = 'link';
    } else {
      if (!file) {
        return NextResponse.json({ success: false, error: 'File or link required' }, { status: 400 });
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);

      fileUrl = publicUrl;
      fileSizeBytes = file.size;

      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type === 'application/pdf') fileType = 'pdf';
    }

    const { data: material, error: insertError } = await supabase
      .from('materials')
      .insert({
        uploader_id: user.id,
        title,
        description,
        file_url: fileUrl,
        file_type: fileType,
        file_size_bytes: fileSizeBytes,
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
      .select('uploader_id, file_url, file_type')
      .eq('id', materialId)
      .single();

    if (!material) return NextResponse.json({ success: false, error: 'Material not found' }, { status: 404 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();

    if (material.uploader_id !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    // Delete from storage (only if it's an uploaded file)
    if (material.file_type !== 'link' && material.file_url.includes('/materials/')) {
      const filePath = material.file_url.split('/materials/')[1];
      await supabase.storage.from('materials').remove([filePath]);
    }

    await supabase.from('materials').delete().eq('id', materialId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete material error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}