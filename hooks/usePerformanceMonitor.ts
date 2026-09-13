'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { PerformanceMetrics } from '../lib/types';

export function usePerformanceMonitor(enabled: boolean = true) {
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(0);
  const rafIdRef = useRef<number>(0);
  const updatesRef = useRef(0);
  const lastUpdateCheckRef = useRef(0);
  const processingTimeRef = useRef(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    avgFps: 0,
    minFps: 0,
    updatesPerSec: 0,
    totalDataPoints: 0,
    processingTime: 0,
    memoryUsage: null,
    memorySupported: false,
  });

  const recordUpdate = useCallback(() => {
    updatesRef.current++;
  }, []);

  const recordProcessingTime = useCallback((ms: number) => {
    processingTimeRef.current = ms;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const memorySupported = 'memory' in performance;

    const tick = (now: number) => {
      if (lastFrameTimeRef.current > 0) {
        const delta = now - lastFrameTimeRef.current;
        const fps = delta > 0 ? 1000 / delta : 0;
        frameTimesRef.current.push(fps);
        if (frameTimesRef.current.length > 120) {
          frameTimesRef.current.shift();
        }
      }
      lastFrameTimeRef.current = now;

      const nowMs = Date.now();
      if (nowMs - lastUpdateCheckRef.current >= 1000) {
        const memoryUsage = memorySupported
          ? (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize
          : null;
        const frames = frameTimesRef.current;
        const avgFps = frames.length > 0 ? frames.reduce((a, b) => a + b, 0) / frames.length : 0;
        const minFps = frames.length > 0 ? Math.min(...frames) : 0;

        setMetrics({
          fps: frames.length > 0 ? frames[frames.length - 1] : 0,
          avgFps: Math.round(avgFps * 10) / 10,
          minFps: Math.round(minFps * 10) / 10,
          updatesPerSec: updatesRef.current,
          totalDataPoints: 0,
          processingTime: processingTimeRef.current,
          memoryUsage,
          memorySupported,
        });

        updatesRef.current = 0;
        lastUpdateCheckRef.current = nowMs;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [enabled]);

  return { metrics, recordUpdate, recordProcessingTime, updatesRef };
}
