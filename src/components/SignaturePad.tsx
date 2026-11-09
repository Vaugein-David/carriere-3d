'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, type PointerEvent, type Ref } from 'react';

type Stroke = [number, number][];

export interface SignaturePadHandle {
  /** Image PNG de la signature (trait noir sur fond blanc) */
  toPng: () => string;
  clear: () => void;
}

const EXPORT_W = 800;
const EXPORT_H = 300;

function draw(ctx: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number, lineWidth: number) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    const [first, ...rest] = s;
    if (!first) continue;
    ctx.beginPath();
    if (rest.length === 0) {
      ctx.arc(first[0] * w, first[1] * h, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.moveTo(first[0] * w, first[1] * h);
    for (const [x, y] of rest) ctx.lineTo(x * w, y * h);
    ctx.stroke();
  }
}

/** Longueur totale du tracé, en largeurs de cadre : écarte un simple point ou un trait accidentel */
function inkLength(strokes: Stroke[]) {
  let total = 0;
  for (const s of strokes) {
    s.reduce((a, b) => {
      total += Math.hypot(b[0] - a[0], (b[1] - a[1]) * (EXPORT_H / EXPORT_W));
      return b;
    });
  }
  return total;
}

/**
 * Cadre de signature au doigt, à la souris ou au stylet. Les traits sont gardés
 * en coordonnées relatives : la signature survit à la rotation du téléphone.
 */
export function SignaturePad({
  label,
  onChange,
  ref,
}: {
  label: string;
  /** Indique si le tracé est assez long pour être une signature */
  onChange: (signed: boolean) => void;
  ref?: Ref<SignaturePadHandle>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef(false);

  const render = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = c.getBoundingClientRect();
    if (c.width !== Math.round(width * dpr) || c.height !== Math.round(height * dpr)) {
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, strokes.current, width, height, 3);
  }, []);

  useEffect(() => {
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvasRef.current!);
    return () => observer.disconnect();
  }, [render]);

  const start = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const r = e.currentTarget.getBoundingClientRect();
    strokes.current.push([[(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]]);
    render();
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const last = strokes.current.at(-1);
    if (!last) return;
    const r = e.currentTarget.getBoundingClientRect();
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const c of events.length ? events : [e]) last.push([(c.clientX - r.left) / r.width, (c.clientY - r.top) / r.height]);
    render();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(inkLength(strokes.current) > 0.25);
  };

  useImperativeHandle(
    ref,
    () => ({
      toPng: () => {
        const out = document.createElement('canvas');
        out.width = EXPORT_W;
        out.height = EXPORT_H;
        draw(out.getContext('2d')!, strokes.current, EXPORT_W, EXPORT_H, 4);
        return out.toDataURL('image/png');
      },
      clear: () => {
        strokes.current = [];
        render();
        onChange(false);
      },
    }),
    [onChange, render],
  );

  return (
    <canvas
      ref={canvasRef}
      className="signature-pad"
      role="img"
      aria-label={label}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    />
  );
}
