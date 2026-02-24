'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Pen, Eraser, Highlighter, Trash2, FileText } from 'lucide-react';

interface WhiteboardProps {
  initialData?: string;
  onSave?: (data: string) => void;
}

type Tool = 'pen' | 'eraser' | 'highlighter';

const COLORS = ['#000000', '#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#00acc1'];

export function Whiteboard({ initialData, onSave }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (initialData) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = initialData;
    }
  }, [initialData]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);

    if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 20;
    } else if (tool === 'highlighter') {
      ctx.strokeStyle = color + '40';
      ctx.lineWidth = 20;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
    }

    ctx.stroke();
    lastPos.current = pos;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-2 p-2 border-b bg-gray-50 flex-wrap">
        <div className="flex items-center gap-1">
          {(['pen', 'highlighter', 'eraser'] as Tool[]).map((t) => (
            <Button
              key={t}
              variant={tool === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool(t)}
            >
              {t === 'pen' && <Pen className="w-4 h-4" />}
              {t === 'highlighter' && <Highlighter className="w-4 h-4" />}
              {t === 'eraser' && <Eraser className="w-4 h-4" />}
            </Button>
          ))}
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-gray-400 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <span className="text-sm">Size:</span>
          <input
            type="range"
            min="1"
            max="10"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-20"
          />
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={clearCanvas}>
          <Trash2 className="w-4 h-4 mr-1" /> Clear
        </Button>
        {onSave && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onSave(canvasRef.current?.toDataURL() ?? '')}
          >
            <FileText className="w-4 h-4 mr-1" /> Save
          </Button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-96 cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={() => setIsDrawing(false)}
        onMouseLeave={() => setIsDrawing(false)}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={() => setIsDrawing(false)}
      />
    </div>
  );
}