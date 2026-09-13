'use client';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { DataPoint, Metric, Boundary, Status, StreamConfig, METRIC_RANGES } from '../lib/types';
import { generateDataset, createRng } from '../lib/dataGenerator';

// Ring buffer size: keeps the 120k most recent points to limit memory growth
// while supporting 10k-100k dataset sizes with 100ms update intervals indefinitely
const BUFFER_MAX = 120000;

export function useDataStream(config: StreamConfig) {
  const bufferRef = useRef<DataPoint[]>([]);
  const rngRef = useRef<() => number>(() => 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);
  const runningRef = useRef(false);
  const [isRunning, setIsRunning] = useState(false);
  const totalReceivedRef = useRef(0);
  const listenersRef = useRef<Set<(data: DataPoint[]) => void>>(new Set());

  const notifyListeners = useCallback(() => {
    const data = bufferRef.current;
    for (const listener of listenersRef.current) {
      listener(data);
    }
  }, []);

  const initDataset = useCallback((size: number) => {
    bufferRef.current = generateDataset(size, 42);
    indexRef.current = size;
    rngRef.current = createRng(Date.now());
    totalReceivedRef.current = bufferRef.current.length;
    notifyListeners();
  }, [notifyListeners]);

  const addPoint = useCallback(() => {
    const now = Date.now();
    const metric: Metric = (['throughput', 'latency', 'errors', 'requests'] as Metric[])[
      Math.floor(rngRef.current() * 4)
    ];
    const boundary: Boundary = (['Core', 'Edge', 'Batch', 'Stream'] as Boundary[])[
      Math.floor(rngRef.current() * 4)
    ];
    const range = METRIC_RANGES[metric];
    const timeFactor = now / 1000;
    const periodic = Math.sin(timeFactor * 0.001 * 2) * range.variance * 0.3;
    const noise = (rngRef.current() - 0.5) * range.variance * 0.6;
    const spike = rngRef.current() < 0.02 ? range.variance * 1.5 : 0;
    const value = Math.max(range.min, Math.min(range.max, range.baseline + periodic + noise + spike));

    let status: Status = 'normal';
    const ratio = (value - range.min) / (range.max - range.min);
    if (ratio > 0.85) status = 'critical';
    else if (ratio > 0.65) status = 'warning';

    const point: DataPoint = {
      id: `dp-${indexRef.current}-${now}`,
      timestamp: now,
      metric,
      boundary,
      value: Math.round(value * 100) / 100,
      status,
    };

    bufferRef.current.push(point);
    if (bufferRef.current.length > BUFFER_MAX) {
      bufferRef.current = bufferRef.current.slice(bufferRef.current.length - BUFFER_MAX);
    }
    indexRef.current++;
    totalReceivedRef.current++;
    notifyListeners();
  }, [notifyListeners]);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true);
    intervalRef.current = setInterval(addPoint, config.interval);
  }, [addPoint, config.interval]);

  const pause = useCallback(() => {
    runningRef.current = false;
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true);
    intervalRef.current = setInterval(addPoint, config.interval);
  }, [addPoint, config.interval]);

  const stop = useCallback(() => {
    pause();
    bufferRef.current = [];
    indexRef.current = 0;
    totalReceivedRef.current = 0;
    notifyListeners();
  }, [pause, notifyListeners]);

  const clear = useCallback(() => {
    bufferRef.current = [];
    indexRef.current = 0;
    totalReceivedRef.current = 0;
    notifyListeners();
  }, [notifyListeners]);

  const getData = useCallback(() => bufferRef.current, []);

  const getTotalReceived = useCallback(() => totalReceivedRef.current, []);

  const subscribe = useCallback((listener: (data: DataPoint[]) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return useMemo(() => ({
    isRunning,
    getTotalReceived,
    start,
    pause,
    resume,
    stop,
    clear,
    getData,
    subscribe,
    initDataset,
    bufferRef,
  }), [isRunning, start, pause, resume, stop, clear, getData, subscribe, initDataset, getTotalReceived]);
}
