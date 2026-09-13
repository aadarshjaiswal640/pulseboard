'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DataPoint, AggregatedBucket, Metric, Boundary, Status, AggregationLevel, FilterState, AlertRule, AlertEvent, SortState } from '../../lib/types';
import { useDataStream } from '../../hooks/useDataStream';
import { useDataWorker } from '../../hooks/useDataWorker';
import { sortData } from '../../lib/performanceUtils';

interface DataContextValue {
  data: DataPoint[];
  filteredData: DataPoint[];
  aggregatedData: AggregatedBucket[];
  isRunning: boolean;
  totalReceived: number;
  streamUpdatesPerSec: number;
  config: { datasetSize: number; interval: number; stressTest: boolean };
  filters: FilterState;
  sort: SortState;
  aggregation: AggregationLevel;
  alertRules: AlertRule[];
  recentAlerts: AlertEvent[];
  performanceMonitorEnabled: boolean;
  setMetric: (m: Metric | 'all') => void;
  setBoundary: (b: Boundary | 'all') => void;
  setStatus: (s: Status | 'all') => void;
  setTimeRange: (range: { start: number; end: number } | null) => void;
  setSearch: (q: string) => void;
  setSort: (field: SortState['field'], dir: SortState['direction']) => void;
  setAggregation: (a: AggregationLevel) => void;
  setDatasetSize: (size: number) => void;
  setStressTest: (v: boolean) => void;
  setInterval_: (ms: number) => void;
  setPerformanceMonitorEnabled: (v: boolean) => void;
  startStream: () => void;
  pauseStream: () => void;
  resumeStream: () => void;
  stopStream: () => void;
  clearStream: () => void;
  addAlertRule: (rule: Omit<AlertRule, 'id' | 'createdAt'>) => void;
  updateAlertRule: (id: string, rule: Partial<AlertRule>) => void;
  deleteAlertRule: (id: string) => void;
  toggleAlertRule: (id: string) => void;
  clearAlerts: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

function loadSettings(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('pulseboard-settings');
    if (saved) return JSON.parse(saved) as Record<string, unknown>;
  } catch { /* ignore */ }
  return null;
}

