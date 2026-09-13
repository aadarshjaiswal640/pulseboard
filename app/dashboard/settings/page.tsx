'use client';

import React, { useState, useCallback } from 'react';
import { useData } from '../../../components/providers/DataProvider';
import { AggregationLevel } from '../../../lib/types';

interface Settings {
  defaultDatasetSize: number;
  defaultAggregation: AggregationLevel;
  defaultTimeRange: string;
  streamInterval: number;
  performanceMonitorEnabled: boolean;
  animationsEnabled: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  defaultDatasetSize: 10000,
  defaultAggregation: 'none',
  defaultTimeRange: 'all',
  streamInterval: 100,
  performanceMonitorEnabled: true,
  animationsEnabled: true,
};

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem('pulseboard-settings');
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: Settings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('pulseboard-settings', JSON.stringify(settings));
  } catch { /* ignore */ }
}

export default function SettingsPage() {
  const {
    setDatasetSize, setAggregation, setInterval_, setPerformanceMonitorEnabled,
    config,
  } = useData();
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    saveSettings(settings);
    setDatasetSize(settings.defaultDatasetSize);
    setAggregation(settings.defaultAggregation);
    setInterval_(settings.streamInterval);
    setPerformanceMonitorEnabled(settings.performanceMonitorEnabled);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings, setDatasetSize, setAggregation, setInterval_, setPerformanceMonitorEnabled]);

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setDatasetSize(DEFAULT_SETTINGS.defaultDatasetSize);
    setAggregation(DEFAULT_SETTINGS.defaultAggregation);
    setInterval_(DEFAULT_SETTINGS.streamInterval);
    setPerformanceMonitorEnabled(DEFAULT_SETTINGS.performanceMonitorEnabled);
  }, [setDatasetSize, setAggregation, setInterval_, setPerformanceMonitorEnabled]);

  const handleClearData = useCallback(() => {
    try {
      localStorage.removeItem('pulseboard-alerts');
      localStorage.removeItem('pulseboard-settings');
    } catch { /* ignore */ }
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[800px] mx-auto">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure dashboard behavior and preferences.</p>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">General</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Default Dataset Size</label>
            <select
              value={settings.defaultDatasetSize}
              onChange={(e) => setSettings((s) => ({ ...s, defaultDatasetSize: Number(e.target.value) }))}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5"
            >
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
              <option value={10000}>10,000</option>
              <option value={50000}>50,000</option>
              <option value={100000}>100,000</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Default Aggregation</label>
            <select
              value={settings.defaultAggregation}
              onChange={(e) => setSettings((s) => ({ ...s, defaultAggregation: e.target.value as AggregationLevel }))}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5"
            >
              <option value="none">None</option>
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="1h">1 Hour</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Stream Interval (ms)</label>
            <select
              value={settings.streamInterval}
              onChange={(e) => setSettings((s) => ({ ...s, streamInterval: Number(e.target.value) }))}
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5"
            >
              <option value={50}>50ms</option>
              <option value={100}>100ms</option>
              <option value={200}>200ms</option>
              <option value={500}>500ms</option>
              <option value={1000}>1000ms</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-400">
          Current stream interval: {config.interval}ms
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Performance</h2>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.performanceMonitorEnabled}
              onChange={(e) => setSettings((s) => ({ ...s, performanceMonitorEnabled: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div>
              <p className="text-sm text-gray-700">Performance Monitor</p>
              <p className="text-xs text-gray-400">Show FPS, memory, and processing metrics</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.animationsEnabled}
              onChange={(e) => setSettings((s) => ({ ...s, animationsEnabled: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div>
              <p className="text-sm text-gray-700">Animations</p>
              <p className="text-xs text-gray-400">Enable CSS and chart animations</p>
            </div>
          </label>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Data</h2>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleClearData}
            className="text-xs px-3 py-1.5 rounded-md font-medium bg-red-50 text-red-600 hover:bg-red-100"
          >
            Clear Local Data
          </button>
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1.5 rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Reset Settings
          </button>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="text-xs px-4 py-2 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          Save Settings
        </button>
        {saved && (
          <span className="text-xs text-emerald-600 font-medium">Saved!</span>
        )}
      </div>
    </div>
  );
}
