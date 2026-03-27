/**
 * Stream Timeline — events logged via POST /webhooks/timeline (stream_start, donation, clip, etc.).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getTimeline } from '../features/content/api';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { Clock, RefreshCw, Radio, Gift, Film, MessageSquare } from 'lucide-react';

function formatTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function typeIcon(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('stream') || t.includes('start')) return <Radio className="w-4 h-4 text-red-500" />;
  if (t.includes('donation') || t.includes('gift')) return <Gift className="w-4 h-4 text-amber-500" />;
  if (t.includes('clip')) return <Film className="w-4 h-4 text-purple-500" />;
  return <MessageSquare className="w-4 h-4 text-gray-500" />;
}

export default function StreamTimelinePage({ token }) {
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await getTimeline(hours);
      setEvents(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load timeline');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [token, hours]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Clock className="w-8 h-8 text-accent" />
          {t('timeline.title') || 'Stream timeline'}
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-2 py-1.5"
          >
            <option value={6}>Last 6h</option>
            <option value={12}>Last 12h</option>
            <option value={24}>Last 24h</option>
            <option value={168}>Last 7 days</option>
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            title={t('common.refresh') || 'Refresh'}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('timeline.hint') || 'Events from Streamer.bot / Mix It Up via POST /api/webhooks/timeline. Use type: stream_start, donation, clip, etc.'}
      </p>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">{t('common.loading') || 'Loading…'}</p>
      ) : events.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{t('timeline.empty') || 'No timeline events yet. Call POST /webhooks/timeline from your bot to log moments.'}</p>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <span className="flex-shrink-0 mt-0.5">{typeIcon(ev.type)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{ev.type?.replace(/_/g, ' ') || 'Event'}</p>
                {ev.payload && typeof ev.payload === 'object' && Object.keys(ev.payload).length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{JSON.stringify(ev.payload)}</p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatTime(ev.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
