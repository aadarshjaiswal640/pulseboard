'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { DataPoint, SortDirection } from '../../lib/types';
import {
  setupCanvas,
  clearCanvas,
  getChartArea,
  mapX,
  mapY,
  drawGrid,
  drawAxes,
  drawLabels,
  formatTimestamp,
  formatNumber,
  CanvasContext,
} from '../../lib/canvasUtils';

interface LineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  title?: string;
  sortField?: string;
  sortDirection?: SortDirection;
}

export function LineChart({ data, width = 800, height = 300, color = '#3b82f6', title, sortField = 'timestamp', sortDirection = 'desc' }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const ccRef = useRef<CanvasContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width, height });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: DataPoint | null }>({ x: 0, y: 0, point: null });
  const zoomRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startOffsetX: 0, startOffsetY: 0 });
  const [resetKey, setResetKey] = useState(0);

  const dataRef = useRef(data);
  const sortFieldRef = useRef(sortField);
  const sortDirectionRef = useRef(sortDirection);
  const containerSizeRef = useRef(containerSize);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { sortFieldRef.current = sortField; }, [sortField]);
  useEffect(() => { sortDirectionRef.current = sortDirection; }, [sortDirection]);
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

  const sortedDataCacheRef = useRef<{ source: DataPoint[]; length: number; byTimestamp: DataPoint[] }>({ source: [], length: 0, byTimestamp: [] });

  // Render canvas on every RAF frame. Cache invalidation happens when:
  // 1. Source data reference changes (immutable update from parent)
  // 2. Data length changes (new points added)
  // Otherwise, reuse cached sorted data to avoid O(n log n) sort on every frame
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = containerSizeRef.current.width;
    const h = containerSizeRef.current.height;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const needsResize = canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr);
    if (needsResize || !ccRef.current) {
      ccRef.current = setupCanvas(canvas);
    }
    const cc = ccRef.current;
    clearCanvas(cc);

    const area = getChartArea(w, h);
    drawGrid(cc.ctx, area, 8, 5);
    drawAxes(cc.ctx, area);

    const currentData = dataRef.current;
    const sf = sortFieldRef.current;
    const sd = sortDirectionRef.current;

    const cache = sortedDataCacheRef.current;
    if (currentData !== cache.source || currentData.length !== cache.length) {
      cache.source = currentData;
      cache.length = currentData.length;
      cache.byTimestamp = [...currentData].sort((a, b) => a.timestamp - b.timestamp);
    }

    let sortedData: DataPoint[];
    if (sf === 'value' && sd === 'asc') {
      sortedData = [...currentData].sort((a, b) => a.value - b.value);
    } else if (sf === 'value' && sd === 'desc') {
      sortedData = [...currentData].sort((a, b) => b.value - a.value);
    } else {
      sortedData = cache.byTimestamp;
    }

    if (sortedData.length === 0) {
      cc.ctx.fillStyle = '#9ca3af';
      cc.ctx.font = '14px system-ui, sans-serif';
      cc.ctx.textAlign = 'center';
      cc.ctx.fillText('No data available', w / 2, h / 2);
      return;
    }

    const minT = sortedData[0].timestamp;
    const maxT = sortedData[sortedData.length - 1].timestamp;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of sortedData) {
      if (p.value < minV) minV = p.value;
      if (p.value > maxV) maxV = p.value;
    }
    const vPad = (maxV - minV) * 0.1 || 10;
    minV -= vPad;
    maxV += vPad;

    const ts = formatTimestamp(minT);
    const te = formatTimestamp(maxT);
    const xLabels = [ts, formatTimestamp(minT + (maxT - minT) * 0.25), formatTimestamp(minT + (maxT - minT) * 0.5), formatTimestamp(minT + (maxT - minT) * 0.75), te];
    const yLabels = Array.from({ length: 6 }, (_, i) => formatNumber(minV + (i / 5) * (maxV - minV)));
    drawLabels(cc.ctx, { x: xLabels, y: yLabels }, area, [], []);

    cc.ctx.save();
    cc.ctx.beginPath();
    cc.ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
    cc.ctx.clip();

    cc.ctx.strokeStyle = color;
    cc.ctx.lineWidth = 1.5;
    cc.ctx.beginPath();

    const step = Math.max(1, Math.floor(sortedData.length / (area.right - area.left)));
    for (let i = 0; i < sortedData.length; i += step) {
      const x = mapX(sortedData[i].timestamp, minT, maxT, area);
      const y = mapY(sortedData[i].value, minV, maxV, area);
      if (i === 0) cc.ctx.moveTo(x, y);
      else cc.ctx.lineTo(x, y);
    }
    const last = sortedData[sortedData.length - 1];
    cc.ctx.lineTo(mapX(last.timestamp, minT, maxT, area), mapY(last.value, minV, maxV, area));
    cc.ctx.stroke();

    cc.ctx.globalAlpha = 0.1;
    cc.ctx.fillStyle = color;
    cc.ctx.lineTo(mapX(last.timestamp, minT, maxT, area), area.bottom);
    cc.ctx.lineTo(mapX(sortedData[0].timestamp, minT, maxT, area), area.bottom);
    cc.ctx.closePath();
    cc.ctx.fill();
    cc.ctx.globalAlpha = 1;

    cc.ctx.restore();

    if (title) {
      cc.ctx.fillStyle = '#374151';
      cc.ctx.font = 'bold 12px system-ui, sans-serif';
      cc.ctx.textAlign = 'left';
      cc.ctx.textBaseline = 'top';
      cc.ctx.fillText(title, area.left, 8);
    }

    cc.ctx.fillStyle = '#9ca3af';
    cc.ctx.font = '10px system-ui, sans-serif';
    cc.ctx.textAlign = 'right';
    cc.ctx.textBaseline = 'top';
    cc.ctx.fillText(`${sortedData.length.toLocaleString()} points`, area.right, 8);
  }, [color, title]);

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
      if (dragRef.current.dragging) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        zoomRef.current.offsetX = dragRef.current.startOffsetX + dx;
        zoomRef.current.offsetY = dragRef.current.startOffsetY + dy;
        return;
      }

      const canvas = canvasRef.current;
      const sortedData = sortedDataCacheRef.current.byTimestamp;
      if (!canvas || sortedData.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const area = getChartArea(containerSize.width, containerSize.height);

      if (mx < area.left || mx > area.right || my < area.top || my > area.bottom) {
        setTooltip((t) => ({ ...t, point: null }));
        return;
      }

      const minT = sortedData[0].timestamp;
      const maxT = sortedData[sortedData.length - 1].timestamp;
      const t = minT + ((mx - area.left) / (area.right - area.left)) * (maxT - minT);
      let closest = sortedData[0];
      let closestDist = Math.abs(closest.timestamp - t);
      for (const p of sortedData) {
        const dist = Math.abs(p.timestamp - t);
        if (dist < closestDist) {
          closest = p;
          closestDist = dist;
        }
      }

      setTooltip({ x: e.clientX, y: e.clientY, point: closest });
    },
    [containerSize]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, startOffsetX: zoomRef.current.offsetX, startOffsetY: zoomRef.current.offsetY };
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomRef.current.scale = Math.max(0.5, Math.min(5, zoomRef.current.scale * delta));
  }, []);

  const handleDoubleClick = useCallback(() => {
    zoomRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
    setResetKey((k) => k + 1);
  }, []);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />
      {tooltip.point && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded px-2 py-1 z-20 shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          <div className="font-mono">{formatTimestamp(tooltip.point.timestamp)}</div>
          <div>{tooltip.point.metric}: {tooltip.point.value.toFixed(2)}</div>
          <div className="text-gray-400">{tooltip.point.boundary} / {tooltip.point.status}</div>
        </div>
      )}
    </div>
  );
}
