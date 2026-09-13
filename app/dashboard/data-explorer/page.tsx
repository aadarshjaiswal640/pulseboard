'use client';

import React, { useState, useCallback } from 'react';
import { useData } from '../../../components/providers/DataProvider';
import { DataTable } from '../../../components/ui/DataTable';
import { FilterPanel } from '../../../components/controls/FilterPanel';
import { TimeRangeSelector } from '../../../components/controls/TimeRangeSelector';
import { downloadCSV } from '../../../lib/performanceUtils';
import { SortDirection } from '../../../lib/types';

export default function DataExplorerPage() {
  const {
    data, filteredData, filters, sort, aggregation,
    setMetric, setBoundary, setStatus, setTimeRange, setSearch, setSort, setAggregation,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setSearch(q);
  }, [setSearch]);

  const handleSort = useCallback((field: string, direction: SortDirection) => {
    setSort(field as never, direction);
  }, [setSort]);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Data Explorer</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Browse and analyze raw event data with search, filter, and sort.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          />
        </div>
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

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{data.length.toLocaleString()}</span> total records
          <span className="mx-1.5 text-gray-300">·</span>
          virtualized rendering (visible rows only)
        </p>
        <button
          onClick={() => downloadCSV(filteredData)}
          className="text-xs px-3 py-1.5 rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Export CSV
        </button>
      </div>

      <DataTable data={filteredData} sort={sort} onSort={handleSort} containerHeight={600} />
    </div>
  );
}
