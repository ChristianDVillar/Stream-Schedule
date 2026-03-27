/**
 * Embeddable streamer schedule: iframe src="/embed/streamer/username"
 * Minimal layout for embedding in Discord panels, fan pages, etc.
 * Shows LIVE on Twitch, countdown to next stream, and schedule.
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Radio, Twitch, Youtube, Instagram, Server } from 'lucide-react';
import { getPublicStreamerEvents } from '../features/publicStream/api';
import { useLanguage } from '../contexts/LanguageContext';
import { formatEventDate, getCountdown } from '../utils/dateUtils';
import { DISCORD_ICON_URL } from '../constants/platforms';
import XIcon from '../components/XIcon';

function isLiveNow(scheduledFor, eventEndTime) {
  const now = new Date();
  const start = new Date(scheduledFor);
  const end = eventEndTime ? new Date(eventEndTime) : new Date(start.getTime() + 3 * 60 * 60 * 1000);
  return now >= start && now <= end;
}

function PlatformIcon({ platform, size = 12 }) {
  const style = { width: size, height: size };
  switch (platform) {
    case 'twitch':
      return <Twitch style={style} className="flex-shrink-0" />;
    case 'twitter':
      return <XIcon style={style} className="flex-shrink-0" />;
    case 'youtube':
      return <Youtube style={style} className="flex-shrink-0" />;
    case 'instagram':
      return <Instagram style={style} className="flex-shrink-0" />;
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
      return <Server style={style} className="flex-shrink-0" />;
  }
}

export default function PublicStreamEmbed() {
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
    const live = data.liveOnTwitch || isLiveNow(first.scheduledFor, first.eventEndTime);
    const update = () => {
      if (live) setCountdown({ live: true });
      else setCountdown(getCountdown(first.scheduledFor));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [data?.events, data?.liveOnTwitch]);

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

  const firstEvent = data.events?.[0];
  const showLive = data.liveOnTwitch || (firstEvent && isLiveNow(firstEvent.scheduledFor, firstEvent.eventEndTime));

  const bannerUrl = data.publicPageBannerUrl || null;
  const bannerPosition = data.publicPageBannerPosition || 'top';
  const showBannerInEmbed = bannerUrl && (bannerPosition === 'top' || bannerPosition === 'above-avatar');
  const showBgInEmbed = bannerUrl && bannerPosition === 'background';

  return (
    <div
      className={`rounded-lg overflow-hidden min-w-[280px] max-w-[400px] border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-b from-violet-50 via-white to-fuchsia-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 ${showBgInEmbed ? 'relative' : ''}`}
      role="region"
      aria-label={data?.username ? `${data.username} stream schedule` : 'Stream schedule embed'}
    >
      {showBgInEmbed && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img src={bannerUrl} alt="" className="w-full h-full object-cover object-center opacity-55" />
          <div className="absolute inset-0 bg-white/35 dark:bg-gray-900/45" />
        </div>
      )}
      {showBannerInEmbed && (
        <div className="w-full h-12 overflow-hidden flex-shrink-0">
          <img src={bannerUrl} alt="" className="w-full h-full object-cover object-center" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}
      <div className={`px-3 py-2 border-b border-accent-light dark:border-gray-700 flex items-center justify-between bg-accent-subtle dark:bg-gray-800 ${showBgInEmbed ? 'relative z-10' : ''}`}>
        <span className="font-semibold text-gray-900 dark:text-white text-sm truncate" id="embed-streamer-name">{data.username}</span>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
        >
          {t('publicStream.poweredBy') || 'Powered by'} Streamer Scheduler
        </a>
      </div>
      {(showLive || (countdown && !countdown.live && firstEvent)) && (
        <div className={showBgInEmbed ? 'relative z-10' : ''}>
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 text-xs">
          {showLive ? (
            <>
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
              <span className="font-medium text-red-600 dark:text-red-400">{t('publicStream.liveNow') || 'LIVE'}</span>
              {data.twitchStreamUrl && (
                <a href={data.twitchStreamUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline truncate">
                  {t('publicStream.liveOnTwitch') || 'on Twitch'} →
                </a>
              )}
            </>
          ) : (
            countdown && (
              <>
                <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">
                  {t('publicStream.nextStream') || 'Next'}: {countdown.hours}h {countdown.minutes}m
                </span>
              </>
            )
          )}
          </div>
        </div>
      )}
      <div className={`p-3 ${showBgInEmbed ? 'relative z-10' : ''}`}>
        {Array.isArray(data.socialLinks) && data.socialLinks.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
              {t('publicStream.socialLinks') || 'Social links'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.socialLinks.slice(0, 5).map((social) => (
                <a
                  key={`${social.platform}-${social.url}`}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-700/80 text-[11px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={social.label}
                >
                  <PlatformIcon platform={social.platform} size={11} />
                  <span>{social.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}
        {data.events.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('publicStream.noUpcoming') || 'No upcoming streams.'}</p>
        ) : (
          <ul className="space-y-2" aria-labelledby="embed-streamer-name">
            {data.events.slice(0, 5).map((evt) => (
              <li key={evt.id} className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-900 dark:text-white truncate flex-1">{evt.title}</span>
                {(data.liveOnTwitch && data.events[0]?.id === evt.id) || isLiveNow(evt.scheduledFor, evt.eventEndTime) ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 flex-shrink-0"><Radio className="w-3 h-3" /> LIVE</span>
                ) : (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{formatEventDate(evt.scheduledFor, { short: true })}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
