/**
 * AkoeNet admin UI (proxied via Scheduler GET/POST /api/admin/akoenet/*).
 * Requires Scheduler backend: AKOENET_API_URL + AKOENET_ADMIN_BEARER (JWT from AkoeNet admin).
 */
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  getAkoenetHealthDeps,
  getAkoenetMetrics,
  getAkoenetAuditLogs,
  getAkoenetReports,
  patchAkoenetReport,
} from './akoenetApi';

function StatusBadge({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        ok ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
      }`}
    >
      {label ? `${label}: ` : ''}
      {ok ? 'OK' : 'ERR'}
    </span>
  );
}

export function AkoenetOverviewStrip() {
  const [deps, setDeps] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, m] = await Promise.all([
        getAkoenetHealthDeps(),
        getAkoenetMetrics(),
      ]);
      setDeps(d.status === 200 ? d.data : null);
      setMetrics(m.status === 200 ? m.data : null);
    } catch {
      setDeps(null);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="mb-6 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30">
        <p className="text-sm text-gray-600 dark:text-gray-400">AkoeNet…</p>
      </div>
    );
  }

  const ok = deps?.ok !== false && deps?.deps?.db?.ok !== false;
  const ch = metrics?.messages_total?.channel;
  const dm = metrics?.messages_total?.dm;

  return (
    <div className="mb-6 p-4 sm:p-5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-gray-800 dark:to-indigo-950/40">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">AkoeNet (community)</h3>
        <button
          type="button"
          onClick={load}
          className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Health</p>
          <StatusBadge ok={ok} label="Stack" />
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Msgs (total)</p>
          <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">
            ch {ch ?? '—'} · dm {dm ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Version</p>
          <p className="font-mono text-xs text-gray-800 dark:text-gray-200">{deps?.version || '—'}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Scheduler API</p>
          <p className="text-xs text-gray-700 dark:text-gray-300">
            {deps?.deps?.scheduler?.configured === false ? 'not set' : deps?.deps?.scheduler?.ok ? 'reachable' : 'issue'}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Full panels: use sidebar AkoeNet → Health / Metrics / Audit / Reports.
      </p>
    </div>
  );
}

export function AkoenetHealthSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAkoenetHealthDeps();
      if (res.status === 200) {
        setData(res.data);
      } else {
        toast.error(res.data?.message || res.data?.error || `HTTP ${res.status}`);
        setData(null);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'AkoeNet unreachable');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (!data) return <p className="text-red-600">Could not load AkoeNet dependencies.</p>;

  const d = data.deps || {};
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">AkoeNet health</h2>
        <button type="button" onClick={load} className="px-3 py-1 text-sm rounded bg-indigo-600 text-white">
          Retry
        </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Version {data.version} · Uptime {data.uptime_ms} ms · Check {data.total_latency_ms} ms
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {['api', 'db', 'redis', 'storage', 'scheduler'].map((k) => {
          const dep = d[k];
          const showOk =
            k === 'redis' && dep?.enabled === false ? null : dep?.ok;
          return (
            <div key={k} className="p-3 rounded border dark:border-gray-600 bg-white dark:bg-gray-800">
              <p className="font-medium capitalize text-gray-800 dark:text-gray-200">{k}</p>
              {k === 'redis' && dep?.enabled === false ? (
                <span className="text-xs text-gray-500">Not configured</span>
              ) : (
                <>
                  <StatusBadge ok={showOk} label="" />
                  <span className="ml-2 text-xs text-gray-500">
                    {dep?.latency_ms != null ? `${dep.latency_ms} ms` : ''}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
      {data.deps?.scheduler?.hint && (
        <p className="text-sm text-amber-700 dark:text-amber-300">{data.deps.scheduler.hint}</p>
      )}
    </div>
  );
}

export function AkoenetMetricsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAkoenetMetrics();
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (!data) return <p className="text-gray-500">No metrics (process may have restarted).</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">AkoeNet process metrics</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded border dark:border-gray-600">
          <p className="text-xs text-gray-500">Channel msgs (total)</p>
          <p className="text-2xl font-mono">{data.messages_total?.channel ?? 0}</p>
        </div>
        <div className="p-3 rounded border dark:border-gray-600">
          <p className="text-xs text-gray-500">DMs (total)</p>
          <p className="text-2xl font-mono">{data.messages_total?.dm ?? 0}</p>
        </div>
        <div className="p-3 rounded border dark:border-gray-600">
          <p className="text-xs text-gray-500">Last ~60s (ch / dm)</p>
          <p className="text-lg font-mono">
            {data.messages_last_60s?.channel ?? 0} / {data.messages_last_60s?.dm ?? 0}
          </p>
        </div>
        <div className="p-3 rounded border dark:border-gray-600">
          <p className="text-xs text-gray-500">Uptime (s)</p>
          <p className="text-lg font-mono">{Math.round((data.uptime_ms || 0) / 1000)}</p>
        </div>
      </div>
    </div>
  );
}

export function AkoenetAuditSection() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const [draftAction, setDraftAction] = useState('');
  const [draftServerId, setDraftServerId] = useState('');
  const [queryAction, setQueryAction] = useState('');
  const [queryServerId, setQueryServerId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAkoenetAuditLogs({
        limit,
        offset,
        ...(queryAction.trim() ? { action: queryAction.trim() } : {}),
        ...(queryServerId.trim() ? { server_id: queryServerId.trim() } : {}),
      });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [offset, queryAction, queryServerId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">AkoeNet audit logs</h2>
      <div className="flex flex-wrap gap-2">
        <input
          className="border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-600"
          placeholder="action"
          value={draftAction}
          onChange={(e) => setDraftAction(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1 text-sm w-28 dark:bg-gray-800 dark:border-gray-600"
          placeholder="server id"
          value={draftServerId}
          onChange={(e) => setDraftServerId(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            setQueryAction(draftAction);
            setQueryServerId(draftServerId);
            setOffset(0);
          }}
          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded"
        >
          Apply
        </button>
      </div>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((log) => (
            <li key={log.id} className="p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800">
              <span className="text-gray-500">{new Date(log.created_at).toLocaleString()}</span>{' '}
              <code className="text-indigo-600 dark:text-indigo-400">{log.action}</code> · {log.actor_username || log.actor_user_id}
            </li>
          ))}
          {!items.length && <li className="text-gray-500">No rows</li>}
        </ul>
      )}
      <div className="flex gap-2 items-center">
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - limit))}
          className="text-sm px-2 py-1 border rounded"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={offset + limit >= total}
          onClick={() => setOffset((o) => o + limit)}
          className="text-sm px-2 py-1 border rounded"
        >
          Next
        </button>
        <span className="text-xs text-gray-500">
          {total ? `${offset + 1}–${Math.min(offset + limit, total)} of ${total}` : ''}
        </span>
      </div>
    </div>
  );
}

export function AkoenetReportsSection() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAkoenetReports({ limit, offset, status });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [offset, status]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (auditId, st) => {
    const note = window.prompt('Optional moderator note');
    try {
      await patchAkoenetReport(auditId, { status: st, note: note || undefined });
      await load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Update failed');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">AkoeNet message reports</h2>
      <select
        className="border rounded px-2 py-1 text-sm dark:bg-gray-800"
        value={status}
        onChange={(e) => { setStatus(e.target.value); setOffset(0); }}
      >
        <option value="open">open</option>
        <option value="resolved">resolved</option>
        <option value="rejected">rejected</option>
        <option value="all">all</option>
      </select>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id} className="p-3 rounded border dark:border-gray-600 text-sm bg-white dark:bg-gray-800">
              <div>
                #{r.id} · {r.report_action === 'dm_message_report_user' ? 'DM' : 'Channel'} · msg {r.target_message_id}
              </div>
              <div className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{r.message_content || '—'}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="text-xs px-2 py-0.5 border rounded" onClick={() => update(r.id, 'resolved')}>
                  Resolve
                </button>
                <button type="button" className="text-xs px-2 py-0.5 border rounded" onClick={() => update(r.id, 'rejected')}>
                  Reject
                </button>
                <button type="button" className="text-xs px-2 py-0.5 border rounded" onClick={() => update(r.id, 'open')}>
                  Reopen
                </button>
              </div>
            </li>
          ))}
          {!items.length && <li className="text-gray-500">No reports</li>}
        </ul>
      )}
      <div className="flex gap-2 items-center">
        <button type="button" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - limit))} className="text-sm px-2 py-1 border rounded">
          Prev
        </button>
        <button
          type="button"
          disabled={offset + limit >= total}
          onClick={() => setOffset((o) => o + limit)}
          className="text-sm px-2 py-1 border rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function AkoenetAdminPanel({ section }) {
  switch (section) {
    case 'akoenet-health':
      return <AkoenetHealthSection />;
    case 'akoenet-metrics':
      return <AkoenetMetricsSection />;
    case 'akoenet-audit':
      return <AkoenetAuditSection />;
    case 'akoenet-reports':
      return <AkoenetReportsSection />;
    default:
      return null;
  }
}
