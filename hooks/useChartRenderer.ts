'use client';

import { useRef, useCallback, useEffect } from 'react';
import { setupCanvas, clearCanvas, CanvasContext } from '../lib/canvasUtils';

interface UseChartRendererOptions {
  onRender: (cc: CanvasContext) => void;
  enabled?: boolean;
}

export function useChartRenderer({ onRender, enabled = true }: UseChartRendererOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const ccRef = useRef<CanvasContext | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const render = useCallback(() => {
    if (!canvasRef.current || !enabled) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const needsResize =
      canvas.width !== Math.floor(rect.width * dpr) ||
      canvas.height !== Math.floor(rect.height * dpr);

    if (needsResize || !ccRef.current) {
      ccRef.current = setupCanvas(canvas);
    }

    const cc = ccRef.current;
    clearCanvas(cc);
    onRender(cc);
  }, [onRender, enabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      ccRef.current = null;
      render();
    });
    resizeObserverRef.current.observe(canvas);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [render]);

  useEffect(() => {
    if (!enabled) return;
    const loop = () => {
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render, enabled]);

  return { canvasRef };
}
