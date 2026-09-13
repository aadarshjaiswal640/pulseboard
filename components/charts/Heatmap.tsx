'use client';

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { DataPoint, BOUNDARIES, Metric, METRICS } from '../../lib/types';
import { setupCanvas, clearCanvas, getChartArea, CanvasContext } from '../../lib/canvasUtils';

interface HeatmapProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  title?: string;
}

interface CellData {
  metric: Metric;
  boundary: string;
  avgValue: number;
  count: number;
}

function interpolateColor(value: number, min: number, max: number): string {
  if (max === min) return 'rgb(59, 130, 246)';
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  if (ratio < 0.25) {
    const t = ratio / 0.25;
    return `rgb(${Math.round(16 + t * (59 - 16))}, ${Math.round(185 + t * (130 - 185))}, ${Math.round(129 + t * (246 - 129))})`;
  }
  if (ratio < 0.5) {
    const t = (ratio - 0.25) / 0.25;
    return `rgb(${Math.round(59 + t * (245 - 59))}, ${Math.round(130 + t * (158 - 130))}, ${Math.round(246 + t * (11 - 246))})`;
  }
  if (ratio < 0.75) {
    const t = (ratio - 0.5) / 0.25;
    return `rgb(${Math.round(245 + t * (239 - 245))}, ${Math.round(158 + t * (68 - 158))}, ${Math.round(11 + t * (68 - 11))})`;
  }
  const t = (ratio - 0.75) / 0.25;
  return `rgb(${Math.round(239 + t * (220 - 239))}, ${Math.round(68 + t * (38 - 68))}, ${Math.round(68 + t * (38 - 68))})`;
}

function computeCells(data: DataPoint[]): CellData[] {
  const map = new Map<string, { sum: number; count: number }>();
  for (const p of data) {
    const key = `${p.metric}-${p.boundary}`;
    const existing = map.get(key);
    if (existing) {
      existing.sum += p.value;
      existing.count++;
    } else {
      map.set(key, { sum: p.value, count: 1 });
    }
  }
  const result: CellData[] = [];
  for (const metric of METRICS) {
    for (const boundary of BOUNDARIES) {
      const key = `${metric}-${boundary}`;
      const existing = map.get(key);
      result.push({
        metric,
        boundary,
        avgValue: existing ? existing.sum / existing.count : 0,
        count: existing ? existing.count : 0,
      });
    }
  }
  return result;
}

export function Heatmap({ data, width = 800, height = 300, title }: HeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const ccRef = useRef<CanvasContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width, height });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; cell: CellData | null }>({ x: 0, y: 0, cell: null });

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

  const cells: CellData[] = useMemo(() => computeCells(data), [data]);

  const cellsCacheRef = useRef<{ source: DataPoint[]; length: number; result: CellData[] }>({ source: [], length: 0, result: [] });

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
    const cellCache = cellsCacheRef.current;
    if (currentData !== cellCache.source || currentData.length !== cellCache.length) {
      cellCache.source = currentData;
      cellCache.length = currentData.length;
      cellCache.result = computeCells(currentData);
    }
    const currentCells = cellCache.result;
    const area = getChartArea(w, h, { bottom: 50, left: 80 });
    const rows = METRICS.length;
    const cols = BOUNDARIES.length;
    const cellW = (area.right - area.left) / cols;
    const cellH = (area.bottom - area.top) / rows;

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const cell of currentCells) {
      if (cell.avgValue < minVal) minVal = cell.avgValue;
      if (cell.avgValue > maxVal) maxVal = cell.avgValue;
    }

    currentCells.forEach((cell, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = area.left + col * cellW;
      const y = area.top + row * cellH;

      cc.ctx.fillStyle = interpolateColor(cell.avgValue, minVal, maxVal);
      cc.ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

      cc.ctx.strokeStyle = '#fff';
      cc.ctx.lineWidth = 1;
      cc.ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);

      cc.ctx.fillStyle = cell.avgValue > (maxVal + minVal) / 2 ? '#fff' : '#1f2937';
      cc.ctx.font = 'bold 11px system-ui, sans-serif';
      cc.ctx.textAlign = 'center';
      cc.ctx.textBaseline = 'middle';
      cc.ctx.fillText(cell.avgValue.toFixed(1), x + cellW / 2, y + cellH / 2);
    });

    cc.ctx.fillStyle = '#6b7280';
    cc.ctx.font = '10px system-ui, sans-serif';
    cc.ctx.textAlign = 'center';
    BOUNDARIES.forEach((b, i) => {
      cc.ctx.fillText(b, area.left + i * cellW + cellW / 2, area.bottom + 16);
    });

    cc.ctx.textAlign = 'right';
    METRICS.forEach((m, i) => {
      cc.ctx.fillText(m, area.left - 8, area.top + i * cellH + cellH / 2 + 3);
    });

    if (title) {
      cc.ctx.fillStyle = '#374151';
      cc.ctx.font = 'bold 12px system-ui, sans-serif';
      cc.ctx.textAlign = 'left';
      cc.ctx.textBaseline = 'top';
      cc.ctx.fillText(title, area.left, 8);
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
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const area = getChartArea(containerSize.width, containerSize.height, { bottom: 50, left: 80 });

      if (mx < area.left || mx > area.right || my < area.top || my > area.bottom) {
        setTooltip((t) => ({ ...t, cell: null }));
        return;
      }

      const cols = BOUNDARIES.length;
      const rows = METRICS.length;
      const cellW = (area.right - area.left) / cols;
      const cellH = (area.bottom - area.top) / rows;
      const col = Math.floor((mx - area.left) / cellW);
      const row = Math.floor((my - area.top) / cellH);

      if (col < 0 || col >= cols || row < 0 || row >= rows) {
        setTooltip((t) => ({ ...t, cell: null }));
        return;
      }

      const idx = row * cols + col;
      setTooltip({ x: e.clientX, y: e.clientY, cell: cells[idx] || null });
    },
    [cells, containerSize]
  );

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip((t) => ({ ...t, cell: null }))}
      />
      {tooltip.cell && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded px-2 py-1 z-20 shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          <div className="font-bold">{tooltip.cell.boundary} / {tooltip.cell.metric}</div>
          <div>Avg: {tooltip.cell.avgValue.toFixed(2)}</div>
          <div className="text-gray-400">Count: {tooltip.cell.count.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}
