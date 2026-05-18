'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Material } from '@/lib/types';

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/materials');
      const data = await res.json();
      if (data.materials) setMaterials(data.materials);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (materialId: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      const res = await fetch(`/api/materials?id=${materialId}&fileUrl=${encodeURIComponent(fileUrl)}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Material deleted' });
        fetchMaterials();
      } else {
        toast({ variant: 'destructive', title: 'Failed to delete' });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Network error' });
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-emerald-500 w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Materials</h1>
        <p className="text-muted-foreground mt-2">Monitor all files uploaded by tutors. Admins can remove inappropriate content.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Resources</CardTitle>
          <CardDescription>All publicly accessible and private session files.</CardDescription>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="text-center py-10 text-gray-500 flex flex-col items-center">
              <FileText className="w-10 h-10 text-gray-300 mb-3" />
              <p>No materials on the platform yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div>
                    <p className="font-semibold text-gray-900">{m.title}</p>
                    <p className="text-xs text-gray-500 mt-1">Uploaded by: {m.uploader?.full_name} • {(m.file_size_bytes || 0) / 1024} KB</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4 mr-1"/> Download</a>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(m.id, m.file_url)}>
                      <Trash2 className="w-4 h-4 mr-1"/> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
