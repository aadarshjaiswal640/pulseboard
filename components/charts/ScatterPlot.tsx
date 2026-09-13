'use client';

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { DataPoint, Metric } from '../../lib/types';
import { setupCanvas, clearCanvas, getChartArea, mapX, mapY, CanvasContext } from '../../lib/canvasUtils';

interface ScatterPlotProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  title?: string;
  xMetric?: Metric;
  yMetric?: Metric;
}

const STATUS_COLORS: Record<string, string> = {
  normal: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
};

function computePairs(data: DataPoint[], xMetric: Metric, yMetric: Metric) {
  const result: { x: number; y: number; point: DataPoint }[] = [];
  const byX = data.filter((p) => p.metric === xMetric);
  const byY = data.filter((p) => p.metric === yMetric);
  const minLen = Math.min(byX.length, byY.length, 3000);
  for (let i = 0; i < minLen; i++) {
    result.push({ x: byX[i].value, y: byY[i].value, point: byX[i] });
  }
  return result;
}

function drawGridAndAxes(cc: CanvasContext, area: ReturnType<typeof getChartArea>) {
  cc.ctx.strokeStyle = '#e5e7eb';
  cc.ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const y = area.top + (i / 5) * (area.bottom - area.top);
    cc.ctx.beginPath();
    cc.ctx.moveTo(area.left, y);
    cc.ctx.lineTo(area.right, y);
    cc.ctx.stroke();
    const x = area.left + (i / 5) * (area.right - area.left);
    cc.ctx.beginPath();
    cc.ctx.moveTo(x, area.top);
    cc.ctx.lineTo(x, area.bottom);
    cc.ctx.stroke();
  }
  cc.ctx.strokeStyle = '#374151';
  cc.ctx.lineWidth = 1;
  cc.ctx.beginPath();
  cc.ctx.moveTo(area.left, area.top);
  cc.ctx.lineTo(area.left, area.bottom);
  cc.ctx.lineTo(area.right, area.bottom);
  cc.ctx.stroke();
}

export function ScatterPlot({
  data,
  width = 800,
  height = 300,
  title,
  xMetric = 'throughput',
  yMetric = 'latency',
}: ScatterPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const ccRef = useRef<CanvasContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width, height });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: DataPoint | null }>({ x: 0, y: 0, point: null });

  const dataRef = useRef(data);
  const xMetricRef = useRef(xMetric);
  const yMetricRef = useRef(yMetric);
  const containerSizeRef = useRef(containerSize);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { xMetricRef.current = xMetric; }, [xMetric]);
  useEffect(() => { yMetricRef.current = yMetric; }, [yMetric]);
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

  const pairs = useMemo(() => computePairs(data, xMetric, yMetric), [data, xMetric, yMetric]);

  const pairsCacheRef = useRef<{ source: DataPoint[]; sourceLen: number; xm: Metric; ym: Metric; result: ReturnType<typeof computePairs> }>({ source: [], sourceLen: 0, xm: 'throughput', ym: 'latency', result: [] });

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

    const area = getChartArea(w, h);
    drawGridAndAxes(cc, area);

    const xm = xMetricRef.current;
    const ym = yMetricRef.current;
    const currentData = dataRef.current;
    const pairCache = pairsCacheRef.current;
    if (currentData !== pairCache.source || currentData.length !== pairCache.sourceLen || xm !== pairCache.xm || ym !== pairCache.ym) {
      pairCache.source = currentData;
      pairCache.sourceLen = currentData.length;
      pairCache.xm = xm;
      pairCache.ym = ym;
      pairCache.result = computePairs(currentData, xm, ym);
    }
    const currentPairs = pairCache.result;

    if (currentPairs.length === 0) {
      cc.ctx.fillStyle = '#9ca3af';
      cc.ctx.font = '14px system-ui, sans-serif';
      cc.ctx.textAlign = 'center';
      cc.ctx.fillText('No data available', w / 2, h / 2);
      return;
    }

    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of currentPairs) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
    const xPad = (xMax - xMin) * 0.1 || 10;
    const yPad = (yMax - yMin) * 0.1 || 10;
    xMin -= xPad;
    xMax += xPad;
    yMin -= yPad;
    yMax += yPad;

    cc.ctx.save();
    cc.ctx.beginPath();
    cc.ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
    cc.ctx.clip();

    for (const p of currentPairs) {
      const px = mapX(p.x, xMin, xMax, area);
      const py = mapY(p.y, yMin, yMax, area);
      cc.ctx.beginPath();
      cc.ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      cc.ctx.fillStyle = STATUS_COLORS[p.point.status] || '#6b7280';
      cc.ctx.globalAlpha = 0.6;
      cc.ctx.fill();
      cc.ctx.globalAlpha = 1;
    }

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
    cc.ctx.textAlign = 'center';
    cc.ctx.textBaseline = 'top';
    cc.ctx.fillText(xm, (area.left + area.right) / 2, area.bottom + 8);
    cc.ctx.save();
    cc.ctx.translate(area.left - 12, (area.top + area.bottom) / 2);
    cc.ctx.rotate(-Math.PI / 2);
    cc.ctx.textAlign = 'center';
    cc.ctx.textBaseline = 'top';
    cc.ctx.fillText(ym, 0, 0);
    cc.ctx.restore();

    const legendX = area.right - 140;
    const legendY = area.top + 4;
    Object.entries(STATUS_COLORS).forEach(([status, col], i) => {
      cc.ctx.beginPath();
      cc.ctx.arc(legendX + i * 50, legendY + 4, 4, 0, Math.PI * 2);
      cc.ctx.fillStyle = col;
      cc.ctx.fill();
      cc.ctx.fillStyle = '#6b7280';
      cc.ctx.font = '9px system-ui, sans-serif';
      cc.ctx.textAlign = 'left';
      cc.ctx.textBaseline = 'middle';
      cc.ctx.fillText(status, legendX + i * 50 + 8, legendY + 4);
    });
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
      if (!canvas || pairs.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const area = getChartArea(containerSize.width, containerSize.height);

      let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
      for (const p of pairs) {
        if (p.x < xMin) xMin = p.x;
        if (p.x > xMax) xMax = p.x;
        if (p.y < yMin) yMin = p.y;
        if (p.y > yMax) yMax = p.y;
      }
      const xPad = (xMax - xMin) * 0.1 || 10;
      const yPad = (yMax - yMin) * 0.1 || 10;
      xMin -= xPad;
      xMax += xPad;
      yMin -= yPad;
      yMax += yPad;

      let closest: DataPoint | null = null;
      let closestDist = Infinity;
      for (const p of pairs) {
        const px = mapX(p.x, xMin, xMax, area);
        const py = mapY(p.y, yMin, yMax, area);
        const dist = Math.hypot(px - mx, py - my);
        if (dist < closestDist && dist < 20) {
          closestDist = dist;
          closest = p.point;
        }
      }

      setTooltip({ x: e.clientX, y: e.clientY, point: closest });
    },
    [pairs, containerSize]
  );

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip({ x: 0, y: 0, point: null })}
      />
      {tooltip.point && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded px-2 py-1 z-20 shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          <div>{tooltip.point.metric}: {tooltip.point.value.toFixed(2)}</div>
          <div className="text-gray-400">{tooltip.point.boundary} / {tooltip.point.status}</div>
        </div>
      )}
    </div>
  );
}
