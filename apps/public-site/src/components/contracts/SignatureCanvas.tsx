'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Eraser, Check } from 'lucide-react';

export type SignatureCanvasHandle = {
  clear: () => void;
  toDataUrl: () => string | null;
  isEmpty: () => boolean;
};

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, { onChange?: (dataUrl: string | null) => void }>(
  function SignatureCanvas({ onChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [drawing, setDrawing] = useState(false);
    const [empty, setEmpty] = useState(true);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#0f1226';
    }, []);

    const pos = (e: PointerEvent | React.PointerEvent) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const start = (e: React.PointerEvent) => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setDrawing(true);
      setEmpty(false);
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: React.PointerEvent) => {
      if (!drawing) return;
      const ctx = canvasRef.current!.getContext('2d')!;
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const end = () => {
      setDrawing(false);
      const url = canvasRef.current?.toDataURL('image/png') ?? null;
      onChange?.(url);
    };

    useImperativeHandle(ref, () => ({
      clear() {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setEmpty(true);
        onChange?.(null);
      },
      toDataUrl() {
        return empty ? null : (canvasRef.current?.toDataURL('image/png') ?? null);
      },
      isEmpty() {
        return empty;
      },
    }));

    return (
      <div>
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={() => drawing && end()}
          aria-label="לוח חתימה — חתום כאן עם העכבר או האצבע"
          role="img"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            {empty ? 'חתום במסגרת' : <><Check size={14} className="text-green-600" /> חתימה נרשמה</>}
          </span>
          <button
            type="button"
            onClick={() => {
              const handle = (ref as React.RefObject<SignatureCanvasHandle | null>)?.current;
              handle?.clear();
            }}
            className="inline-flex items-center gap-1 rounded-xl px-2 py-1 hover:bg-surface-muted"
          >
            <Eraser size={14} /> נקה
          </button>
        </div>
      </div>
    );
  },
);
