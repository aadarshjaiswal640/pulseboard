export type Metric = 'throughput' | 'latency' | 'errors' | 'requests';
export type Boundary = 'Core' | 'Edge' | 'Batch' | 'Stream';
export type Status = 'normal' | 'warning' | 'critical';

export interface DataPoint {
  id: string;
  timestamp: number;
  metric: Metric;
  boundary: Boundary;
  value: number;
  status: Status;
}

export interface AggregatedBucket {
  timestamp: number;
  avgValue: number;
  minValue: number;
  maxValue: number;
  count: number;
  metric: Metric;
  boundary: Boundary;
}

export type AggregationLevel = 'none' | '1m' | '5m' | '1h';

export interface FilterState {
  metric: Metric | 'all';
  boundary: Boundary | 'all';
  status: Status | 'all';
  timeRange: { start: number; end: number } | null;
  search: string;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: Metric;
  boundary: Boundary;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  enabled: boolean;
  createdAt: number;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: number;
  value: number;
  metric: Metric;
  boundary: Boundary;
}

export interface StreamConfig {
  datasetSize: number;
  interval: number;
  stressTest: boolean;
}

export interface DashboardSettings {
  defaultDatasetSize: number;
  defaultAggregation: AggregationLevel;
  defaultTimeRange: string;
  streamInterval: number;
  performanceMonitorEnabled: boolean;
  animationsEnabled: boolean;
  workerProcessingEnabled: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  avgFps: number;
  minFps: number;
  updatesPerSec: number;
  totalDataPoints: number;
  processingTime: number;
  memoryUsage: number | null;
  memorySupported: boolean;
}

export type SortField = 'timestamp' | 'value' | 'metric' | 'boundary' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export const METRIC_RANGES: Record<Metric, { baseline: number; variance: number; min: number; max: number }> = {
  throughput: { baseline: 500, variance: 200, min: 0, max: 2000 },
  latency: { baseline: 120, variance: 60, min: 5, max: 500 },
  errors: { baseline: 5, variance: 8, min: 0, max: 100 },
  requests: { baseline: 1000, variance: 400, min: 0, max: 5000 },
};

export const METRICS: Metric[] = ['throughput', 'latency', 'errors', 'requests'];
export const BOUNDARIES: Boundary[] = ['Core', 'Edge', 'Batch', 'Stream'];
export const STATUSES: Status[] = ['normal', 'warning', 'critical'];
