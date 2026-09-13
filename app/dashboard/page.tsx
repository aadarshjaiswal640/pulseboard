'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useData } from '../../components/providers/DataProvider';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { LineChart } from '../../components/charts/LineChart';
import { BarChart } from '../../components/charts/BarChart';
import { ScatterPlot } from '../../components/charts/ScatterPlot';
import { Heatmap } from '../../components/charts/Heatmap';
import { PerformanceMonitor } from '../../components/ui/PerformanceMonitor';
import { DataTable } from '../../components/ui/DataTable';
import { FilterPanel } from '../../components/controls/FilterPanel';
import { TimeRangeSelector } from '../../components/controls/TimeRangeSelector';
import { downloadCSV } from '../../lib/performanceUtils';
import { SortDirection } from '../../lib/types';

export default function DashboardOverviewPage() {
  const {
    data, filteredData, aggregatedData, isRunning, totalReceived, config,
    filters, sort, aggregation, performanceMonitorEnabled, streamUpdatesPerSec,
    setMetric, setBoundary, setStatus, setTimeRange, setSearch, setSort, setAggregation,
    setDatasetSize, setStressTest, startStream, pauseStream, resumeStream, clearStream,
  } = useData();

  const { metrics } = usePerformanceMonitor(performanceMonitorEnabled);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setSearch(q);
  }, [setSearch]);

  const handleSort = useCallback((field: string, direction: SortDirection) => {
    setSort(field as never, direction);
  }, [setSort]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return { avg: 0, total: 0, throughput: 0, latency: 0 };
    let sum = 0;
    let count = 0;
    let throughputSum = 0;
    let throughputCount = 0;
    let latencySum = 0;
    let latencyCount = 0;
    for (const p of filteredData) {
      sum += p.value;
      count++;
      if (p.metric === 'throughput') { throughputSum += p.value; throughputCount++; }
      if (p.metric === 'latency') { latencySum += p.value; latencyCount++; }
    }
    return {
      avg: count > 0 ? sum / count : 0,
      total: count,
      throughput: throughputCount > 0 ? throughputSum / throughputCount : 0,
      latency: latencyCount > 0 ? latencySum / latencyCount : 0,
    };
  }, [filteredData]);

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Performance Data</span>
            {isRunning && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                STREAMING
              </span>
            )}
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Performance Data Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Read throughput, latency, and system behavior in one glance.
            {config.stressTest && <span className="text-amber-600 font-medium ml-1">Stress-test mode active.</span>}
          </p>
        </div>
        <PerformanceMonitor metrics={metrics} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterPanel
          metric={filters.metric}
          boundary={filters.boundary}
          status={filters.status}
          aggregation={aggregation}
          onMetricChange={setMetric}
          onBoundaryChange={setBoundary}
          onStatusChange={setStatus}
          onAggregationChange={setAggregation}
          onClear={() => { setMetric('all'); setBoundary('all'); setStatus('all'); setTimeRange(null); handleSearch(''); }}
        />
        <TimeRangeSelector timeRange={filters.timeRange} onTimeRangeChange={setTimeRange} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={config.datasetSize}
          onChange={(e) => setDatasetSize(Number(e.target.value))}
          className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white"
        >
          <option value={1000}>1K points</option>
          <option value={5000}>5K points</option>
          <option value={10000}>10K points</option>
          <option value={50000}>50K points</option>
          <option value={100000}>100K points</option>
        </select>
        <button
          onClick={() => { setStressTest(!config.stressTest); if (!isRunning) startStream(); }}
          className={`text-xs px-3 py-1.5 rounded-md font-medium ${config.stressTest ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          {config.stressTest ? 'Stop Stress Test' : 'Stress Test'}
        </button>
        <button
          onClick={isRunning ? pauseStream : resumeStream}
          className="text-xs px-3 py-1.5 rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          {isRunning ? 'Pause' : 'Resume'}
        </button>
        <button
          onClick={clearStream}
          className="text-xs px-3 py-1.5 rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Refresh
        </button>
        <button
          onClick={() => downloadCSV(filteredData)}
          className="text-xs px-3 py-1.5 rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Throughput" value={stats.throughput.toFixed(0)} unit="req/s" color="text-blue-600" />
        <StatCard title="Avg Signal" value={stats.avg.toFixed(1)} unit="" color="text-emerald-600" />
        <StatCard title="Updates/sec" value={streamUpdatesPerSec.toString()} unit="/s" color="text-purple-600" />
        <StatCard title="Total Events" value={totalReceived.toLocaleString()} unit="" color="text-gray-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 h-[320px]">
          <LineChart data={filteredData} title="Signal Over Time" />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 h-[320px]">
          <BarChart data={filteredData} title="Category Pressure" />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 h-[320px]">
          <ScatterPlot data={filteredData} title="Event Distribution" />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 h-[320px]">
          <Heatmap data={filteredData} title="Load Matrix" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Raw Event Buffer</h2>
          <span className="text-xs text-gray-400">
            {filteredData.length.toLocaleString()} / {data.length.toLocaleString()} events
          </span>
        </div>
        <div className="max-h-[400px] overflow-hidden">
          <DataTable data={filteredData.slice(0, 200)} sort={sort} onSort={handleSort} containerHeight={380} />
        </div>
      </div>
    </div>
  );
}

const StatCard = React.memo(function StatCard({ title, value, unit, color }: { title: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{title}</p>
      <p className={`text-xl font-bold tabular-nums mt-0.5 ${color}`}>
        {value}<span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
      </p>
    </div>
  );
});
