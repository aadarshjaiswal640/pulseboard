'use client';

import React from 'react';
import { PerformanceMetrics } from '../../lib/types';

interface PerformanceMonitorProps {
  metrics: PerformanceMetrics;
  compact?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function MetricBadge({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${color || 'text-gray-100'}`}>{value}</span>
    </div>
  );
}

export function PerformanceMonitor({ metrics, compact = false }: PerformanceMonitorProps) {
  const fpsColor =
    metrics.fps >= 55 ? 'text-emerald-400' :
    metrics.fps >= 30 ? 'text-amber-400' : 'text-red-400';

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs font-mono">
        <span className={fpsColor}>{metrics.fps.toFixed(0)} FPS</span>
        <span className="text-gray-400">{metrics.updatesPerSec}/s</span>
        {metrics.memorySupported && metrics.memoryUsage !== null && (
          <span className="text-gray-400">{formatBytes(metrics.memoryUsage)}</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 flex items-center gap-1 overflow-x-auto">
      <MetricBadge label="FPS" value={metrics.fps.toFixed(0)} color={fpsColor} />
      <div className="w-px h-6 bg-gray-700" />
      <MetricBadge label="Avg FPS" value={metrics.avgFps.toFixed(1)} />
      <div className="w-px h-6 bg-gray-700" />
      <MetricBadge label="Min FPS" value={metrics.minFps.toFixed(1)} />
      <div className="w-px h-6 bg-gray-700" />
      <MetricBadge label="Updates/s" value={metrics.updatesPerSec.toString()} />
      <div className="w-px h-6 bg-gray-700" />
      <MetricBadge label="Processing" value={`${metrics.processingTime.toFixed(1)}ms`} />
      <div className="w-px h-6 bg-gray-700" />
      {metrics.memorySupported && metrics.memoryUsage !== null ? (
        <MetricBadge label="Memory" value={formatBytes(metrics.memoryUsage)} />
      ) : (
        <MetricBadge label="Memory" value="N/A" />
      )}
    </div>
  );
}
