/**
 * Public streamer page: tusitio.com/streamer/username
 * Shows upcoming streams, countdown, optional LIVE indicator. No auth.
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, Radio, ExternalLink } from 'lucide-react';
import { getPublicStreamerEvents } from '../api';
import { useLanguage } from '../contexts/LanguageContext';

function formatEventDate(scheduledFor) {
  if (!scheduledFor) return '—';
  const d = new Date(scheduledFor);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getCountdown(toDate) {
  if (!toDate) return null;
  const now = new Date();
  const to = new Date(toDate);
  if (to <= now) return { live: true };
  const ms = to - now;
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return { live: false, hours: h, minutes: m };
}

function isLiveNow(scheduledFor, eventEndTime) {
  const now = new Date();
  const start = new Date(scheduledFor);
  const end = eventEndTime ? new Date(eventEndTime) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
  return now >= start && now <= end;
}

export default function PublicStreamPage() {
  const { username } = useParams();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(null);

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

  useEffect(() => {
    if (!data?.events?.length) {
      setCountdown(null);
      return;
    }
    const first = data.events[0];
    const live = isLiveNow(first.scheduledFor, first.eventEndTime);
    const update = () => {
      if (live) setCountdown({ live: true });
      else setCountdown(getCountdown(first.scheduledFor));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [data?.events]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <p className="text-gray-500 dark:text-gray-400">{t('common.loading') || 'Loading…'}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error === 'Streamer not found' ? (t('publicStream.notFound') || 'Streamer not found') : error}</p>
          <Link to="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">{t('publicStream.backHome') || 'Back to home'}</Link>
        </div>
      </div>
    );
  }

  const firstEvent = data.events && data.events[0];
  const showLive = firstEvent && isLiveNow(firstEvent.scheduledFor, firstEvent.eventEndTime);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center gap-4 mb-8">
          {data.profileImageUrl ? (
            <img src={data.profileImageUrl} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500/30" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl font-bold">
              {(data.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{data.username}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('publicStream.upcomingStreams') || 'Upcoming streams'}</p>
          </div>
        </div>

        {showLive && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-red-500 animate-pulse" aria-hidden />
            <span className="font-semibold text-red-700 dark:text-red-300">{t('publicStream.liveNow') || 'LIVE NOW'}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{firstEvent?.title}</span>
          </div>
        )}

        {!showLive && firstEvent && countdown && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('publicStream.nextStream') || 'Next stream'}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{firstEvent.title}</p>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-2">
              {t('publicStream.countdown') || 'In'} {countdown.hours}h {countdown.minutes}m
            </p>
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('publicStream.schedule') || 'Schedule'}
          </h2>
          {data.events.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">{t('publicStream.noUpcoming') || 'No upcoming streams.'}</p>
          ) : (
            <ul className="space-y-3">
              {data.events.map((evt) => (
                <li
                  key={evt.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{evt.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatEventDate(evt.scheduledFor)}</p>
                  </div>
                  {isLiveNow(evt.scheduledFor, evt.eventEndTime) && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                      <Radio className="w-3.5 h-3.5" /> LIVE
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {t('publicStream.notifyMe') || 'Reminders (Discord / email) coming soon.'}
        </p>

        <footer className="pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t('publicStream.poweredBy') || 'Powered by'} <span className="font-medium text-gray-700 dark:text-gray-300">Streamer Scheduler</span>
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t('publicStream.createYourOwn') || 'Create your own schedule'}
            <ExternalLink className="w-4 h-4" />
          </Link>
        </footer>
      </div>
    </div>
  );
}
