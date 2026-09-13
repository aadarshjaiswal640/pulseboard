import { DataPoint, FilterState, AggregationLevel, AggregatedBucket } from '../lib/types';
import { filterData, aggregateData, computeStats } from '../lib/performanceUtils';

interface WorkerMessage {
  type: 'filter' | 'aggregate' | 'stats';
  id: number;
  payload: {
    data: DataPoint[];
    filters?: FilterState;
    level?: AggregationLevel;
  };
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = e.data;

  switch (type) {
    case 'filter': {
      const { data, filters } = payload as { data: DataPoint[]; filters: FilterState };
      const result = filterData(data, filters);
      self.postMessage({ type: 'filterResult', id, payload: result });
      break;
    }
    case 'aggregate': {
      const { data, level } = payload as { data: DataPoint[]; level: AggregationLevel };
      const result = aggregateData(data, level);
      self.postMessage({ type: 'aggregateResult', id, payload: result });
      break;
    }
    case 'stats': {
      const { data } = payload as { data: DataPoint[] };
      const result = computeStats(data);
      self.postMessage({ type: 'statsResult', id, payload: result });
      break;
    }
    default:
      break;
  }
};
