/**
 * Embeddable streamer schedule: iframe src="/embed/streamer/username"
 * Minimal layout for embedding in Discord panels, fan pages, etc.
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';
import { getPublicStreamerEvents } from '../api';
import { useLanguage } from '../contexts/LanguageContext';

function formatEventDate(scheduledFor) {
  if (!scheduledFor) return '—';
  const d = new Date(scheduledFor);
  return d.toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

function isLiveNow(scheduledFor, eventEndTime) {
  const now = new Date();
  const start = new Date(scheduledFor);
  const end = eventEndTime ? new Date(eventEndTime) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
  return now >= start && now <= end;
}

export default function PublicStreamEmbed() {
  const { username } = useParams();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      setError('Username required');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPublicStreamerEvents(username)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(err.response?.status === 404 ? 'Streamer not found' : (err.response?.data?.error || err.message));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-[120px] bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-4 rounded-lg">
        <p className="text-sm text-gray-500">{t('common.loading') || 'Loading…'}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[80px] bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-500">{error === 'Streamer not found' ? (t('publicStream.notFound') || 'Streamer not found') : error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[280px] max-w-[400px]">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{data.username}</span>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
        >
          {t('publicStream.poweredBy') || 'Powered by'} Streamer Scheduler
        </a>
      </div>
      <div className="p-3">
        {data.events.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('publicStream.noUpcoming') || 'No upcoming streams.'}</p>
        ) : (
          <ul className="space-y-2">
            {data.events.slice(0, 5).map((evt) => (
              <li key={evt.id} className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-900 dark:text-white truncate flex-1">{evt.title}</span>
                {isLiveNow(evt.scheduledFor, evt.eventEndTime) ? (
                  <span className="text-xs font-medium text-red-600 dark:text-red-400 flex-shrink-0">LIVE</span>
                ) : (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{formatEventDate(evt.scheduledFor)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
