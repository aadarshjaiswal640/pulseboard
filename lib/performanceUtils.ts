import { DataPoint, AggregatedBucket, AggregationLevel, Metric, Boundary, FilterState, SortState, SortDirection } from './types';

// Synchronous versions of data processing functions used by both sync (DataProvider) and async (Worker) paths
export function aggregateData(
  data: DataPoint[],
  level: AggregationLevel
): AggregatedBucket[] {
  if (level === 'none') return [];

  const intervalMs =
    level === '1m' ? 60000 : level === '5m' ? 300000 : 3600000;

  const groups = new Map<string, DataPoint[]>();

  for (const point of data) {
    const bucketKey = Math.floor(point.timestamp / intervalMs) * intervalMs;
    const key = `${bucketKey}-${point.metric}-${point.boundary}`;
    const group = groups.get(key);
    if (group) {
      group.push(point);
    } else {
      groups.set(key, [point]);
    }
  }

  const buckets: AggregatedBucket[] = [];
  for (const [, points] of groups) {
    if (points.length === 0) continue;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
      sum += p.value;
      if (p.value < min) min = p.value;
      if (p.value > max) max = p.value;
    }
    buckets.push({
      timestamp: points[0].timestamp,
      avgValue: sum / points.length,
      minValue: min,
      maxValue: max,
      count: points.length,
      metric: points[0].metric,
      boundary: points[0].boundary,
    });
  }

  buckets.sort((a, b) => a.timestamp - b.timestamp);
  return buckets;
}

export function filterData(
  data: DataPoint[],
  filters: FilterState
): DataPoint[] {
  return data.filter((p) => {
    if (filters.metric !== 'all' && p.metric !== filters.metric) return false;
    if (filters.boundary !== 'all' && p.boundary !== filters.boundary) return false;
    if (filters.status !== 'all' && p.status !== filters.status) return false;
    if (filters.timeRange) {
      if (p.timestamp < filters.timeRange.start || p.timestamp > filters.timeRange.end)
        return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !p.id.toLowerCase().includes(q) &&
        !p.metric.toLowerCase().includes(q) &&
        !p.boundary.toLowerCase().includes(q) &&
        !p.status.toLowerCase().includes(q) &&
        !String(p.value).includes(q)
      )
        return false;
    }
    return true;
  });
}

export function sortData(
  data: DataPoint[],
  field: string,
  direction: SortDirection
): DataPoint[] {
  const sorted = [...data];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case 'timestamp':
        cmp = a.timestamp - b.timestamp;
        break;
      case 'value':
        cmp = a.value - b.value;
        break;
      case 'metric':
        cmp = a.metric.localeCompare(b.metric);
        break;
      case 'boundary':
        cmp = a.boundary.localeCompare(b.boundary);
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status);
        break;
      default:
        cmp = 0;
    }
    return direction === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

export function computeStats(data: DataPoint[]) {
  if (data.length === 0) {
    return { avg: 0, min: 0, max: 0, total: 0, p50: 0, p95: 0, p99: 0 };
  }

  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  const values: number[] = [];

  for (const p of data) {
    sum += p.value;
    if (p.value < min) min = p.value;
    if (p.value > max) max = p.value;
    values.push(p.value);
  }

  values.sort((a, b) => a - b);

  const percentile = (p: number) => {
    const idx = Math.ceil((p / 100) * values.length) - 1;
    return values[Math.max(0, idx)];
  };

  return {
    avg: sum / data.length,
    min,
    max,
    total: data.length,
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
  };
}

export function toCSV(data: DataPoint[]): string {
  const header = 'id,timestamp,metric,boundary,value,status';
  const rows = data.map(
    (p) =>
      `${p.id},${p.timestamp},${p.metric},${p.boundary},${p.value},${p.status}`
  );
  return [header, ...rows].join('\n');
}

export function downloadCSV(data: DataPoint[], filename: string = 'pulseboard-data.csv') {
  const csv = toCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
