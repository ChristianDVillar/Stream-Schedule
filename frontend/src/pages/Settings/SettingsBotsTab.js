/**
 * Bots integration: Nightbot, Streamer.bot, Mix It Up, StreamElements.
 * Streamer-friendly layout: quick setup, command table, copy-paste ready docs.
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, Copy, RefreshCw, Check, ExternalLink, Key, ListTodo, Calendar, Radio, MessageSquare, Zap, Monitor, ChevronDown, ChevronRight, Link2, Server, Hash, AlertCircle } from 'lucide-react';
import { getNightbotKey, generateNightbotKey } from '../../features/integrations/api';
import { getAkoenetGuilds, getAkoenetChannels } from '../../features/akoenet/api';
import { devCatchLog } from '../../utils/devCatchLog';
import toast from 'react-hot-toast';
import { useStreamMode } from '../../contexts/StreamModeContext';
import { getPublicFrontendOrigin, getPublicStreamerShareUrl, getPublicEmbedStreamerShareUrl } from '../../shared/config/publicUrls';
import { apiClient } from '../../shared/api/client';

const MASK = '••••••••••••••••';

/** User-facing copy only — never show raw AkoeNet "Invalid scheduler webhook secret" in the UI. */
function mapAkoenetGuildsLoadError(err, t) {
  const data = err.response?.data;
  const code = data?.code;
  if (code === 'akoenet_discovery_not_implemented') return null;
  if (data?.reason === 'secret_mismatch') return t('bots.akoenetIntegrationAuthFailed');
  const raw = String(data?.details || data?.error || '');
  if (/invalid.*secret|scheduler webhook secret/i.test(raw)) return t('bots.akoenetIntegrationAuthFailed');
  if (code === 'akoenet_not_configured' || code === 'akoenet_invalid_webhook_url') {
    return data?.details || data?.error || t('bots.akoenetServersUnavailable');
  }
  if (err.response?.status === 503) return t('bots.akoenetServersUnavailable');
  return t('bots.akoenetServersUnavailable');
}

const API_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '') || (typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '');
const NIGHTBOT_TODO_URL = API_BASE ? `${API_BASE}/api/nightbot/todo` : '';
const FRONTEND_ORIGIN = getPublicFrontendOrigin();

