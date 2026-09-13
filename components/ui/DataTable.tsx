'use client';

import React, { useMemo } from 'react';
import { DataPoint, SortState, SortDirection } from '../../lib/types';
import { useVirtualization } from '../../hooks/useVirtualization';

interface DataTableProps {
  data: DataPoint[];
  sort: SortState;
  onSort: (field: SortState['field'], direction: SortDirection) => void;
  containerHeight?: number;
}

const STATUS_STYLES: Record<string, string> = {
  normal: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

const METRIC_STYLES: Record<string, string> = {
  throughput: 'bg-blue-100 text-blue-700',
  latency: 'bg-orange-100 text-orange-700',
  errors: 'bg-red-100 text-red-700',
  requests: 'bg-green-100 text-green-700',
};

function SortIcon({ field, currentField, direction }: { field: string; currentField: string; direction: SortDirection }) {
  if (field !== currentField) return <span className="text-gray-300 ml-1">&#8597;</span>;
  return <span className="text-blue-600 ml-1">{direction === 'asc' ? '&#9650;' : '&#9660;'}</span>;
}

export function DataTable({ data, sort, onSort, containerHeight = 500 }: DataTableProps) {
  const ROW_HEIGHT = 36;
  const { virtualItems, totalHeight, containerRef } = useVirtualization({
    itemCount: data.length,
    itemHeight: ROW_HEIGHT,
    containerHeight,
    overscan: 10,
  });

  const visibleData = useMemo(() => {
    return virtualItems.map((v) => ({
      ...v,
      point: data[v.index],
    })).filter((v) => v.point);
  }, [virtualItems, data]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              <th
                className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => onSort('timestamp', sort.field === 'timestamp' && sort.direction === 'desc' ? 'asc' : 'desc')}
              >
                Timestamp<SortIcon field="timestamp" currentField={sort.field} direction={sort.direction} />
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th
                className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => onSort('metric', sort.field === 'metric' && sort.direction === 'desc' ? 'asc' : 'desc')}
              >
                Metric<SortIcon field="metric" currentField={sort.field} direction={sort.direction} />
              </th>
              <th
                className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => onSort('boundary', sort.field === 'boundary' && sort.direction === 'desc' ? 'asc' : 'desc')}
              >
                Boundary<SortIcon field="boundary" currentField={sort.field} direction={sort.direction} />
              </th>
              <th
                className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => onSort('value', sort.field === 'value' && sort.direction === 'desc' ? 'asc' : 'desc')}
              >
                Value<SortIcon field="value" currentField={sort.field} direction={sort.direction} />
              </th>
              <th
                className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => onSort('status', sort.field === 'status' && sort.direction === 'desc' ? 'asc' : 'desc')}
              >
                Status<SortIcon field="status" currentField={sort.field} direction={sort.direction} />
              </th>
            </tr>
          </thead>
        </table>
      </div>

      <div
        ref={containerRef}
        style={{ height: containerHeight, overflow: 'auto' }}
        className="relative"
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleData.map(({ index, offsetTop, height, point }) => (
            <div
              key={point.id}
              className="absolute left-0 right-0 border-b border-gray-100 hover:bg-gray-50 flex items-center"
              style={{
                top: offsetTop,
                height,
                minWidth: '600px',
              }}
            >
              <div className="px-4 text-xs text-gray-500 font-mono w-[180px]">
                {new Date(point.timestamp).toISOString().replace('T', ' ').slice(0, 23)}
              </div>
              <div className="px-4 text-xs text-gray-400 font-mono w-[140px] truncate">{point.id}</div>
              <div className="px-4 w-[120px]">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${METRIC_STYLES[point.metric]}`}>
                  {point.metric}
                </span>
              </div>
              <div className="px-4 text-xs text-gray-600 w-[100px]">{point.boundary}</div>
              <div className="px-4 text-xs font-mono font-semibold text-gray-800 w-[100px]">{point.value.toFixed(2)}</div>
              <div className="px-4 w-[100px]">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[point.status]}`}>
                  {point.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
