import {
  DataPoint,
  Metric,
  Boundary,
  Status,
  METRIC_RANGES,
  METRICS,
  BOUNDARIES,
} from './types';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function getStatus(value: number, metric: Metric): Status {
  const range = METRIC_RANGES[metric];
  const ratio = (value - range.min) / (range.max - range.min);
  if (ratio > 0.85) return 'critical';
  if (ratio > 0.65) return 'warning';
  return 'normal';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function generateDataPoint(
  id: string,
  timestamp: number,
  metric: Metric,
  boundary: Boundary,
  rng: () => number
): DataPoint {
  const range = METRIC_RANGES[metric];
  const timeFactor = timestamp / 1000;

  const periodic = Math.sin(timeFactor * 0.001 * (METRICS.indexOf(metric) + 1)) * range.variance * 0.3;
  const noise = (rng() - 0.5) * range.variance * 0.6;
  const spike = rng() < 0.02 ? range.variance * 1.5 * (rng() > 0.5 ? 1 : -1) : 0;

  const value = clamp(
    range.baseline + periodic + noise + spike,
    range.min,
    range.max
  );

  return {
    id,
    timestamp,
    metric,
    boundary,
    value: Math.round(value * 100) / 100,
    status: getStatus(value, metric),
  };
}

export function generateDataset(
  count: number,
  seed: number = 42
): DataPoint[] {
  const rng = seededRandom(seed);
  const now = Date.now();
  const span = count * 100;
  const data: DataPoint[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const metric = METRICS[Math.floor(rng() * METRICS.length)];
    const boundary = BOUNDARIES[Math.floor(rng() * BOUNDARIES.length)];
    const timestamp = now - span + i * 100;
    data[i] = generateDataPoint(`dp-${i}`, timestamp, metric, boundary, rng);
  }

  return data;
}

export function createRng(seed: number): () => number {
  return seededRandom(seed);
}
