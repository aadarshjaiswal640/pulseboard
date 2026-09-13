'use client';

import React from 'react';
import { Metric, Boundary, Status, AggregationLevel, METRICS, BOUNDARIES, STATUSES } from '../../lib/types';

interface FilterPanelProps {
  metric: Metric | 'all';
  boundary: Boundary | 'all';
  status: Status | 'all';
  aggregation: AggregationLevel;
  onMetricChange: (m: Metric | 'all') => void;
  onBoundaryChange: (b: Boundary | 'all') => void;
  onStatusChange: (s: Status | 'all') => void;
  onAggregationChange: (a: AggregationLevel) => void;
  onClear: () => void;
}

export function FilterPanel({
  metric,
  boundary,
  status,
  aggregation,
  onMetricChange,
  onBoundaryChange,
  onStatusChange,
  onAggregationChange,
  onClear,
}: FilterPanelProps) {
  const hasFilters = metric !== 'all' || boundary !== 'all' || status !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={metric}
        onChange={(e) => onMetricChange(e.target.value as Metric | 'all')}
        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">All Metrics</option>
        {METRICS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <select
        value={boundary}
        onChange={(e) => onBoundaryChange(e.target.value as Boundary | 'all')}
        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">All Boundaries</option>
        {BOUNDARIES.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as Status | 'all')}
        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={aggregation}
        onChange={(e) => onAggregationChange(e.target.value as AggregationLevel)}
        className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="none">No Aggregation</option>
        <option value="1m">1 Minute</option>
        <option value="5m">5 Minutes</option>
        <option value="1h">1 Hour</option>
      </select>

      {hasFilters && (
        <button
          onClick={onClear}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1.5"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
