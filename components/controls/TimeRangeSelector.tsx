'use client';

import React, { useCallback } from 'react';

interface TimeRangeSelectorProps {
  timeRange: { start: number; end: number } | null;
  onTimeRangeChange: (range: { start: number; end: number } | null) => void;
}

const RANGES = [
  { label: 'All', value: 'all' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
];

export function TimeRangeSelector({ timeRange, onTimeRangeChange }: TimeRangeSelectorProps) {
  const handleSelect = useCallback(
    (value: string) => {
      if (value === 'all') {
        onTimeRangeChange(null);
        return;
      }
      const now = Date.now();
      const ms =
        value === '1m' ? 60000 : value === '5m' ? 300000 : value === '15m' ? 900000 : 3600000;
      onTimeRangeChange({ start: now - ms, end: now });
    },
    [onTimeRangeChange]
  );

  return (
    <div className="flex items-center gap-1">
      {RANGES.map((r) => {
        const isActive =
          (r.value === 'all' && timeRange === null) ||
          (r.value !== 'all' && timeRange !== null);
        return (
          <button
            key={r.value}
            onClick={() => handleSelect(r.value)}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
