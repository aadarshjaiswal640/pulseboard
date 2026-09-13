'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { DataPoint, FilterState, AggregationLevel, AggregatedBucket } from '../lib/types';
import { filterData, aggregateData } from '../lib/performanceUtils';

interface WorkerRequest {
  type: 'filter' | 'aggregate';
  id: number;
  payload: unknown;
}

interface FilterRequest {
  data: DataPoint[];
  filters: FilterState;
}

interface AggregateRequest {
  data: DataPoint[];
  level: AggregationLevel;
}

interface FilterResultMessage {
  type: 'filterResult';
  id: number;
  payload: DataPoint[];
}

interface AggregateResultMessage {
  type: 'aggregateResult';
  id: number;
  payload: AggregatedBucket[];
}

type WorkerResponse = FilterResultMessage | AggregateResultMessage;

// Timeout for worker operations. If worker doesn't respond within this time,
// fall back to synchronous processing on the main thread.
const WORKER_TIMEOUT_MS = 200;

export function useDataWorker() {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingRef = useRef<Map<number, { resolve: (v: unknown) => void; timer: ReturnType<typeof setTimeout> }>>(new Map());

  useEffect(() => {
    if (typeof Worker === 'undefined') return;

    let worker: Worker;
    try {
      worker = new Worker(
        new URL('../workers/dataProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch {
      return;
    }

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const pending = pendingRef.current.get(e.data.id);
      if (pending) {
        clearTimeout(pending.timer);
        pending.resolve(e.data.payload);
        pendingRef.current.delete(e.data.id);
      }
    };

    worker.onerror = () => {
      for (const [id, pending] of pendingRef.current) {
        clearTimeout(pending.timer);
        pending.resolve(null);
        pendingRef.current.delete(id);
      }
    };

    workerRef.current = worker;

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const pending = pendingRef.current;
      for (const [, entry] of pending) {
        clearTimeout(entry.timer);
      }
      pending.clear();
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const postToWorker = useCallback(<T,>(
    type: WorkerRequest['type'],
    payload: unknown,
    fallback: () => T
  ): Promise<T> => {
    return new Promise((resolve) => {
      const worker = workerRef.current;
      if (!worker) {
        resolve(fallback());
        return;
      }

      const id = ++requestIdRef.current;
      const timer = setTimeout(() => {
        pendingRef.current.delete(id);
        resolve(fallback());
      }, WORKER_TIMEOUT_MS);

      pendingRef.current.set(id, { resolve: resolve as (v: unknown) => void, timer });
      worker.postMessage({ type, id, payload } satisfies WorkerRequest);
    });
  }, []);

  const filterDataAsync = useCallback(
    (data: DataPoint[], filters: FilterState): Promise<DataPoint[]> => {
      return postToWorker<DataPoint[]>(
        'filter',
        { data, filters },
        () => filterData(data, filters)
      );
    },
    [postToWorker]
  );

  const aggregateDataWorker = useCallback(
    (data: DataPoint[], level: AggregationLevel): Promise<AggregatedBucket[]> => {
      return postToWorker<AggregatedBucket[]>(
        'aggregate',
        { data, level },
        () => aggregateData(data, level)
      );
    },
    [postToWorker]
  );

  return { filterData: filterDataAsync, aggregateDataWorker };
}
