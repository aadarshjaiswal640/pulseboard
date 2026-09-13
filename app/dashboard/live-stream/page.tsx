'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useData } from '../../../components/providers/DataProvider';
import { usePerformanceMonitor } from '../../../hooks/usePerformanceMonitor';
import { LineChart } from '../../../components/charts/LineChart';
import { PerformanceMonitor } from '../../../components/ui/PerformanceMonitor';

export default function LiveStreamPage() {
  const {
    data, isRunning, totalReceived, config, performanceMonitorEnabled, streamUpdatesPerSec,
    startStream, pauseStream, resumeStream, stopStream, clearStream,
    setDatasetSize, setStressTest,
  } = useData();

  const { metrics } = usePerformanceMonitor(performanceMonitorEnabled);
  const feedRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const recentData = useMemo(() => {
    return data.slice(-50).reverse();
  }, [data]);

  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [recentData, autoScroll]);

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Live Stream</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Real-time data stream monitor
          {isRunning && (
            <span className="ml-2 inline-flex items-center gap-1 text-emerald-600">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Active
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Status" value={isRunning ? 'Running' : 'Paused'} color={isRunning ? 'text-emerald-600' : 'text-gray-500'} />
        <MetricCard label="FPS" value={metrics.fps.toFixed(0)} color={metrics.fps >= 55 ? 'text-emerald-600' : metrics.fps >= 30 ? 'text-amber-600' : 'text-red-600'} />
        <MetricCard label="Avg FPS" value={metrics.avgFps.toFixed(1)} />
        <MetricCard label="Updates/s" value={streamUpdatesPerSec.toString()} />
        <MetricCard label="Total Events" value={totalReceived.toLocaleString()} />
        <MetricCard label="Dataset Size" value={config.datasetSize.toLocaleString()} />
        <MetricCard label="Processing" value={`${metrics.processingTime.toFixed(1)}ms`} />
        <MetricCard label="Memory" value={metrics.memorySupported ? (metrics.memoryUsage ? `${(metrics.memoryUsage / 1048576).toFixed(1)} MB` : 'N/A') : 'Memory API unavailable'} />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          <button
            onClick={() => { startStream(); }}
            disabled={isRunning}
            className="text-xs px-3 py-1.5 rounded-md font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Start
          </button>
          <button
            onClick={pauseStream}
            disabled={!isRunning}
            className="text-xs px-3 py-1.5 rounded-md font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Pause
          </button>
          <button
            onClick={resumeStream}
            disabled={isRunning}
            className="text-xs px-3 py-1.5 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Resume
          </button>
          <button
            onClick={stopStream}
            className="text-xs px-3 py-1.5 rounded-md font-medium bg-red-500 text-white hover:bg-red-600"
          >
            Clear
          </button>
        </div>

        <div className="flex gap-1 border-l pl-2 border-gray-200">
          <button
            onClick={() => { setStressTest(!config.stressTest); if (!isRunning) startStream(); }}
            className={`text-xs px-3 py-1.5 rounded-md font-medium ${config.stressTest ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Stress Test
          </button>
        </div>

        <div className="flex gap-1 border-l pl-2 border-gray-200">
          {[1000, 5000, 10000, 50000, 100000].map((size) => (
            <button
              key={size}
              onClick={() => setDatasetSize(size)}
              className={`text-xs px-2 py-1.5 rounded-md font-medium ${
                config.datasetSize === size ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {(size / 1000).toFixed(0)}K
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3 h-[350px]">
        <LineChart data={data} title="Real-time Stream" color="#10b981" />
      </div>

      {performanceMonitorEnabled && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Performance Benchmark</h3>
              <p className="text-xs text-gray-400 mt-0.5">Real-time rendering metrics measured via requestAnimationFrame</p>
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {config.datasetSize.toLocaleString()} data points @ {config.interval}ms interval
            </span>
          </div>
          <PerformanceMonitor metrics={metrics} />
          <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
            <div>
              <span className="text-gray-500">FPS Target</span>
              <span className="ml-2 text-gray-300">60 (vsync-locked)</span>
            </div>
            <div>
              <span className="text-gray-500">Rolling Window</span>
              <span className="ml-2 text-gray-300">120 frames</span>
            </div>
            <div>
              <span className="text-gray-500">Memory Source</span>
              <span className="ml-2 text-gray-300">{metrics.memorySupported ? 'performance.memory' : 'N/A (unsupported)'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Live Event Feed</h3>
          <span className="text-xs text-gray-400">{recentData.length} recent events</span>
        </div>
        <div
          ref={feedRef}
          className="max-h-[300px] overflow-y-auto"
        >
          {recentData.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No events yet. Start the stream to see live data.
            </div>
          ) : (
            recentData.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 hover:bg-gray-50 text-xs"
              >
                <span className="text-gray-400 font-mono w-[140px]">
                  {new Date(p.timestamp).toISOString().slice(11, 23)}
                </span>
                <StatusBadge status={p.status} />
                <span className="font-medium text-gray-700 w-[80px]">{p.metric}</span>
                <span className="text-gray-500 w-[60px]">{p.boundary}</span>
                <span className="font-mono font-semibold text-gray-800">{p.value.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const MetricCard = React.memo(function MetricCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-sm font-bold tabular-nums mt-0.5 ${color || 'text-gray-800'}`}>{value}</p>
    </div>
  );
});

const StatusBadge = React.memo(function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    normal: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    critical: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[status] || ''}`}>
      {status}
    </span>
  );
});
