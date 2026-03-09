/**
 * Public streamer page: tusitio.com/streamer/username
 * Shows upcoming streams, countdown, LIVE on Twitch, Notify me (email reminder). No auth.
 * Calendar style aligned with landing page (grid, event cards).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Radio, ExternalLink, Bell } from 'lucide-react';
import { Twitch, Twitter } from 'lucide-react';
import { getPublicStreamerEvents, subscribeStreamReminder } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import { getCountdown } from '../utils/dateUtils';
import { DEFAULT_PLATFORM_COLORS } from '../utils/platformColors';
import { DISCORD_ICON_URL } from '../constants/platforms';

/** End color for gradient (slightly darker) per platform */
const PLATFORM_GRADIENT_END = {
  twitch: '#6d28d9',
  discord: '#6d28d9',
  twitter: '#0c85d0',
  instagram: '#c13584',
  youtube: '#cc0000',
};
function getHeaderGradient(platformId) {
  const start = DEFAULT_PLATFORM_COLORS[platformId] || DEFAULT_PLATFORM_COLORS.twitch;
  const end = PLATFORM_GRADIENT_END[platformId] || PLATFORM_GRADIENT_END.twitch;
  return `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
}

function isLiveNow(scheduledFor, eventEndTime) {
  const now = new Date();
  const start = new Date(scheduledFor);
  const end = eventEndTime ? new Date(eventEndTime) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
  return now >= start && now <= end;
}

/** Next 7 days for calendar columns: { label, dateKey } */
function getNextSevenDays() {
  const days = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const todayKey = d.toISOString().slice(0, 10);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < 7; i++) {
    const key = d.toISOString().slice(0, 10);
    const dayName = dayNames[d.getDay()];
    const dayNum = d.getDate();
    let label = `${dayName} ${dayNum}`;
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    days.push({ label, dateKey: key, date: new Date(d.getTime()) });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function PlatformIcon({ platform, size = 14 }) {
  const style = { width: size, height: size };
  switch (platform) {
    case 'twitch':
      return <Twitch style={style} className="flex-shrink-0" />;
    case 'twitter':
      return <Twitter style={style} className="flex-shrink-0" />;
    case 'discord':
      return (
        <img
          src={DISCORD_ICON_URL}
          alt="Discord"
          style={{ width: size, height: size }}
          className="object-contain dark:invert flex-shrink-0"
        />
      );
    default:
      return null;
  }
}

/** Event card in landing-style grid: colored header, time, title, platform icons */
function PublicEventCard({ evt, isLive }) {
  const d = new Date(evt.scheduledFor);
  const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const platforms = Array.isArray(evt.platforms) ? evt.platforms : ['twitch'];
  const platformId = platforms[0] || 'twitch';
  return (
    <div className="flex flex-col h-full min-h-[100px] sm:min-h-[140px] bg-white dark:bg-gray-800 overflow-hidden rounded shadow-sm">
      <div
        className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 text-white text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-1.5 flex-shrink-0"
        style={{ background: getHeaderGradient(platformId) }}
      >
        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 opacity-90" />
        <span className="truncate">{timeStr}</span>
        {isLive && <Radio className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 opacity-90" />}
      </div>
      <div className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 flex-1 min-h-0">
        <p className="text-[10px] sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={evt.title}>
          {evt.title}
        </p>
        <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1.5 flex-wrap">
          {platforms.map((p) => {
            const start = DEFAULT_PLATFORM_COLORS[p] || '#6b7280';
            const end = PLATFORM_GRADIENT_END[p] || '#4b5563';
            return (
              <span
                key={p}
                className="inline-flex items-center justify-center w-4 h-4 sm:w-6 sm:h-6 rounded text-white flex-shrink-0 shadow-sm"
                style={{ background: `linear-gradient(145deg, ${start} 0%, ${end} 100%)` }}
                title={p}
              >
                <PlatformIcon platform={p} size={8} />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Calendar grid: 7 days (today + next 6), landing-style layout */
function PublicStreamCalendar({ events, isLiveNow }) {
  const sevenDays = useMemo(() => getNextSevenDays(), []);
  const eventsByDay = useMemo(() => {
    const map = {};
    sevenDays.forEach(({ dateKey }) => { map[dateKey] = []; });
    events.forEach((evt) => {
      const key = evt.scheduledFor ? new Date(evt.scheduledFor).toISOString().slice(0, 10) : null;
      if (key && map[key]) map[key].push(evt);
    });
    sevenDays.forEach(({ dateKey }) => {
      if (map[dateKey]) map[dateKey].sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
    });
    return map;
  }, [events, sevenDays]);

  return (
    <div className="w-full min-w-0 rounded-xl border border-gray-300 dark:border-gray-600 overflow-hidden shadow-md bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-600 dark:via-gray-700 dark:to-gray-600">
      <div className="overflow-x-auto overflow-y-hidden -mx-1 sm:mx-0 px-1 sm:px-0">
        <div className="inline-block min-w-[280px] sm:min-w-full rounded-xl overflow-hidden p-px">
          <div className="grid grid-cols-7 gap-px bg-gray-300/80 dark:bg-gray-600/80">
            {sevenDays.map(({ label, dateKey }) => (
              <div
                key={`h-${dateKey}`}
                className="min-w-[36px] sm:min-w-0 py-1.5 sm:py-2.5 md:py-3 text-center text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900"
              >
                {label}
              </div>
            ))}
            {sevenDays.map(({ dateKey }) => {
              const dayEvents = eventsByDay[dateKey] || [];
              const first = dayEvents[0];
              return (
                <div
                  key={dateKey}
                  className="min-w-[36px] sm:min-w-0 min-h-[120px] sm:min-h-[160px] md:min-h-[180px] p-0.5 sm:p-1.5 flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800/90 dark:to-gray-800"
                >
                  {first ? (
                    <PublicEventCard
                      evt={first}
                      isLive={isLiveNow(first.scheduledFor, first.eventEndTime)}
                    />
                  ) : (
                    <div
                      className="h-full min-h-[100px] sm:min-h-[140px] rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700"
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicStreamPage() {
  const { username } = useParams();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [remindOpen, setRemindOpen] = useState(false);
  const [remindEmail, setRemindEmail] = useState('');
  const [remindSubmitting, setRemindSubmitting] = useState(false);
  const [remindDone, setRemindDone] = useState(false);
  const [remindError, setRemindError] = useState(null);

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
      <div className="min-h-screen bg-gradient-accent dark:bg-gray-900 flex items-center justify-center p-4">
        <p className="text-gray-500 dark:text-gray-400">{t('common.loading') || 'Loading…'}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-accent dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error === 'Streamer not found' ? (t('publicStream.notFound') || 'Streamer not found') : error}</p>
          <Link to="/" className="text-[var(--accent)] hover:underline">{t('publicStream.backHome') || 'Back to home'}</Link>
        </div>
      </div>
    );
  }

  const firstEvent = data.events && data.events[0];
  const showLiveSchedule = firstEvent && isLiveNow(firstEvent.scheduledFor, firstEvent.eventEndTime);
  const showLiveTwitch = data.liveOnTwitch && data.twitchStreamUrl;

  const handleRemindSubmit = (e) => {
    e.preventDefault();
    const email = remindEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRemindError('Please enter a valid email.');
      return;
    }
    setRemindError(null);
    setRemindSubmitting(true);
    subscribeStreamReminder(username, email)
      .then(() => {
        setRemindDone(true);
        setRemindEmail('');
      })
      .catch((err) => {
        setRemindError(err.response?.data?.error || err.message || 'Could not subscribe.');
      })
      .finally(() => setRemindSubmitting(false));
  };

  const bannerUrl = data.publicPageBannerUrl || null;
  const bannerPosition = data.publicPageBannerPosition || 'top';
  const renderBanner = (at) => {
    if (!bannerUrl || bannerPosition !== at) return null;
    if (bannerPosition === 'background') return null;
    return (
      <div className="w-full rounded-xl overflow-hidden mb-6 -mx-4 sm:mx-0 shadow-md">
        <img src={bannerUrl} alt="" className="w-full h-24 sm:h-32 object-cover object-center" onError={(e) => { e.target.style.display = 'none'; }} />
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gradient-accent dark:bg-gray-900 ${bannerUrl && bannerPosition === 'background' ? 'relative' : ''}`}>
      {bannerUrl && bannerPosition === 'background' && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img src={bannerUrl} alt="" className="w-full h-full object-cover object-center opacity-60" />
          <div className="absolute inset-0 bg-white/40 dark:bg-gray-900/50" />
        </div>
      )}
      <div className={`max-w-xl mx-auto px-4 py-8 sm:py-12 ${bannerUrl && bannerPosition === 'background' ? 'relative z-10' : ''}`}>
        {renderBanner('top')}
        <div className="flex items-center gap-4 mb-8">
          {data.profileImageUrl ? (
            <img src={data.profileImageUrl} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-[var(--accent)]/30" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-accent-subtle flex items-center justify-center text-[var(--accent)] text-2xl font-bold">
              {(data.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{data.username}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('publicStream.upcomingStreams') || 'Upcoming streams'}</p>
          </div>
        </div>
        {renderBanner('above-avatar')}

        {(showLiveTwitch || showLiveSchedule) && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 flex flex-wrap items-center gap-3 bg-gradient-to-r from-red-500/15 via-red-500/10 to-rose-500/15 dark:from-red-500/20 dark:via-red-500/15 dark:to-rose-500/20">
            <span className="flex h-3 w-3 rounded-full bg-red-500 animate-pulse" aria-hidden />
            <span className="font-semibold text-red-700 dark:text-red-300">{t('publicStream.liveNow') || 'LIVE NOW'}</span>
            {showLiveTwitch ? (
              <a
                href={data.twitchStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                {t('publicStream.liveOnTwitch') || 'on Twitch'} →
              </a>
            ) : (
              <span className="text-sm text-gray-600 dark:text-gray-400">{firstEvent?.title}</span>
            )}
            {data.twitchStreamTitle && showLiveTwitch && (
              <span className="w-full text-sm text-gray-600 dark:text-gray-400 truncate" title={data.twitchStreamTitle}>
                {data.twitchStreamTitle}
              </span>
            )}
          </div>
        )}

        {!showLiveTwitch && !showLiveSchedule && firstEvent && countdown && (
          <div className="mb-6 p-4 rounded-xl border border-accent-light bg-accent-subtle">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('publicStream.nextStream') || 'Next stream'}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{firstEvent.title}</p>
            <p className="text-sm text-[var(--accent)] mt-2">
              {t('publicStream.countdown') || 'In'} {countdown.hours}h {countdown.minutes}m
            </p>
          </div>
        )}
        {renderBanner('above-schedule')}
        {bannerPosition === 'center' && renderBanner('center')}

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('publicStream.schedule') || 'Schedule'}
          </h2>
          {data.events.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">{t('publicStream.noUpcoming') || 'No upcoming streams.'}</p>
          ) : (
            <PublicStreamCalendar events={data.events} isLiveNow={isLiveNow} />
          )}
        </section>

        <div className="mb-6">
          <button
            type="button"
            onClick={() => { setRemindOpen(true); setRemindDone(false); setRemindError(null); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <Bell className="w-4 h-4" />
            {t('publicStream.notifyMe') || 'Notify me'}
          </button>
        </div>
        {renderBanner('bottom')}

        {remindOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !remindSubmitting && setRemindOpen(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('publicStream.remindTitle') || 'Get a reminder'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('publicStream.remindDescription') || "We'll email you before the next stream."}</p>
              {remindDone ? (
                <p className="text-sm text-green-600 dark:text-green-400 mb-4">{t('publicStream.remindSuccess') || "You're subscribed! We'll notify you before the next stream."}</p>
              ) : (
                <form onSubmit={handleRemindSubmit}>
                  <input
                    type="email"
                    value={remindEmail}
                    onChange={(e) => setRemindEmail(e.target.value)}
                    placeholder={t('publicStream.emailPlaceholder') || 'your@email.com'}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent mb-2"
                    disabled={remindSubmitting}
                    autoFocus
                  />
                  {remindError && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{remindError}</p>}
                  <div className="flex gap-2 justify-end mt-2">
                    <button type="button" onClick={() => setRemindOpen(false)} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" disabled={remindSubmitting}>
                      {t('common.cancel') || 'Cancel'}
                    </button>
                    <button type="submit" disabled={remindSubmitting} className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                      {remindSubmitting ? (t('common.loading') || 'Loading…') : (t('publicStream.subscribe') || 'Subscribe')}
                    </button>
                  </div>
                </form>
              )}
              <button type="button" onClick={() => setRemindOpen(false)} className="mt-2 text-sm text-[var(--accent)] hover:underline">
                {remindDone ? (t('common.close') || 'Close') : (t('common.cancel') || 'Cancel')}
              </button>
            </div>
          </div>
        )}

        <footer className="mt-8 pt-6 pb-2 border-t border-accent-light dark:border-gray-700 text-center bg-accent-subtle dark:bg-gray-900/50 rounded-lg px-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            {t('publicStream.poweredBy') || 'Powered by'} <span className="font-medium text-gray-700 dark:text-gray-300">Streamer Scheduler</span>
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            {t('publicStream.createYourOwn') || 'Create your own schedule'}
            <ExternalLink className="w-4 h-4" />
          </Link>
        </footer>
      </div>
    </div>
  );
}