function filterDataSync(data: DataPoint[], filters: FilterState): DataPoint[] {
  if (filters.metric === 'all' && filters.boundary === 'all' && filters.status === 'all' && !filters.timeRange && !filters.search) {
    return data;
  }
  return data.filter((p) => {
    if (filters.metric !== 'all' && p.metric !== filters.metric) return false;
    if (filters.boundary !== 'all' && p.boundary !== filters.boundary) return false;
    if (filters.status !== 'all' && p.status !== filters.status) return false;
    if (filters.timeRange) {
      if (p.timestamp < filters.timeRange.start || p.timestamp > filters.timeRange.end) return false;
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

function aggregateDataSync(data: DataPoint[], level: AggregationLevel): AggregatedBucket[] {
  if (level === 'none') return [];
  const intervalMs = level === '1m' ? 60000 : level === '5m' ? 300000 : 3600000;
  const groups = new Map<string, DataPoint[]>();
  for (const point of data) {
    const bucketKey = Math.floor(point.timestamp / intervalMs) * intervalMs;
    const key = `${bucketKey}-${point.metric}-${point.boundary}`;
    const group = groups.get(key);
    if (group) group.push(point);
    else groups.set(key, [point]);
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

const VALID_SIZES = [1000, 5000, 10000, 50000, 100000] as const;
const VALID_INTERVALS = [50, 100, 200, 500, 1000] as const;

function getInitialSettings() {
  const s = loadSettings();
  const ds = s?.defaultDatasetSize;
  const iv = s?.streamInterval;
  const ag = s?.defaultAggregation;
  const pm = s?.performanceMonitorEnabled;
  return {
    datasetSize: typeof ds === 'number' && VALID_SIZES.includes(ds as typeof VALID_SIZES[number]) ? ds : 10000,
    interval: typeof iv === 'number' && VALID_INTERVALS.includes(iv as typeof VALID_INTERVALS[number]) ? iv : 100,
    aggregation: ag === 'none' || ag === '1m' || ag === '5m' || ag === '1h' ? ag : 'none' as AggregationLevel,
    performanceMonitorEnabled: typeof pm === 'boolean' ? pm : true,
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const s = getInitialSettings();

  const [datasetSize, setDatasetSizeState] = useState(s.datasetSize);
  const [stressTest, setStressTest] = useState(false);
  const [interval, setInterval_] = useState(s.interval);
  const [performanceMonitorEnabled, setPerformanceMonitorEnabled] = useState(s.performanceMonitorEnabled);
  const [filters, setFilters] = useState<FilterState>({
    metric: 'all',
    boundary: 'all',
    status: 'all',
    timeRange: null,
    search: '',
  });
  const [sort, setSortState] = useState<SortState>({ field: 'timestamp', direction: 'desc' });
  const [aggregation, setAggregation] = useState<AggregationLevel>(s.aggregation);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('pulseboard-alerts');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return [];
  });
  const [recentAlerts, setRecentAlerts] = useState<AlertEvent[]>([]);

  const stream = useDataStream({ datasetSize, interval, stressTest });
  const { filterData, aggregateDataWorker } = useDataWorker();

  const dataRef = useRef<DataPoint[]>([]);
  const filteredRef = useRef<DataPoint[]>([]);
  const aggregatedRef = useRef<AggregatedBucket[]>([]);
  const rafIdRef = useRef<number>(0);
  const pendingUpdateRef = useRef(false);
  const [streamUpdatesPerSec, setStreamUpdatesPerSec] = useState(0);

  const [displayData, setDisplayData] = useState<DataPoint[]>([]);
  const [displayFiltered, setDisplayFiltered] = useState<DataPoint[]>([]);
  const [displayAggregated, setDisplayAggregated] = useState<AggregatedBucket[]>([]);
  const [displayVersion, setDisplayVersion] = useState(0);

  const filtersRef = useRef(filters);
  const sortRef = useRef(sort);
  const aggregationRef = useRef(aggregation);

  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { sortRef.current = sort; }, [sort]);
  useEffect(() => { aggregationRef.current = aggregation; }, [aggregation]);

  useEffect(() => {
    let lastSecondTime = Date.now();
    let ticksInSecond = 0;
    let lastReportedUpdates = 0;

    const unsub = stream.subscribe((data) => {
      dataRef.current = data;
      ticksInSecond++;

      if (!pendingUpdateRef.current) {
        pendingUpdateRef.current = true;
        rafIdRef.current = requestAnimationFrame(() => {
          pendingUpdateRef.current = false;
          const f = filtersRef.current;
          const newFiltered = filterDataSync(dataRef.current, f);
          filteredRef.current = newFiltered;
          setDisplayData(dataRef.current);
          setDisplayFiltered(newFiltered);
          setDisplayVersion((v) => v + 1);
        });
      }
    });

    // Track updates per second independently
    const updateCheckInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastSecondTime;
      if (elapsed >= 1000) {
        const rate = Math.round((ticksInSecond * 1000) / elapsed);
        if (rate !== lastReportedUpdates) {
          setStreamUpdatesPerSec(rate);
          lastReportedUpdates = rate;
        }
        ticksInSecond = 0;
        lastSecondTime = now;
      }
    }, 100);

    return () => {
      unsub();
      cancelAnimationFrame(rafIdRef.current);
      clearInterval(updateCheckInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once on mount; stream is stable via useMemo in useDataStream
  }, []);

  const initDatasetRef = useRef(stream.initDataset);
  useEffect(() => { initDatasetRef.current = stream.initDataset; });

  useEffect(() => {
    initDatasetRef.current(datasetSize);
  }, [datasetSize]);

  const recomputeFilterAsync = useCallback(async () => {
    const data = dataRef.current;
    const f = filtersRef.current;
    const result = await filterData(data, f);
    filteredRef.current = result;
    setDisplayData(dataRef.current);
    setDisplayFiltered(result);
    setDisplayVersion((v) => v + 1);
  }, [filterData]);

  const recomputeAggregationAsync = useCallback(async () => {
    const data = dataRef.current;
    const level = aggregationRef.current;
    const result = await aggregateDataWorker(data, level);
    aggregatedRef.current = result;
    setDisplayAggregated(result);
    setDisplayVersion((v) => v + 1);
  }, [aggregateDataWorker]);

  useEffect(() => {
    recomputeFilterAsync();
  }, [filters, recomputeFilterAsync]);

  useEffect(() => {
    recomputeAggregationAsync();
  }, [aggregation, recomputeAggregationAsync]);

  useEffect(() => {
    if (alertRules.length === 0) return;
    const data = dataRef.current;
    if (data.length === 0) return;
    const latest = data[data.length - 1];
    if (!latest) return;

    for (const rule of alertRules) {
      if (!rule.enabled) continue;
      if (rule.metric !== latest.metric) continue;
      if (rule.boundary !== latest.boundary) continue;

      let triggered = false;
      switch (rule.operator) {
        case '>': triggered = latest.value > rule.threshold; break;
        case '<': triggered = latest.value < rule.threshold; break;
        case '>=': triggered = latest.value >= rule.threshold; break;
        case '<=': triggered = latest.value <= rule.threshold; break;
        case '==': triggered = latest.value === rule.threshold; break;
        case '!=': triggered = latest.value !== rule.threshold; break;
      }

      if (triggered) {
        setRecentAlerts((prev) => [
          {
            id: `alert-${Date.now()}-${rule.id}`,
            ruleId: rule.id,
            ruleName: rule.name,
            timestamp: Date.now(),
            value: latest.value,
            metric: latest.metric,
            boundary: latest.boundary,
          },
          ...prev.slice(0, 99),
        ]);
      }
    }
  }, [displayVersion, alertRules]);

  const sorted = useMemo(() => sortData(displayFiltered, sort.field, sort.direction), [displayFiltered, sort.field, sort.direction]);

  const setMetric = useCallback((m: Metric | 'all') => setFilters((f) => ({ ...f, metric: m })), []);
  const setBoundary = useCallback((b: Boundary | 'all') => setFilters((f) => ({ ...f, boundary: b })), []);
  const setStatus = useCallback((s: Status | 'all') => setFilters((f) => ({ ...f, status: s })), []);
  const setTimeRange = useCallback((r: { start: number; end: number } | null) => setFilters((f) => ({ ...f, timeRange: r })), []);
  const setSearch = useCallback((q: string) => setFilters((f) => ({ ...f, search: q })), []);
  const setSort = useCallback((field: SortState['field'], direction: SortState['direction']) => setSortState({ field, direction }), []);
  const setDatasetSize = useCallback((size: number) => {
    setDatasetSizeState(size);
  }, []);
  const setAgg = useCallback((a: AggregationLevel) => setAggregation(a), []);

  const setStreamInterval = useCallback((ms: number) => {
    setInterval_(ms);
  }, []);

  const setPerfMonitor = useCallback((v: boolean) => {
    setPerformanceMonitorEnabled(v);
  }, []);

  const addAlertRule = useCallback((rule: Omit<AlertRule, 'id' | 'createdAt'>) => {
    setAlertRules((prev) => {
      const next = [...prev, { ...rule, id: `rule-${Date.now()}`, createdAt: Date.now() }];
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('pulseboard-alerts', JSON.stringify(next)); } catch { /* ignore */ }
      }
      return next;
    });
  }, []);

  const updateAlertRule = useCallback((id: string, update: Partial<AlertRule>) => {
    setAlertRules((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...update } : r));
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('pulseboard-alerts', JSON.stringify(next)); } catch { /* ignore */ }
      }
      return next;
    });
  }, []);

  const deleteAlertRule = useCallback((id: string) => {
    setAlertRules((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('pulseboard-alerts', JSON.stringify(next)); } catch { /* ignore */ }
      }
      return next;
    });
  }, []);

  const toggleAlertRule = useCallback((id: string) => {
    setAlertRules((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('pulseboard-alerts', JSON.stringify(next)); } catch { /* ignore */ }
      }
      return next;
    });
  }, []);

  const clearAlerts = useCallback(() => setRecentAlerts([]), []);

  /* eslint-disable react-hooks/exhaustive-deps -- stream object changes every tick; omitting it prevents context re-creation */
  const value: DataContextValue = useMemo(() => ({
    data: displayData,
    filteredData: sorted,
    aggregatedData: displayAggregated,
    isRunning: stream.isRunning,
    totalReceived: stream.getTotalReceived(),
    streamUpdatesPerSec,
    config: { datasetSize, interval, stressTest },
    filters,
    sort,
    aggregation,
    alertRules,
    recentAlerts,
    performanceMonitorEnabled,
    setMetric,
    setBoundary,
    setStatus,
    setTimeRange,
    setSearch,
    setSort,
    setAggregation: setAgg,
    setDatasetSize,
    setStressTest,
    setInterval_: setStreamInterval,
    setPerformanceMonitorEnabled: setPerfMonitor,
    startStream: stream.start,
    pauseStream: stream.pause,
    resumeStream: stream.resume,
    stopStream: stream.stop,
    clearStream: stream.clear,
    addAlertRule,
    updateAlertRule,
    deleteAlertRule,
    toggleAlertRule,
    clearAlerts,
  }), [
    displayData, sorted, displayAggregated, stream.isRunning,
    streamUpdatesPerSec,
    datasetSize, interval, stressTest, filters, sort, aggregation,
    alertRules, recentAlerts, performanceMonitorEnabled,
    setMetric, setBoundary, setStatus, setTimeRange, setSearch, setSort,
    setAgg, setDatasetSize, setStressTest, setStreamInterval, setPerfMonitor,
    stream.start, stream.pause, stream.resume, stream.stop, stream.clear,
    addAlertRule, updateAlertRule, deleteAlertRule, toggleAlertRule, clearAlerts,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
