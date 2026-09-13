'use client';

import React, { useState, useCallback } from 'react';
import { useData } from '../../../components/providers/DataProvider';
import { Metric, Boundary, AlertRule } from '../../../lib/types';
import { METRICS, BOUNDARIES } from '../../../lib/types';

const OPERATORS = ['>', '<', '>=', '<=', '==', '!='] as const;

export default function AlertRulesPage() {
  const { alertRules, recentAlerts, addAlertRule, updateAlertRule, deleteAlertRule, toggleAlertRule, clearAlerts } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    metric: 'throughput' as Metric,
    boundary: 'Core' as Boundary,
    operator: '>' as AlertRule['operator'],
    threshold: 500,
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) {
      updateAlertRule(editingId, form);
      setEditingId(null);
    } else {
      addAlertRule({ ...form, enabled: true });
    }
    setForm({ name: '', metric: 'throughput', boundary: 'Core', operator: '>', threshold: 500 });
    setShowForm(false);
  }, [form, editingId, addAlertRule, updateAlertRule]);

  const handleEdit = useCallback((rule: AlertRule) => {
    setForm({ name: rule.name, metric: rule.metric, boundary: rule.boundary, operator: rule.operator, threshold: rule.threshold });
    setEditingId(rule.id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirmDelete === id) {
      deleteAlertRule(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  }, [confirmDelete, deleteAlertRule]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Alert Rules</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure threshold-based alerts for incoming stream data.</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: '', metric: 'throughput', boundary: 'Core', operator: '>', threshold: 500 }); }}
          className="text-xs px-3 py-1.5 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Rule'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">{editingId ? 'Edit Rule' : 'Create Alert Rule'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Rule Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., High throughput"
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Metric</label>
              <select
                value={form.metric}
                onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value as Metric }))}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Boundary</label>
              <select
                value={form.boundary}
                onChange={(e) => setForm((f) => ({ ...f, boundary: e.target.value as Boundary }))}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {BOUNDARIES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Operator</label>
              <select
                value={form.operator}
                onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value as AlertRule['operator'] }))}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Threshold</label>
              <input
                type="number"
                value={form.threshold}
                onChange={(e) => setForm((f) => ({ ...f, threshold: Number(e.target.value) }))}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="text-xs px-4 py-1.5 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            {editingId ? 'Update Rule' : 'Create Rule'}
          </button>
        </form>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Active Rules ({alertRules.length})</h2>
        {alertRules.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
            No alert rules configured. Create one to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {alertRules.map((rule) => (
              <div key={rule.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => toggleAlertRule(rule.id)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${rule.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${rule.enabled ? 'left-4' : 'left-0.5'}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{rule.name}</p>
                  <p className="text-xs text-gray-500">
                    {rule.metric} {rule.operator} {rule.threshold} ({rule.boundary})
                  </p>
                </div>
                <button onClick={() => handleEdit(rule)} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1">
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className={`text-xs px-2 py-1 rounded ${confirmDelete === rule.id ? 'bg-red-500 text-white' : 'text-red-600 hover:text-red-800'}`}
                >
                  {confirmDelete === rule.id ? 'Confirm' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">Recent Alerts ({recentAlerts.length})</h2>
          {recentAlerts.length > 0 && (
            <button onClick={clearAlerts} className="text-xs text-gray-400 hover:text-gray-600">
              Clear all
            </button>
          )}
        </div>
        {recentAlerts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
            No alerts triggered yet.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="px-4 py-3 flex items-center gap-3">
                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{alert.ruleName}</p>
                  <p className="text-xs text-gray-500">
                    {alert.metric} = {alert.value.toFixed(2)} ({alert.boundary})
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-mono flex-shrink-0">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
