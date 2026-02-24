'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, FileImage, FileVideo, File, Upload, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Material } from '@/lib/types';

interface MaterialsPanelProps {
  sessionId?: string;
  uploaderId?: string;
}

function FileIcon({ type }: { type?: string | null }) {
  switch (type) {
    case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
    case 'image': return <FileImage className="w-8 h-8 text-blue-500" />;
    case 'video': return <FileVideo className="w-8 h-8 text-purple-500" />;
    default: return <File className="w-8 h-8 text-gray-500" />;
  }
}

export function MaterialsPanel({ sessionId, uploaderId }: MaterialsPanelProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({ title: '', description: '', isPublic: false });
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const loadMaterials = async () => {
    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    if (uploaderId) params.set('uploaderId', uploaderId);
    const res = await fetch(`/api/materials?${params}`);
    if (res.ok) setMaterials((await res.json()).materials ?? []);
  };

  useEffect(() => { loadMaterials(); }, [sessionId, uploaderId]);

  const handleUpload = async () => {
    if (!selectedFile || !uploadData.title) {
      toast({ variant: 'destructive', title: 'File and title required' });
      return;
    }
    setIsUploading(true);
    const form = new FormData();
    form.append('file', selectedFile);
    form.append('title', uploadData.title);
    form.append('description', uploadData.description);
    form.append('isPublic', String(uploadData.isPublic));
    if (sessionId) form.append('sessionId', sessionId);

    const res = await fetch('/api/materials', { method: 'POST', body: form });
    const data = await res.json();
    setIsUploading(false);

    if (data.success) {
      toast({ title: 'Material uploaded!' });
      setUploadOpen(false);
      setUploadData({ title: '', description: '', isPublic: false });
      setSelectedFile(null);
      loadMaterials();
    } else {
      toast({ variant: 'destructive', title: 'Upload failed', description: data.error });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" /> Materials
          </CardTitle>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-1" /> Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {materials.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No materials yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileIcon type={m.file_type} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.title}</p>
                  <p className="text-sm text-gray-500">
                    {m.file_size_bytes ? `${(m.file_size_bytes / 1024).toFixed(1)} KB` : 'Unknown size'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Material</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={uploadData.title}
                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}