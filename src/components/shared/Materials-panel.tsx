'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileText, FileImage, FileVideo, File, Upload, Download,
  Link as LinkIcon, ExternalLink, Trash2, Play, Video
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Material } from '@/lib/types';

interface MaterialsPanelProps {
  sessionId?: string;
  uploaderId?: string;
}

function FileIcon({ type }: { type?: string | null }) {
  switch (type) {
    case 'pdf': return <FileText className="w-8 h-8 text-red-500 shrink-0" />;
    case 'image': return <FileImage className="w-8 h-8 text-sky-500 shrink-0" />;
    case 'video': return <FileVideo className="w-8 h-8 text-indigo-500 shrink-0" />;
    case 'link': return <LinkIcon className="w-8 h-8 text-emerald-500 shrink-0" />;
    default: return <File className="w-8 h-8 text-slate-500 shrink-0" />;
  }
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return 'Unknown size';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function MaterialsPanel({ sessionId, uploaderId }: MaterialsPanelProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isLinkToggle, setIsLinkToggle] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({ title: '', description: '', isPublic: false });
  const [isUploading, setIsUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'documents' | 'images' | 'videos' | 'links'>('all');
  const [activeVideo, setActiveVideo] = useState<{ url: string; title: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  const loadMaterials = async () => {
    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    if (uploaderId) params.set('uploaderId', uploaderId);
    const res = await fetch(`/api/materials?${params}`);
    if (res.ok) setMaterials((await res.json()).materials ?? []);
  };

  useEffect(() => { loadMaterials(); }, [sessionId, uploaderId]);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        if (profile) {
          setCurrentUserRole(profile.role);
        }
      }
    };
    getUser();
  }, []);

  const handleUpload = async () => {
    if (!uploadData.title) {
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }
    if (!isLinkToggle && !selectedFile) {
      toast({ variant: 'destructive', title: 'File is required' });
      return;
    }
    if (isLinkToggle && !linkUrl) {
      toast({ variant: 'destructive', title: 'Link URL is required' });
      return;
    }

    setIsUploading(true);
    const form = new FormData();
    form.append('title', uploadData.title);
    form.append('description', uploadData.description);
    form.append('isPublic', String(uploadData.isPublic));
    if (sessionId) form.append('sessionId', sessionId);

    if (isLinkToggle) {
      form.append('linkUrl', linkUrl);
    } else if (selectedFile) {
      form.append('file', selectedFile);
    }

    const res = await fetch('/api/materials', { method: 'POST', body: form });
    const data = await res.json();
    setIsUploading(false);

    if (data.success) {
      toast({ title: isLinkToggle ? 'Tutorial link added!' : 'Material uploaded!' });
      setUploadOpen(false);
      setUploadData({ title: '', description: '', isPublic: false });
      setSelectedFile(null);
      setLinkUrl('');
      setIsLinkToggle(false);
      loadMaterials();
    } else {
      toast({ variant: 'destructive', title: 'Upload failed', description: data.error });
    }
  };

  const handleDelete = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    const res = await fetch('/api/materials', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId }),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: 'Material deleted!' });
      loadMaterials();
    } else {
      toast({ variant: 'destructive', title: 'Delete failed', description: data.error });
    }
  };

  const filteredMaterials = materials.filter((m) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'documents') return ['pdf', 'document'].includes(m.file_type ?? '');
    if (activeCategory === 'images') return m.file_type === 'image';
    if (activeCategory === 'videos') return m.file_type === 'video';
    if (activeCategory === 'links') return m.file_type === 'link';
    return true;
  });

  return (
    <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-800 text-lg font-semibold">
            <FileText className="w-5 h-5 text-slate-500" /> Study Materials
          </CardTitle>
          <Button size="sm" onClick={() => setUploadOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 text-xs px-3 h-8 shadow-sm transition-all duration-200">
            <Upload className="w-3.5 h-3.5" /> Upload Material
          </Button>
        </div>
      </CardHeader>
      
      {/* Category Tabs */}
      <div className="flex border-b border-slate-100 bg-white p-2 gap-1 overflow-x-auto scrollbar-none">
        {(['all', 'documents', 'images', 'videos', 'links'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 capitalize whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-indigo-50 text-indigo-700 border-none shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {cat === 'links' ? 'Tutorial Links' : cat === 'videos' ? 'Videos & Recorded Lessons' : cat}
          </button>
        ))}
      </div>

      <CardContent className="p-6">
        {filteredMaterials.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-500" />
            <p className="text-sm font-medium">No materials in this category</p>
            <p className="text-xs text-slate-400 mt-1">Upload documents, local video lessons, or add external links above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredMaterials.map((m) => {
              const canDelete = m.uploader_id === currentUserId || currentUserRole === 'admin' || currentUserRole === 'superadmin';
              const isVideo = m.file_type === 'video';

              return (
                <div key={m.id} className="flex items-center gap-3.5 p-3.5 bg-white border border-slate-100 hover:border-slate-200 rounded-xl transition-all duration-200 shadow-sm relative group">
                  <FileIcon type={m.file_type} />
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-medium text-slate-700 text-sm truncate" title={m.title}>{m.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{m.description || 'No description provided.'}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                      {m.file_type === 'link' ? 'Tutorial Link' : m.file_type === 'video' ? `Video · ${formatFileSize(m.file_size_bytes)}` : formatFileSize(m.file_size_bytes)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {isVideo && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setActiveVideo({ url: m.file_url, title: m.title })}
                        className="h-8 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 gap-1 px-2.5 rounded-lg"
                      >
                        <Play className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600" /> Watch
                      </Button>
                    )}

                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all duration-150" asChild>
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer" title={m.file_type === 'link' ? 'Open link' : 'Download file'}>
                        {m.file_type === 'link' ? <ExternalLink className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4 text-indigo-600" />}
                      </a>
                    </Button>
                    
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(m.id)}
                        className="w-8 h-8 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
                        title="Delete material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Upload Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Add Study Material</DialogTitle>
          </DialogHeader>
          
          {/* Material Type Toggle */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg my-2">
            <button
              onClick={() => setIsLinkToggle(false)}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${!isLinkToggle ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Upload File / Video
            </button>
            <button
              onClick={() => setIsLinkToggle(true)}
              className={`py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${isLinkToggle ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tutorial / External Link
            </button>
          </div>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Title</Label>
              <Input
                placeholder="e.g. Calculus Lesson 1 Video / Lecture Notes"
                value={uploadData.title}
                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Description</Label>
              <Textarea
                placeholder="Brief summary or description of the material..."
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                className="text-sm min-h-[70px] resize-none"
              />
            </div>
            
            {isLinkToggle ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 font-medium">Link URL / Reference URL</Label>
                <Input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="h-9 text-sm border-emerald-100 focus-visible:ring-emerald-500"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Select Local File / Video</Label>
                <Input 
                  type="file" 
                  accept="video/*,application/pdf,image/*,.doc,.docx,.ppt,.pptx,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} 
                  className="text-xs h-9 cursor-pointer file:bg-slate-100 file:border-none file:h-full file:px-3 file:text-slate-700 file:font-semibold hover:file:bg-slate-200"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Supported formats: Videos (MP4, WEBM, MOV), Documents (PDF, DOCX), and Images.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(false)} className="h-9 text-xs">Cancel</Button>
            <Button
              className={`h-9 text-xs text-white ${isLinkToggle ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              onClick={handleUpload}
              disabled={isUploading}
              size="sm"
            >
              {isUploading ? 'Uploading...' : isLinkToggle ? 'Add Link' : 'Upload File / Video'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Player Modal */}
      <Dialog open={!!activeVideo} onOpenChange={() => setActiveVideo(null)}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-slate-950 border border-slate-800">
          <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800">
            <DialogTitle className="flex items-center gap-2 text-white text-base font-semibold">
              <Video className="w-5 h-5 text-indigo-400" /> {activeVideo?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 flex items-center justify-center bg-black">
            {activeVideo && (
              <video
                src={activeVideo.url}
                controls
                autoPlay
                className="w-full max-h-[70vh] rounded-lg shadow-2xl"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}