function CopyButton({ text, label, copiedMessage = 'Copied', className = '' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success(copiedMessage);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${className}`}
      title={label || 'Copy'}
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
      <span>{copied ? 'Copied' : (label || 'Copy')}</span>
    </button>
  );
}

const BOTS_SUB_IDS = ['community', 'integrations', 'overlays', 'commands'];

export default function SettingsBotsTab({ user, token, t, setUser }) {
  const { streamMode } = useStreamMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const botsSubParam = searchParams.get('botsSub');
  const botsSub = BOTS_SUB_IDS.includes(botsSubParam) ? botsSubParam : 'community';

  const setBotsSub = (next) => {
    if (!BOTS_SUB_IDS.includes(next)) return;
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', 'bots');
        p.set('botsSub', next);
        return p;
      },
      { replace: true }
    );
  };
  const [key, setKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedNightbot, setCopiedNightbot] = useState(false);
  const [akoenetUrl, setAkoenetUrl] = useState('');
  const [akoenetSecret, setAkoenetSecret] = useState('');
  const [akoenetChannelId, setAkoenetChannelId] = useState('');
  const [akoenetSendClips, setAkoenetSendClips] = useState(false);
  const [akoenetSaving, setAkoenetSaving] = useState(false);
  const [akoenetServerId, setAkoenetServerId] = useState('');
  const [akoenetGuilds, setAkoenetGuilds] = useState([]);
  const [akoenetChannels, setAkoenetChannels] = useState([]);
  const [loadingAkoenetGuilds, setLoadingAkoenetGuilds] = useState(false);
  const [loadingAkoenetChannels, setLoadingAkoenetChannels] = useState(false);
  const [akoenetGuildsError, setAkoenetGuildsError] = useState(null);
  /** AkoeNet returns 503 when GET /servers is not implemented — show manual channel field only */
  const [akoenetManualTargets, setAkoenetManualTargets] = useState(false);

  const fetchKey = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const k = await getNightbotKey();
      setKey(k);
    } catch (e) {
      devCatchLog('SettingsBotsTab.fetchNightbotKey', e);
      setKey(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKey();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchKey on mount and when token changes
  }, [token]);

  useEffect(() => {
    setAkoenetUrl(user?.akoenetWebhookUrl || '');
    setAkoenetChannelId(user?.akoenetAnnounceChannelId || '');
    setAkoenetServerId(user?.akoenetServerId || '');
    setAkoenetSendClips(user?.akoenetSendClips === true);
    setAkoenetSecret('');
  }, [user?.akoenetWebhookUrl, user?.akoenetAnnounceChannelId, user?.akoenetServerId, user?.akoenetSendClips, user?.id]);

  const akoenetPerUserConfigured =
    !!(user?.akoenetWebhookUrl && String(user.akoenetWebhookUrl).trim() && user?.akoenetWebhookSecretSet);
  const akoenetConfigured =
    akoenetPerUserConfigured || user?.akoenetGlobalWebhookConfigured === true;
  const akoenetHostOnlyMode = !akoenetPerUserConfigured && user?.akoenetGlobalWebhookConfigured === true;

  useEffect(() => {
    if (!token || !akoenetConfigured || streamMode) {
      setAkoenetGuilds([]);
      setAkoenetChannels([]);
      setAkoenetGuildsError(null);
      setAkoenetManualTargets(false);
      return;
    }
    let cancelled = false;
    setLoadingAkoenetGuilds(true);
    setAkoenetGuildsError(null);
    setAkoenetManualTargets(false);
    getAkoenetGuilds()
      .then((data) => {
        if (!cancelled) {
          setAkoenetGuilds(data.guilds || []);
          setAkoenetGuildsError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAkoenetGuilds([]);
          const code = err.response?.data?.code;
          if (code === 'akoenet_discovery_not_implemented') {
            setAkoenetManualTargets(true);
            setAkoenetGuildsError(null);
          } else {
            setAkoenetManualTargets(false);
            setAkoenetGuildsError(mapAkoenetGuildsLoadError(err, t));
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAkoenetGuilds(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, akoenetConfigured, streamMode, user?.id, user?.akoenetWebhookUrl, t]);

  const guildInList = akoenetGuilds.some((g) => g.id === akoenetServerId);
  useEffect(() => {
    if (!akoenetServerId || !akoenetConfigured || streamMode || akoenetManualTargets) {
      setAkoenetChannels([]);
      return;
    }
    if (loadingAkoenetGuilds || akoenetGuildsError) return;
    if (!guildInList) {
      setAkoenetChannels([]);
      return;
    }
    let cancelled = false;
    setLoadingAkoenetChannels(true);
    getAkoenetChannels(akoenetServerId)
      .then((data) => {
        if (!cancelled) setAkoenetChannels(data.channels || []);
      })
      .catch((e) => {
        devCatchLog('SettingsBotsTab.getAkoenetChannels', e);
        if (!cancelled) setAkoenetChannels([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAkoenetChannels(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    akoenetServerId,
    akoenetConfigured,
    streamMode,
    akoenetManualTargets,
    loadingAkoenetGuilds,
    akoenetGuildsError,
    guildInList,
    akoenetGuilds,
  ]);

  const handleSaveAkoeNet = async (clearSecret = false) => {
    if (!token) return;
    setAkoenetSaving(true);
    try {
      const payload = {
        akoenetWebhookUrl: akoenetUrl.trim() || null,
        akoenetAnnounceChannelId: akoenetChannelId.trim() || null,
        akoenetServerId: akoenetServerId.trim() || null,
        akoenetSendClips,
      };
      if (clearSecret) {
        payload.akoenetWebhookSecret = null;
      } else if (akoenetSecret.trim()) {
        payload.akoenetWebhookSecret = akoenetSecret.trim();
      }
      const response = await apiClient.put('/user/profile', payload, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      if (setUser && response.data?.user) {
        const updatedUser = { ...user, ...response.data.user };
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      }
      setAkoenetSecret('');
      toast.success(t('bots.akoenetSaved') || 'AkoeNet settings saved.');
    } catch (err) {
      const msg = err.response?.data?.details
        ? (Array.isArray(err.response.data.details) ? err.response.data.details.map((d) => d.message).join('. ') : err.response.data.details)
        : err.response?.data?.error || err.message || t('settings.profileUpdateFailed');
      toast.error(msg);
    } finally {
      setAkoenetSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (key && !window.confirm(t('bots.regenerateConfirm') || 'This will invalidate your current API key. Bots using the old key will stop working. Continue?')) {
      return;
    }
    setGenerating(true);
    try {
      const newKey = await generateNightbotKey();
      setKey(newKey);
      toast.success(t('bots.keyGenerated') || 'Key generated. Use it in Nightbot and other bots.');
    } catch (err) {
      toast.error(err.response?.data?.error || t('bots.keyGenerateFailed') || 'Failed to generate key');
    } finally {
      setGenerating(false);
    }
  };

  const nightbotMessage = !streamMode && key && NIGHTBOT_TODO_URL
    ? `$(urlfetch ${NIGHTBOT_TODO_URL}?key=${encodeURIComponent(key)}&text=$(query)&user=$(user)&channel=$(channel))`
    : '';

  const copyNightbot = () => {
    if (!nightbotMessage) return;
    navigator.clipboard.writeText(nightbotMessage).then(() => {
      setCopiedNightbot(true);
      toast.success(t('bots.copied') || 'Copied to clipboard');
      setTimeout(() => setCopiedNightbot(false), 2000);
    });
  };

  const copyLabel = t('bots.copy') || 'Copy';
  const copiedMessage = t('bots.copied') || 'Copied';

  const shareUrlExample = getPublicStreamerShareUrl('username') || `${FRONTEND_ORIGIN}/streamer/username?ref=streamautomator`;

  const CHAT_COMMANDS = [
    { cmd: '!nextstream', path: 'nextstream', desc: t('bots.cmdNextstream') || 'Shows next scheduled stream', example: 'Next stream: Friday 20:00 — Minecraft Hardcore' },
    { cmd: '!countdown', path: 'countdown', desc: t('bots.cmdCountdown') || 'Time until next stream', example: 'Next stream in: 3h 12m' },
    { cmd: '!schedule / !week', path: 'schedule', pathAlt: 'week', desc: t('bots.cmdSchedule') || 'Weekly schedule', example: "This week's streams:\nFriday — Minecraft\nSunday — Just Chatting" },
    { cmd: '!nextgame', path: 'nextgame', desc: t('bots.cmdNextgame') || 'Next planned game/title', example: 'Next planned game: Friday 20:00 — Elden Ring' },
    { cmd: '!when <game>', path: 'when', desc: t('bots.cmdWhen') || 'Next stream for a specific game', example: 'Next Valorant stream: Thursday 19:00 — Valorant Ranked' },
    { cmd: '!calendar', path: 'calendar', desc: t('bots.cmdCalendar') || 'Public schedule link (friendly alias)', example: `Full stream schedule:\n${shareUrlExample}` },
    { cmd: '!goal', path: 'goal', desc: t('bots.cmdGoal') || 'Follower/sub goal', example: 'Follower goal: 500. Current: 421' },
    { cmd: '!streamcount', path: 'streamcount', desc: t('bots.cmdStreamcount') || 'Streams this month', example: 'Streams this month: 14.' },
    { cmd: '!laststream', path: 'laststream', desc: t('bots.cmdLaststream') || 'Last stream info', example: 'Last stream: Saturday — 21:00 — Just Chatting' },
    { cmd: '!streak', path: 'streak', desc: t('bots.cmdStreak') || 'Streaming streak in days', example: 'Streaming streak: 5 days in a row.' },
    { cmd: '!myschedule', path: 'myschedule', desc: t('bots.cmdMyschedule') || 'Public schedule link', example: `📅 My stream schedule: ${shareUrlExample}` },
    { cmd: '!streamstats', path: 'streamstats', desc: t('bots.cmdStreamstats') || 'Stream statistics', example: 'Streams this week: 3. Next stream: Friday 20:00' },
    { cmd: '!quote random', path: 'quote/random', desc: t('bots.cmdQuote') || 'Random saved quote', example: '"I screamed like a potato"' },
    { cmd: '!randomidea', path: 'idea/random', desc: t('bots.cmdRandomidea') || 'Random stream idea', example: 'Play a horror game challenge' },
    { cmd: '!randomclipidea', path: 'clipidea/random', desc: t('bots.cmdRandomClipidea') || 'Random clip idea', example: 'Clip idea: React to the weirdest Twitch clips.' },
    { cmd: '!contentwheel', path: 'contentwheel', desc: t('bots.cmdContentwheel') || 'Random built-in content idea', example: 'Random stream idea: Play with inverted controls for one match.' },
    { cmd: '!nextcollab', path: 'nextcollab', desc: t('bots.cmdNextcollab') || 'Next collaboration stream', example: 'Next collaboration stream: Saturday 20:00 — Valorant with StreamerX' },
    { cmd: '!raidnext', path: 'raidnext', desc: t('bots.cmdRaidnext') || 'Recommended raid target (simple suggestion)', example: 'Recommended raid target (next collab): Saturday 20:00 — Valorant with StreamerX' },
    { cmd: '!uptimeweek', path: 'uptimeweek', desc: t('bots.cmdUptimeweek') || 'Total stream time this week (approx.)', example: 'Total stream time this week: 12h 30m (based on schedule).' },
    { cmd: '!commands', path: 'commands', desc: t('bots.cmdCommands') || 'List all commands', example: 'Available commands:\n!nextstream\n!countdown\n...' },
  ];

  const getChatUrl = (path) => !streamMode && key && API_BASE ? `${API_BASE}/api/webhooks/${path}?key=${encodeURIComponent(key)}` : '';
  const getNightbotMsg = (path) => !streamMode && key && API_BASE ? `$(urlfetch ${API_BASE}/api/webhooks/${path}?key=${encodeURIComponent(key)})` : '';

  const OVERLAY_ITEMS = [
    { id: 'nextstream', path: 'nextstream', label: t('bots.overlayNextStream') || 'Next stream + countdown', size: '500 × 200' },
    { id: 'goal', path: 'goal', label: t('bots.overlayGoal') || 'Follower/sub goal', size: '400 × 140' },
    { id: 'week', path: 'week', label: t('bots.overlayWeek') || 'Weekly schedule', size: '420 × 220' },
    { id: 'quote', path: 'quote', label: t('bots.overlayQuote') || 'Random quote', size: '400 × 120' },
    { id: 'suggestions', path: 'suggestions', label: t('bots.overlaySuggestions') || 'Chat ideas (when someone uses !idea)', size: '450 × 120' },
    { id: 'roulette', path: 'roulette', label: t('bots.overlayRoulette') || 'Spin wheel (viewers !join, you !spin)', size: '600 × 600' },
  ];
  const getOverlayUrl = (path) => !streamMode && key && FRONTEND_ORIGIN ? `${FRONTEND_ORIGIN}/overlay/${path}?key=${encodeURIComponent(key)}` : '';

  const [overlaySectionOpen, setOverlaySectionOpen] = useState(true);

  const scrollToId = (id) => {
    if (!id) return;
    if (id.startsWith('cmd-')) {
      setBotsSub('commands');
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
      return;
    }
    const idToTab = {
      'bots-akoenet': 'community',
      'bots-api-key': 'integrations',
      'bots-overlays': 'overlays',
      'bots-chat-commands': 'commands',
      'bots-public-schedule': 'commands',
    };
    const tab = idToTab[id];
    if (tab) {
      setBotsSub(tab);
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const akoenetGuildsEmpty =
    akoenetConfigured &&
    !akoenetManualTargets &&
    !loadingAkoenetGuilds &&
    !akoenetGuildsError &&
    akoenetGuilds.length === 0;

  /** Server + channel chosen and discovery OK — short intro; URL/secret in collapsible details. */
  const akoenetPickerComplete =
    akoenetConfigured &&
    !akoenetManualTargets &&
    !akoenetGuildsError &&
    !akoenetGuildsEmpty &&
    String(akoenetServerId || '').trim() !== '' &&
    String(akoenetChannelId || '').trim() !== '';

  const hideAkoeNetWebhookFieldsInMain =
    akoenetHostOnlyMode || (akoenetPerUserConfigured && akoenetPickerComplete);

  return (
    <div className="space-y-8">
      {/* Header — streamer-friendly */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-500" />
          {t('bots.title') || 'Bots & integrations'}
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
          {t('bots.description') || 'Connect Nightbot, Streamer.bot, Mix It Up and StreamElements. One API key works for all.'}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm">
          <Zap className="w-4 h-4" />
          {t('bots.setupInMinutes') || 'Setup in ~2 minutes'}
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
          {t('bots.subTabsIntro') || 'Use the tabs below to focus on one area: community link, API & bot tools, OBS overlays, or chat commands and public links.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'community', label: t('bots.subTabCommunity') || 'AkoeNet & community', Icon: Link2 },
            { id: 'integrations', label: t('bots.subTabIntegrations') || 'API key & integrations', Icon: Key },
            { id: 'overlays', label: t('bots.subTabOverlays') || 'OBS overlays', Icon: Monitor },
            { id: 'commands', label: t('bots.subTabCommands') || 'Commands & links', Icon: MessageSquare },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setBotsSub(id)}
              className={`inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors rounded-t-md ${
                botsSub === id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {streamMode && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-800 dark:text-amber-200 text-sm">
          {t('common.streamModeBotsHint') || 'Stream mode is on — API key and URLs are hidden. Turn it off in the header to view or copy them.'}
        </div>
      )}

      {/* 1. AkoeNet — primary community integration (Discord-style); Discord remains optional in Platforms */}
      {botsSub === 'community' && (
      <div id="bots-akoenet" className="rounded-xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/90 to-white dark:from-violet-950/30 dark:to-gray-800/50 p-5 sm:p-6 scroll-mt-4">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium mb-1 flex-wrap">
          <Link2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          {t('bots.akoenetTitle') || 'AkoeNet'}
          <span className="text-[10px] font-normal uppercase tracking-wide px-2 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">
            {t('bots.akoenetCommunityBadge') || 'Community'}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-2xl">
          {streamMode
            ? (t('bots.akoenetStreamModeDescription') ||
                'AkoeNet settings are hidden while stream mode is on. Turn it off in the header to view or edit the webhook, secret, and channel.')
            : akoenetHostOnlyMode
              ? (t('bots.akoenetDescriptionHostConfigured') || 'The server already provides the AkoeNet webhook and secret. Pick your server and channel below (same idea as Discord).')
              : akoenetPerUserConfigured && akoenetPickerComplete
                ? (t('bots.akoenetDescriptionConnected') ||
                    'AkoeNet is linked. Announcements use the server and channel you select below.')
                : t('bots.akoenetDescription')}
        </p>
        {!streamMode && (
        <div className="space-y-4 max-w-xl">
          {!hideAkoeNetWebhookFieldsInMain && (
            <>
              <div>
                <label htmlFor="akoenetWebhookUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('bots.akoenetWebhookUrl') || 'Webhook URL'}
                </label>
                <input
                  id="akoenetWebhookUrl"
                  type="url"
                  autoComplete="off"
                  value={streamMode && akoenetUrl ? MASK : akoenetUrl}
                  onChange={(e) => !streamMode && setAkoenetUrl(e.target.value)}
                  readOnly={streamMode}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="http://localhost:5173/integrations/scheduler/webhooks/stream-scheduled"
                />
              </div>
              <div>
                <label htmlFor="akoenetWebhookSecret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('bots.akoenetSecret') || 'Shared secret'}
                </label>
                <input
                  id="akoenetWebhookSecret"
                  type="password"
                  autoComplete="new-password"
                  value={streamMode ? '' : akoenetSecret}
                  onChange={(e) => !streamMode && setAkoenetSecret(e.target.value)}
                  readOnly={streamMode}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder={
                    user?.akoenetWebhookSecretSet
                      ? (t('bots.akoenetSecretPlaceholder') || 'Leave blank to keep current secret')
                      : (t('bots.akoenetSecretPlaceholderNew') || 'Same shared password as on your AkoeNet server')
                  }
                />
                {user?.akoenetWebhookSecretSet && !streamMode && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('bots.akoenetSecretStored') || 'A secret is already saved. Enter a new one to replace it, or clear it below.'}
                  </p>
                )}
              </div>
            </>
          )}
          {akoenetGuildsError && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{akoenetGuildsError}</span>
            </div>
          )}

          {akoenetConfigured && !akoenetManualTargets && !streamMode && !akoenetGuildsEmpty && (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="min-w-[180px] flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  <Server className="w-3.5 h-3.5 inline mr-1 align-text-bottom" />
                  {t('bots.akoenetSelectServer') || 'Servidor AkoeNet'}
                </label>
                <select
                  value={akoenetServerId}
                  onChange={(e) => {
                    setAkoenetServerId(e.target.value);
                    setAkoenetChannelId('');
                  }}
                  disabled={loadingAkoenetGuilds || !!akoenetGuildsError}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                >
                  <option value="">
                    {loadingAkoenetGuilds
                      ? t('common.loading') || '…'
                      : t('bots.akoenetChooseServer') || 'Elegir servidor'}
                  </option>
                  {akoenetGuilds.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[180px] flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  <Hash className="w-3.5 h-3.5 inline mr-1 align-text-bottom" />
                  {t('bots.akoenetSelectChannel') || 'Canal de anuncios'}
                </label>
                <select
                  value={akoenetChannelId}
                  onChange={(e) => setAkoenetChannelId(e.target.value)}
                  disabled={!akoenetServerId || loadingAkoenetChannels || !guildInList}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                >
                  <option value="">
                    {loadingAkoenetChannels
                      ? t('common.loading') || '…'
                      : t('bots.akoenetChooseChannel') || 'Elegir canal'}
                  </option>
                  {akoenetChannels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {akoenetManualTargets && akoenetConfigured && !streamMode && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('bots.akoenetManualChannelHint') ||
                'Tu instancia AkoeNet aún no expone la lista de servidores por API. Usa el ID de canal manualmente o actualiza AkoeNet (GET …/integrations/scheduler/servers).'}
            </p>
          )}

          {akoenetGuildsEmpty && akoenetConfigured && !streamMode && (
            <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {t('bots.akoenetNoServersHint') ||
                'No hay servidores en la respuesta de AkoeNet. Comprueba la API o introduce el ID del canal abajo.'}
            </p>
          )}

          {(akoenetManualTargets || !akoenetConfigured || akoenetGuildsEmpty) && (
            <div>
              <label htmlFor="akoenetAnnounceChannelId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('bots.akoenetChannelId') || 'Channel ID (optional)'}
              </label>
              <input
                id="akoenetAnnounceChannelId"
                type="text"
                autoComplete="off"
                value={akoenetChannelId}
                onChange={(e) => setAkoenetChannelId(e.target.value)}
                disabled={streamMode}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-60"
                placeholder={t('bots.akoenetChannelIdPlaceholder') || 'Override announce channel in payload (optional)'}
              />
            </div>
          )}

          {akoenetConfigured && !akoenetManualTargets && !streamMode && !akoenetGuildsEmpty && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('bots.akoenetPickerHint') ||
                'Elige servidor y canal como en Discord; se guarda el canal en el webhook (channel_id).'}
            </p>
          )}
          <label className="flex items-start gap-3 cursor-pointer max-w-xl">
            <input
              type="checkbox"
              checked={akoenetSendClips}
              onChange={(e) => setAkoenetSendClips(e.target.checked)}
              disabled={streamMode}
              className="mt-1 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <span>
              <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">{t('bots.akoenetSendClipsLabel')}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('bots.akoenetSendClipsHint')}</span>
            </span>
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={akoenetSaving || streamMode}
              onClick={() => handleSaveAkoeNet(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {akoenetSaving ? (t('common.saving') || 'Saving…') : (t('bots.akoenetSave') || 'Save AkoeNet')}
            </button>
            {user?.akoenetWebhookSecretSet && !streamMode && !hideAkoeNetWebhookFieldsInMain && (
              <button
                type="button"
                disabled={akoenetSaving}
                onClick={() => {
                  if (!window.confirm(t('bots.akoenetClearSecretConfirm') || 'Remove the stored webhook secret?')) return;
                  handleSaveAkoeNet(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {t('bots.akoenetClearSecret') || 'Clear secret'}
              </button>
            )}
          </div>
          {hideAkoeNetWebhookFieldsInMain && !streamMode && akoenetHostOnlyMode && (
            <details className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 bg-white/60 dark:bg-gray-800/40">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('bots.akoenetAdvancedWebhook') || 'Advanced: custom webhook URL & secret (per user)'}
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="akoenetWebhookUrlAdvanced" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('bots.akoenetWebhookUrl') || 'Webhook URL'}
                  </label>
                  <input
                    id="akoenetWebhookUrlAdvanced"
                    type="url"
                    autoComplete="off"
                    value={akoenetUrl}
                    onChange={(e) => setAkoenetUrl(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                    placeholder="https://…/integrations/scheduler/webhooks/stream-scheduled"
                  />
                </div>
                <div>
                  <label htmlFor="akoenetWebhookSecretAdvanced" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('bots.akoenetSecret') || 'Shared secret'}
                  </label>
                  <input
                    id="akoenetWebhookSecretAdvanced"
                    type="password"
                    autoComplete="new-password"
                    value={akoenetSecret}
                    onChange={(e) => setAkoenetSecret(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                    placeholder={
                      user?.akoenetWebhookSecretSet
                        ? (t('bots.akoenetSecretPlaceholder') || 'Leave blank to keep current secret')
                        : (t('bots.akoenetSecretPlaceholderNew') || 'Same shared password as on your AkoeNet server')
                    }
                  />
                  {user?.akoenetWebhookSecretSet && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('bots.akoenetSecretStored') || 'A secret is already saved. Enter a new one to replace it, or clear it below.'}
                    </p>
                  )}
                </div>
                {user?.akoenetWebhookSecretSet && (
                  <button
                    type="button"
                    disabled={akoenetSaving}
                    onClick={() => {
                      if (!window.confirm(t('bots.akoenetClearSecretConfirm') || 'Remove the stored webhook secret?')) return;
                      handleSaveAkoeNet(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    {t('bots.akoenetClearSecret') || 'Clear secret'}
                  </button>
                )}
              </div>
            </details>
          )}
        </div>
        )}
      </div>
      )}

      {/* 2. API key — Nightbot & chat commands */}
      {botsSub === 'integrations' && (
      <>
      <div id="bots-api-key" className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800/80 dark:to-gray-800/50 p-5 sm:p-6 scroll-mt-4">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium mb-1">
          <Key className="w-5 h-5 text-indigo-500" />
          {t('bots.apiKeyLabel') || 'Your API key'}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('bots.apiKeyHint') || 'Use this key in Nightbot and in Streamer.bot, Mix It Up, StreamElements, etc. Keep it private.'}
        </p>
        {loading ? (
          <p className="text-sm text-gray-500">{t('common.loading') || 'Loading...'}</p>
        ) : key ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-200 break-all max-w-full" title={streamMode ? undefined : key}>
              {streamMode ? '••••••••••••••••' : key}
            </code>
            {!streamMode && <CopyButton text={key} label={copyLabel} copiedMessage={copiedMessage} />}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? (t('bots.generating') || 'Generating...') : (t('bots.regenerate') || 'Regenerate')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? (t('bots.generating') || 'Generating...') : (t('bots.generateKey') || 'Generate API key')}
          </button>
        )}
      </div>

      {/* 2. Nightbot — simple steps */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-5 sm:p-6">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t('bots.nightbotTitle') || 'Nightbot — !todo in chat'}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('bots.nightbotIntro') || 'When someone types !todo buy new mic, it appears in your Todos list.'}
        </p>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold">1</span>
            <span className="text-gray-700 dark:text-gray-300">{t('bots.step1') || 'Nightbot dashboard → Commands → Custom → Add Command'}</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold">2</span>
            <span className="text-gray-700 dark:text-gray-300">{t('bots.step2') || 'Command: !todo'}</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold">3</span>
            <div className="flex-1 min-w-0">
              <span className="text-gray-700 dark:text-gray-300 block mb-2">{t('bots.step3') || 'Message (paste this):'}</span>
              {!key ? (
                <span className="text-amber-600 dark:text-amber-400 text-xs">{t('bots.generateKeyFirst') || 'Generate a key above first.'}</span>
              ) : streamMode ? (
                <span className="text-gray-500 dark:text-gray-400 text-xs">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</span>
              ) : (
                <div className="flex flex-wrap items-start gap-2">
                  <code className="flex-1 min-w-0 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-3 py-2 text-xs break-all font-mono">
                    {nightbotMessage}
                  </code>
                  <button
                    type="button"
                    onClick={copyNightbot}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                  >
                    {copiedNightbot ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedNightbot ? (t('bots.copied') || 'Copied!') : copyLabel}
                  </button>
                </div>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold">4</span>
            <span className="text-gray-700 dark:text-gray-300">{t('bots.step4') || 'Userlevel: Moderator (recommended)'}</span>
          </li>
        </ol>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('bots.todosLink') || 'Todos show up in the Todos section of this app.'}
        </p>
      </div>

      {/* 3. Other bots — clear cards per action */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-5 sm:p-6">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t('bots.webhooksTitle') || 'Streamer.bot, Mix It Up, StreamElements'}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('bots.webhooksDesc') || 'Same API key. In your bot, add a Web Request (POST) and use one of the URLs below. Put your key in the header X-API-Key.'}
        </p>
        <div className="space-y-3">
          <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium text-sm mb-1">
              <ListTodo className="w-4 h-4 text-indigo-500" />
              {t('bots.webhookTodo') || 'Add a todo'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">POST — Body: {JSON.stringify({ text: 'your task' })}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs break-all text-gray-700 dark:text-gray-300">{API_BASE}/api/webhooks/todo</code>
              <CopyButton text={`${API_BASE}/api/webhooks/todo`} label={copyLabel} copiedMessage={copiedMessage} />
            </div>
          </div>
          <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium text-sm mb-1">
              <Calendar className="w-4 h-4 text-indigo-500" />
              {t('bots.webhookEvent') || 'Create stream event'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">POST — Body: {JSON.stringify({ title: 'Friday 20:00 Minecraft' })}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs break-all text-gray-700 dark:text-gray-300">{API_BASE}/api/webhooks/events</code>
              <CopyButton text={`${API_BASE}/api/webhooks/events`} label={copyLabel} copiedMessage={copiedMessage} />
            </div>
          </div>
          <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium text-sm mb-1">
              <Radio className="w-4 h-4 text-indigo-500" />
              {t('bots.webhookStreamStart') || 'Mark stream started'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">POST — Optional body: {JSON.stringify({})}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs break-all text-gray-700 dark:text-gray-300">{API_BASE}/api/webhooks/stream/start</code>
              <CopyButton text={`${API_BASE}/api/webhooks/stream/start`} label={copyLabel} copiedMessage={copiedMessage} />
            </div>
          </div>
          <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium text-sm mb-1">
              <ListTodo className="w-4 h-4 text-indigo-500" />
              {t('bots.webhookIdeaNoteQuote') || '!idea / !note / !quote / !clipidea'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">POST — Body: {JSON.stringify({ text: 'your text' })} — Or from Nightbot (GET): <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">idea/add?text=...</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">note/add?text=...</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">quote/add?quote=...</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">clipidea/add?text=...</code> (append <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">&amp;key=KEY</code>)</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs break-all text-gray-700 dark:text-gray-300">{API_BASE}/api/webhooks/idea</code>
              <CopyButton text={`${API_BASE}/api/webhooks/idea`} label={copyLabel} copiedMessage={copiedMessage} />
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
          {t('bots.webhooksExample') || 'Example: In Streamer.bot, when you go live → add action → Web Request → POST to the "Mark stream started" URL with header X-API-Key: your key.'}
        </p>
        <details className="group">
          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            {t('bots.timelineWebhook') || 'POST /api/webhooks/timeline — Body: { "type": "clip", "payload": {} } to log stream moments (for timeline).'}
          </summary>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="text-xs break-all text-gray-700 dark:text-gray-300">{API_BASE}/api/webhooks/timeline</code>
            <CopyButton text={`${API_BASE}/api/webhooks/timeline`} label={copyLabel} copiedMessage={copiedMessage} />
          </div>
        </details>
      </div>

      {/* 4. Roulette (spin wheel) – recommended integration */}
      <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-900/20 p-5 sm:p-6">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('bots.rouletteTitle')}
        </h4>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          {t('bots.rouletteIntro')}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 p-3 text-xs">
            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {t('bots.rouletteStepHttp')}
            </p>
            <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
              {`POST ${API_BASE}/api/roulette/spin\n${t('bots.rouletteAuthLine')}`}
            </pre>
            <p className="mt-2 text-gray-700 dark:text-gray-300">
              {t('bots.rouletteResponseHint')}
            </p>
            <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
              {t('bots.rouletteExampleBody')}
            </pre>
          </div>
          <div className="rounded-lg bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 p-3 text-xs space-y-2">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {t('bots.rouletteStepCommand')}
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              {t('bots.rouletteTemplateHint')}
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
              <li>
                {t('bots.rouletteNightbotLabel')}:{' '}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{t('bots.rouletteNightbotCommand')}</code>
              </li>
              <li>
                {t('bots.rouletteStreamerbotLabel')}:{' '}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{t('bots.rouletteStreamerbotCommand')}</code>
              </li>
            </ul>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {t('bots.rouletteNote')}
            </p>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Overlays for OBS — prominent, step-by-step */}
      {botsSub === 'overlays' && (
      <div id="bots-overlays" className="rounded-xl border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/80 to-white dark:from-gray-800/80 dark:to-gray-800/50 p-5 sm:p-6 scroll-mt-4">
        <button
          type="button"
          onClick={() => setOverlaySectionOpen((o) => !o)}
          className="flex w-full items-center gap-2 text-left"
        >
          <Monitor className="w-5 h-5 text-indigo-500 flex-shrink-0" />
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            {t('bots.overlaysTitle') || 'Overlays for OBS / Streamlabs'}
          </h4>
          {overlaySectionOpen ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
        </button>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('bots.overlaysIntro') || 'Show next stream, goal, weekly schedule or quotes on your stream. Add as Browser Source in OBS.'}
        </p>
        {overlaySectionOpen && (
          <>
            <div className="mt-4 p-4 rounded-lg bg-white dark:bg-gray-800/70 border border-indigo-100 dark:border-indigo-900/50">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('bots.overlaysStepsTitle') || 'How to add in OBS'}</p>
              <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside">
                <li>{t('bots.overlaysStep1') || 'In OBS: Sources → Add → Browser Source'}</li>
                <li>{t('bots.overlaysStep2') || 'Paste one of the URLs below (it already includes your API key)'}</li>
                <li>{t('bots.overlaysStep3') || 'Set width and height (e.g. 500 × 200). Optional: check "Shutdown source when not visible" to save resources.'}</li>
              </ol>
            </div>
            <div className="mt-4 space-y-3">
              {OVERLAY_ITEMS.map(({ id, path, label, size }) => {
                const url = getOverlayUrl(path);
                return (
                  <div key={id} className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{size}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {url ? (
                        <>
                          <code className="flex-1 min-w-0 text-xs break-all bg-gray-100 dark:bg-gray-700 px-2 py-1.5 rounded">{url}</code>
                          <CopyButton text={url} label={t('bots.copyObsUrl') || 'Copy OBS URL'} copiedMessage={copiedMessage} />
                        </>
                      ) : streamMode && key ? (
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 text-xs">{t('bots.generateKeyFirst') || 'Generate a key above first.'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {t('bots.overlaysHint') || 'Each overlay refreshes automatically. They show "Powered by Streamer Scheduler" so viewers can find the app.'}
            </p>
          </>
        )}
      </div>
      )}

      {/* Chat commands (GET) — quick table + detailed cards */}
      {botsSub === 'commands' && (
      <>
      <div id="bots-chat-commands" className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-5 sm:p-6 scroll-mt-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          {t('bots.chatCommandsTitle') || 'Chat commands (GET — bot replies in chat)'}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {t('bots.chatCommandsDesc') || 'These endpoints return plain text. Your bot does a GET request and says the response in chat. Use ?key=YOUR_KEY.'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {t('bots.streamerBotHint') || 'Streamer.bot: Action → HTTP Request → GET to the URL below. Nightbot: use $(urlfetch URL) in Custom Command.'}
        </p>

        {/* Quick reference table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600 mb-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700/50">
                <th className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">{t('bots.tableCommand') || 'Command'}</th>
                <th className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">{t('bots.tableWhat') || 'What it does'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {CHAT_COMMANDS.map(({ cmd, desc, path }) => {
                const targetId = path ? `cmd-${path}` : undefined;
                return (
                  <tr
                    key={cmd}
                    className="bg-white dark:bg-gray-800/50 hover:bg-indigo-50/70 dark:hover:bg-indigo-900/40 cursor-pointer"
                    onClick={() => targetId && scrollToId(targetId)}
                  >
                    <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400">{cmd}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{desc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detailed cards — copy-paste ready */}
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">{t('bots.copyPasteReady') || 'Copy-paste ready (with your API key):'}</p>
        <div className="space-y-4">
          {CHAT_COMMANDS.map(({ cmd, path, pathAlt, desc, example }) => {
            const url = getChatUrl(path);
            const nightbotMsg = getNightbotMsg(path);
            const urlAlt = pathAlt ? getChatUrl(pathAlt) : null;
            return (
              <div
                key={path || cmd}
                id={path ? `cmd-${path}` : undefined}
                className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <code className="font-mono font-medium text-indigo-600 dark:text-indigo-400">{cmd}</code>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">— {desc}</span>
                </div>
                {example && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 mt-1 italic">
                    {t('bots.exampleResponse') || 'Example'}: {example.split('\n')[0]}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {url ? (
                    <>
                      <code className="flex-1 min-w-0 text-xs break-all bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{url}</code>
                      <CopyButton text={url} label={copyLabel} copiedMessage={copiedMessage} />
                    </>
                  ) : streamMode && key ? (
                    <span className="text-gray-500 dark:text-gray-400 text-xs">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 text-xs">{t('bots.generateKeyFirst') || 'Generate a key above first.'}</span>
                  )}
                </div>
                {!streamMode && url && nightbotMsg && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('bots.nightbotExample') || 'Nightbot — Message:'}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="flex-1 min-w-0 text-xs break-all bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">{nightbotMsg}</code>
                      <CopyButton text={nightbotMsg} label={copyLabel} copiedMessage={copiedMessage} />
                    </div>
                  </div>
                )}
                {urlAlt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {t('bots.scheduleAlsoAt') || 'Also works at'}: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/api/webhooks/week</code>
                  </p>
                )}
                {path === 'quote/random' && !streamMode && key && API_BASE && (
                  <details className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <summary className="text-xs font-medium text-amber-700 dark:text-amber-400 cursor-pointer">
                      {t('bots.quoteNightbotHint') || 'Nightbot: two commands (no JavaScript)'}
                    </summary>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-2">
                      {t('bots.quoteNightbotDesc') || 'Nightbot does not run JavaScript (so no $(eval) or encodeURIComponent). Create two separate commands using only $(urlfetch) and $(query):'}
                    </p>
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="font-medium text-gray-700 dark:text-gray-300 mb-0.5">1. !quote — random quote</p>
                        <code className="block break-all bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                          $(urlfetch {API_BASE}/api/webhooks/quote/random?key=YOUR_KEY)
                        </code>
                        <div className="mt-1 flex items-center gap-2">
                          <CopyButton text={`$(urlfetch ${API_BASE}/api/webhooks/quote/random?key=${key})`} label={copyLabel} copiedMessage={copiedMessage} className="text-xs" />
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700 dark:text-gray-300 mb-0.5">2. !addquote — save quote (e.g. !addquote Hello there)</p>
                        <code className="block break-all bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                          $(urlfetch {API_BASE}/api/webhooks/quote/add?quote=$(query)&key=YOUR_KEY)
                        </code>
                        <div className="mt-1 flex items-center gap-2">
                          <CopyButton text={`$(urlfetch ${API_BASE}/api/webhooks/quote/add?quote=$(query)&key=${key})`} label={copyLabel} copiedMessage={copiedMessage} className="text-xs" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 italic">
                          {t('bots.quoteNightbotSpaces') || 'If spaces break the URL, try !addquote with words separated by + or use a single word.'}
                        </p>
                      </div>
                    </div>
                  </details>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <button
                    type="button"
                    onClick={() => scrollToId('bots-chat-commands')}
                    className="underline-offset-2 hover:underline"
                  >
                    {t('bots.backToList') || 'Back to list'}
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToId('bots-api-key')}
                    className="underline-offset-2 hover:underline"
                  >
                    {t('bots.backToTop') || 'Back to top'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Viewer suggest — public URL (no key) */}
      {user?.username && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-5 sm:p-6">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('bots.viewerSuggestTitle') || '!suggest — Viewer suggestions'}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t('bots.viewerSuggestDesc') || 'Viewers can suggest stream ideas. No API key needed. POST to this URL from your bot when someone types !suggest play Elden Ring.'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">POST — Body: {JSON.stringify({ text: 'play Elden Ring', suggestedBy: 'viewer_name' })}</p>
          <div className="flex flex-wrap items-center gap-2">
            {streamMode ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</span>
            ) : (
              <>
                <code className="text-xs break-all text-gray-700 dark:text-gray-300">{API_BASE}/api/streamer/{encodeURIComponent(user.username)}/suggest</code>
                <CopyButton text={`${API_BASE}/api/streamer/${user.username}/suggest`} label={copyLabel} copiedMessage={copiedMessage} />
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('bots.viewerSuggestDashboard') || 'Suggestions appear in the Suggestions page in the app.'}</p>
        </div>
      )}

      {/* 4. Public schedule — share link */}
      {user?.username && (
        <div id="bots-public-schedule" className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-5 sm:p-6 scroll-mt-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-1">
            <ExternalLink className="w-4 h-4 text-indigo-500" />
            {t('bots.publicScheduleTitle') || 'Your public schedule'}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('bots.publicScheduleDesc') || 'Share this link in your Twitch bio, Discord or Twitter. Viewers see your upcoming streams and can get reminders.'}
          </p>
          <div className="space-y-3">
            {streamMode ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</span>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={getPublicStreamerShareUrl(user.username)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                  >
                    {getPublicStreamerShareUrl(user.username)}
                  </a>
                  <CopyButton
                    text={getPublicStreamerShareUrl(user.username)}
                    label={copyLabel}
                    copiedMessage={copiedMessage}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('bots.embedHint') || 'Embed (iframe):'}</span>
                  <code className="text-xs break-all text-gray-700 dark:text-gray-300">{getPublicEmbedStreamerShareUrl(user.username)}</code>
                  <CopyButton text={getPublicEmbedStreamerShareUrl(user.username)} label={copyLabel} copiedMessage={copiedMessage} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
