'use client';

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { DataPoint, Metric, BOUNDARIES } from '../../lib/types';
import { setupCanvas, clearCanvas, getChartArea, CanvasContext } from '../../lib/canvasUtils';

interface BarChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  title?: string;
}

interface CategoryData {
  label: string;
  values: Record<Metric, number>;
  counts: Record<Metric, number>;
}

const METRIC_COLORS: Record<Metric, string> = {
  throughput: '#3b82f6',
  latency: '#f59e0b',
  errors: '#ef4444',
  requests: '#10b981',
};

function computeCategories(data: DataPoint[]): CategoryData[] {
  const map = new Map<string, CategoryData>();
  for (const boundary of BOUNDARIES) {
    map.set(boundary, {
      label: boundary,
      values: { throughput: 0, latency: 0, errors: 0, requests: 0 },
      counts: { throughput: 0, latency: 0, errors: 0, requests: 0 },
    });
  }
  for (const p of data) {
    const cat = map.get(p.boundary);
    if (cat) {
      cat.values[p.metric] += p.value;
      cat.counts[p.metric]++;
    }
  }
  for (const cat of map.values()) {
    for (const m of ['throughput', 'latency', 'errors', 'requests'] as Metric[]) {
      if (cat.counts[m] > 0) {
        cat.values[m] = cat.values[m] / cat.counts[m];
      }
    }
  }
  return Array.from(map.values());
}

export function BarChart({ data, width = 800, height = 300, title }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const ccRef = useRef<CanvasContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width, height });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const dataRef = useRef(data);
  const containerSizeRef = useRef(containerSize);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { containerSizeRef.current = containerSize; }, [containerSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0].contentRect;
      setContainerSize({ width: w, height: h });
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  const categories: CategoryData[] = useMemo(() => computeCategories(data), [data]);

  const categoriesCacheRef = useRef<{ source: DataPoint[]; length: number; result: CategoryData[] }>({ source: [], length: 0, result: [] });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = containerSizeRef.current.width;
    const h = containerSizeRef.current.height;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr) || !ccRef.current) {
      ccRef.current = setupCanvas(canvas);
    }
    const cc = ccRef.current;
    clearCanvas(cc);

    const currentData = dataRef.current;
    const catCache = categoriesCacheRef.current;
    if (currentData !== catCache.source || currentData.length !== catCache.length) {
      catCache.source = currentData;
      catCache.length = currentData.length;
      catCache.result = computeCategories(currentData);
    }
    const cats = catCache.result;
    const area = getChartArea(w, h, { bottom: 60 });
    const metrics: Metric[] = ['throughput', 'latency', 'errors', 'requests'];
    const catCount = cats.length;
    const metricCount = metrics.length;
    if (catCount === 0) return;

    const groupWidth = (area.right - area.left) / catCount;
    const barWidth = (groupWidth * 0.7) / metricCount;
    const groupPad = groupWidth * 0.15;

    let maxVal = 0;
    for (const cat of cats) {
      for (const m of metrics) {
        if (cat.values[m] > maxVal) maxVal = cat.values[m];
      }
    }
    if (maxVal === 0) maxVal = 100;

    cc.ctx.strokeStyle = '#e5e7eb';
    cc.ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = area.top + (i / 5) * (area.bottom - area.top);
      cc.ctx.beginPath();
      cc.ctx.moveTo(area.left, y);
      cc.ctx.lineTo(area.right, y);
      cc.ctx.stroke();
      cc.ctx.fillStyle = '#9ca3af';
      cc.ctx.font = '10px system-ui, sans-serif';
      cc.ctx.textAlign = 'right';
      cc.ctx.fillText(((5 - i) / 5 * maxVal).toFixed(0), area.left - 6, y + 3);
    }

    cc.ctx.strokeStyle = '#374151';
    cc.ctx.lineWidth = 1;
    cc.ctx.beginPath();
    cc.ctx.moveTo(area.left, area.top);
    cc.ctx.lineTo(area.left, area.bottom);
    cc.ctx.lineTo(area.right, area.bottom);
    cc.ctx.stroke();

    cats.forEach((cat, ci) => {
      const gx = area.left + ci * groupWidth;
      cc.ctx.fillStyle = '#6b7280';
      cc.ctx.font = '10px system-ui, sans-serif';
      cc.ctx.textAlign = 'center';
      cc.ctx.fillText(cat.label, gx + groupWidth / 2, area.bottom + 16);

      metrics.forEach((m, mi) => {
        const barH = (cat.values[m] / maxVal) * (area.bottom - area.top);
        const bx = gx + groupPad + mi * barWidth;
        const by = area.bottom - barH;

        cc.ctx.fillStyle = METRIC_COLORS[m];
        cc.ctx.fillRect(bx, by, barWidth - 1, barH);
      });
    });

    const legendY = 8;
    metrics.forEach((m, i) => {
      const x = area.left + 10 + i * 80;
      cc.ctx.fillStyle = METRIC_COLORS[m];
      cc.ctx.fillRect(x, legendY, 10, 10);
      cc.ctx.fillStyle = '#6b7280';
      cc.ctx.font = '10px system-ui, sans-serif';
      cc.ctx.textAlign = 'left';
      cc.ctx.textBaseline = 'top';
      cc.ctx.fillText(m, x + 14, legendY + 1);
    });

    if (title) {
      cc.ctx.fillStyle = '#374151';
      cc.ctx.font = 'bold 12px system-ui, sans-serif';
      cc.ctx.textAlign = 'right';
      cc.ctx.textBaseline = 'top';
      cc.ctx.fillText(title, area.right, 8);
    }
  }, [title]);

  useEffect(() => {
    const loop = () => {
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || categories.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const area = getChartArea(containerSize.width, containerSize.height, { bottom: 60 });

      if (mx < area.left || mx > area.right || my < area.top || my > area.bottom) {
        setTooltip(null);
        return;
      }

      const groupWidth = (area.right - area.left) / categories.length;
      const ci = Math.floor((mx - area.left) / groupWidth);
      if (ci < 0 || ci >= categories.length) {
        setTooltip(null);
        return;
      }
      const cat = categories[ci];
      const metrics: Metric[] = ['throughput', 'latency', 'errors', 'requests'];
      const lines = metrics.map((m) => `${m}: ${cat.values[m].toFixed(1)}`);
      setTooltip({ x: e.clientX, y: e.clientY, text: `${cat.label}\n${lines.join('\n')}` });
    },
    [categories, containerSize]
  );

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded px-2 py-1 z-20 shadow-lg whitespace-pre"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
