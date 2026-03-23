import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Twitch, Save, Server, AlertCircle, Instagram, RefreshCw, BarChart2, ExternalLink } from 'lucide-react';
import { DISCORD_ICON_URL } from '../../constants/platforms';
import {
  getDiscordGuilds,
  getDiscordChannels,
  getDiscordInviteUrl,
  setupSlackWorkspace,
  getInstagramAccount,
  getInstagramPosts,
  getInstagramPostInsights,
} from '../../api';

// Platform-specific icons (same style as Login page)
const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const TwitchIcon = () => (
  <Twitch className="w-5 h-5 flex-shrink-0 text-[#9146FF]" aria-hidden />
);

const DiscordIcon = () => (
  <img src={DISCORD_ICON_URL} alt="" className="w-5 h-5 flex-shrink-0 object-contain" aria-hidden />
);

const TwitterIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const YouTubeIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#FF0000" aria-hidden>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const SlackIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden>
    <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.52 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.521-2.522v-2.522h2.521zM15.165 17.688a2.527 2.527 0 0 1-2.521-2.523 2.526 2.526 0 0 1 2.521-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const PLATFORM_ICONS = {
  google: GoogleIcon,
  twitch: TwitchIcon,
  discord: DiscordIcon,
  twitter: TwitterIcon,
  youtube: YouTubeIcon,
  slack: SlackIcon,
  email: MailIcon,
};

const PLATFORMS = [
  { key: 'google', label: 'Google' },
  { key: 'twitch', label: 'Twitch' },
  { key: 'discord', label: 'Discord' },
  { key: 'twitter', label: 'X (Twitter)' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'slack', label: 'Slack' },
  { key: 'email', labelKey: 'settings.emailPassword', noConnect: true },
];

export default function SettingsPlatformsTab({
  user,
  connectedAccounts,
  setConnectedAccounts,
  connectedAccountsLoading,
  disconnectingKey,
  connectingKey,
  token,
  t,
  onConnect,
  onDisconnect,
  fetchConnectedAccounts,
  onTwitchPublishConnect,
  onSaveClipsChannel,
}) {
  const discordConnected = connectedAccounts?.discord === true;
  const [clipsGuildId, setClipsGuildId] = useState(user?.discordClipsGuildId || '');
  const [clipsChannelId, setClipsChannelId] = useState(user?.discordClipsChannelId || '');
  const [clipsGuilds, setClipsGuilds] = useState([]);
  const [clipsChannels, setClipsChannels] = useState([]);
  const [loadingClipsGuilds, setLoadingClipsGuilds] = useState(false);
  const [loadingClipsChannels, setLoadingClipsChannels] = useState(false);
  const [savingClipsChannel, setSavingClipsChannel] = useState(false);
  const [clipsGuildsError, setClipsGuildsError] = useState(null);
  const [setupSlackLoading, setSetupSlackLoading] = useState(false);

  const [igAccount, setIgAccount] = useState(null);
  const [igPosts, setIgPosts] = useState([]);
  const [igLoading, setIgLoading] = useState(false);
  const [igPostsLoading, setIgPostsLoading] = useState(false);
  const [igError, setIgError] = useState(null);
  const [igNotConfigured, setIgNotConfigured] = useState(false);
  const [insightsById, setInsightsById] = useState({});
  const [insightsLoadingId, setInsightsLoadingId] = useState(null);

  const loadInstagram = React.useCallback(async () => {
    if (!token) return;
    setIgLoading(true);
    setIgPostsLoading(true);
    setIgError(null);
    setIgNotConfigured(false);
    setIgAccount(null);
    setIgPosts([]);
    try {
      const account = await getInstagramAccount();
      setIgAccount(account);
      try {
        const postsRes = await getInstagramPosts(5);
        setIgPosts(postsRes?.data || []);
      } catch {
        setIgPosts([]);
      }
    } catch (err) {
      const code = err.response?.data?.code;
      if (err.response?.status === 503 && code === 'instagram_not_configured') {
        setIgNotConfigured(true);
      } else {
        setIgError(err.response?.data?.error || err.message);
      }
    } finally {
      setIgLoading(false);
      setIgPostsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setIgAccount(null);
      setIgPosts([]);
      setIgError(null);
      setIgNotConfigured(false);
      return;
    }
    loadInstagram();
  }, [token, loadInstagram]);

  useEffect(() => {
    setClipsGuildId(user?.discordClipsGuildId || '');
    setClipsChannelId(user?.discordClipsChannelId || '');
  }, [user?.discordClipsGuildId, user?.discordClipsChannelId]);

  useEffect(() => {
    if (!discordConnected || !token || disconnectingKey === 'discord') {
      setClipsGuilds([]);
      setClipsChannels([]);
      setClipsGuildId('');
      setClipsChannelId('');
      setClipsGuildsError(null);
      return;
    }
    let cancelled = false;
    setLoadingClipsGuilds(true);
    setClipsGuildsError(null);
    getDiscordGuilds()
      .then((data) => {
        if (!cancelled) {
          setClipsGuilds(data.guilds || []);
          setClipsGuildsError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setClipsGuilds([]);
          setClipsGuildId('');
          setClipsChannelId('');
          setClipsChannels([]);
          const msg = err.response?.data?.error || err.response?.data?.details || err.message;
          setClipsGuildsError(msg || t('settings.clipsGuildsLoadFailed'));
        }
      })
      .finally(() => { if (!cancelled) setLoadingClipsGuilds(false); });
    return () => { cancelled = true; };
  }, [discordConnected, token, disconnectingKey, t]);

  // Only fetch channels after guilds loaded successfully and selected guild is in the list (avoids 403 when guilds returned 503)
  const guildInList = clipsGuilds.some((g) => g.id === clipsGuildId);
  useEffect(() => {
    if (!clipsGuildId || !discordConnected || disconnectingKey === 'discord') {
      setClipsChannels([]);
      return;
    }
    if (loadingClipsGuilds || clipsGuildsError) return;
    // Guilds loaded but saved guild not in list (e.g. bot removed from server) → clear selection
    if (!guildInList) {
      setClipsChannels([]);
      setClipsGuildId('');
      setClipsChannelId('');
      return;
    }
    let cancelled = false;
    // Guild is in list: safe to fetch channels
    setLoadingClipsChannels(true);
    setClipsChannels([]);
    getDiscordChannels(clipsGuildId)
      .then((data) => {
        if (!cancelled) setClipsChannels(data.channels || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setClipsChannels([]);
          if (err.response?.status === 403) {
            setClipsGuildId('');
            setClipsChannelId('');
          }
        }
      })
      .finally(() => { if (!cancelled) setLoadingClipsChannels(false); });
    return () => { cancelled = true; };
  }, [clipsGuildId, discordConnected, disconnectingKey, loadingClipsGuilds, clipsGuildsError, guildInList, clipsGuilds]);

  const handleSaveClipsChannel = async () => {
    if (typeof onSaveClipsChannel !== 'function') return;
    setSavingClipsChannel(true);
    try {
      await onSaveClipsChannel(clipsGuildId || null, clipsChannelId || null);
    } finally {
      setSavingClipsChannel(false);
    }
  };

  const handleInstagramInsights = async (mediaId) => {
    setInsightsLoadingId(mediaId);
    try {
      const data = await getInstagramPostInsights(mediaId);
      setInsightsById((prev) => ({ ...prev, [mediaId]: { ok: true, payload: data } }));
    } catch (err) {
      setInsightsById((prev) => ({
        ...prev,
        [mediaId]: { ok: false, error: err.response?.data?.error || err.message },
      }));
    } finally {
      setInsightsLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        {t('settings.platformsConnectTitle') || 'Connect platforms'}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('settings.connectedAccountsDescription') || 'Link other sign-in methods to this account. You can then use any of them to log in.'}
      </p>
      {connectedAccountsLoading ? (
        <p className="text-sm text-gray-500">{t('common.loading') || 'Loading...'}</p>
      ) : connectedAccounts ? (
        <div className="space-y-4">
          {PLATFORMS.map(({ key, label, labelKey, noConnect }) => {
            const labelText = label || t(labelKey);
            const connected = connectedAccounts[key];
            const username = connectedAccounts.usernames?.[key];
            const connect = noConnect ? null : () => onConnect(key);
            const disconnect = noConnect ? null : () => onDisconnect(key);
            const IconComponent = PLATFORM_ICONS[key] || MailIcon;
            return (
              <div key={key} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <IconComponent />
                    <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{labelText}</span>
                      {connected && username && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">({username})</span>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded flex-shrink-0 ${connected ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {connected ? (t('settings.connected') || 'Connected') : (t('settings.notConnected') || 'Not connected')}
                      </span>
                    </div>
                  </div>
                  {connect && !connected && (
                    <button
                      type="button"
                      onClick={connect}
                      disabled={connectingKey === key}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait flex-shrink-0"
                    >
                      {connectingKey === key ? (t('common.loading') || '...') : (t('settings.connect') || 'Connect')}
                    </button>
                  )}
                  {disconnect && connected && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(t('settings.disconnectConfirm') || 'Disconnect this platform? You can reconnect later.')) return;
                        try {
                          await onDisconnect(key);
                        } catch (err) {
                          if (token && fetchConnectedAccounts) fetchConnectedAccounts();
                        }
                      }}
                      disabled={disconnectingKey !== null}
                      className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 flex-shrink-0"
                    >
                      {disconnectingKey === key ? (t('common.loading') || '...') : (t('settings.disconnect') || 'Disconnect')}
                    </button>
                  )}
                </div>
                {key === 'email' && !connected && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 pl-8">
                    {t('settings.setPasswordInSecurity') || 'Set a password in Security tab.'}
                  </p>
                )}
                {key === 'twitter' && connected && connectedAccounts.twitterTokenMissing && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 pl-8">
                    {t('settings.twitterReconnectToPublish') || 'Access token missing. Disconnect and reconnect X (Twitter) to enable publishing.'}
                  </p>
                )}
                {key === 'twitch' && onTwitchPublishConnect && !connectedAccounts.twitchPublishConnected && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 pl-8">
                    {t('settings.twitchPublishConnectHint')}{' '}
                    <button
                      type="button"
                      onClick={onTwitchPublishConnect}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {t('settings.twitchConnectForPublish')}
                    </button>
                  </p>
                )}
                {key === 'twitch' && connectedAccounts.twitchPublishConnected && (
                  <p className="text-xs text-green-600 dark:text-green-400 pl-8">
                    {t('settings.twitchPublishConnected') || 'Connected for scheduling and bits.'}
                  </p>
                )}
                {key === 'youtube' && connected && (
                  <p className="text-xs text-green-600 dark:text-green-400 pl-8">
                    {t('settings.youtubePublishConnected') || 'Connected for video uploads.'}
                  </p>
                )}
                {key === 'slack' && connected && (
                  <div className="pl-8 space-y-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t('settings.slackSetupWorkspaceHint') || 'Create streaming channels and groups (@mods, @editors) in your Slack workspace.'}
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        setSetupSlackLoading(true);
                        try {
                          const data = await setupSlackWorkspace();
                          if (data?.errors?.length) {
                            const msg = data.errors.slice(0, 3).join('; ');
                            toast.error((t('settings.slackSetupPartial') || 'Setup completed with some issues:') + ' ' + msg);
                          } else {
                            toast.success(t('settings.slackSetupDone') || 'Streaming workspace created: #stream-announcements, #stream-chat, #stream-clips, #stream-mods and @mods, @editors.');
                          }
                          if (fetchConnectedAccounts) fetchConnectedAccounts();
                        } catch (err) {
                          const msg = err.response?.data?.error || err.message;
                          toast.error((t('settings.slackSetupFailed') || 'Setup failed:') + ' ' + msg);
                        } finally {
                          setSetupSlackLoading(false);
                        }
                      }}
                      disabled={setupSlackLoading}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#E01E5A] text-white hover:bg-[#c41a4d] disabled:opacity-60 disabled:cursor-wait"
                    >
                      {setupSlackLoading ? (t('common.loading') || '...') : (t('settings.slackSetupWorkspace') || 'Setup Streaming Workspace')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t('settings.couldNotLoadAccounts') || 'Could not load connected accounts.'}</p>
      )}

      {token && (
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Instagram className="w-5 h-5 text-pink-600 flex-shrink-0" aria-hidden />
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('settings.instagramGraphTitle')}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => loadInstagram()}
              disabled={igLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${igLoading ? 'animate-spin' : ''}`} aria-hidden />
              {t('settings.instagramGraphRefresh')}
            </button>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{t('settings.instagramGraphDescription')}</p>
          {igLoading && !igAccount && !igNotConfigured && !igError && (
            <p className="text-sm text-gray-500">{t('common.loading')}</p>
          )}
          {igNotConfigured && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-100 space-y-1">
              <p className="font-medium">{t('settings.instagramNotConfiguredTitle')}</p>
              <p className="text-amber-800 dark:text-amber-200">{t('settings.instagramNotConfiguredBody')}</p>
            </div>
          )}
          {igError && (
            <p className="text-sm text-red-600 dark:text-red-400">{igError}</p>
          )}
          {igAccount && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-4 text-sm text-gray-800 dark:text-gray-200">
                <span>
                  <span className="text-gray-500 dark:text-gray-400">{t('settings.instagramUsername')}</span>{' '}
                  @{igAccount.username || '—'}
                </span>
                <span>
                  <span className="text-gray-500 dark:text-gray-400">{t('settings.instagramFollowers')}</span>{' '}
                  {igAccount.followers_count ?? '—'}
                </span>
                <span>
                  <span className="text-gray-500 dark:text-gray-400">{t('settings.instagramMediaCount')}</span>{' '}
                  {igAccount.media_count ?? '—'}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('settings.instagramRecentMedia')}</p>
                {igPostsLoading ? (
                  <p className="text-sm text-gray-500">{t('common.loading')}</p>
                ) : igPosts.length === 0 ? (
                  <p className="text-xs text-gray-500">{t('settings.instagramNoPosts')}</p>
                ) : (
                  <ul className="space-y-2">
                    {igPosts.map((post) => {
                      const insight = insightsById[post.id];
                      const captionPreview = (post.caption || '').replace(/\s+/g, ' ').trim().slice(0, 80);
                      const when = post.timestamp
                        ? new Date(post.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                        : '';
                      return (
                        <li
                          key={post.id}
                          className="p-2 rounded-md bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 text-xs space-y-2"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-gray-800 dark:text-gray-200 break-words">
                                {captionPreview || t('settings.instagramNoCaption')}
                                {post.caption && post.caption.length > 80 ? '…' : ''}
                              </p>
                              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                                {post.media_type}
                                {when ? ` · ${when}` : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                              {post.permalink && (
                                <a
                                  href={post.permalink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-pink-600 text-white hover:bg-pink-700"
                                >
                                  <ExternalLink className="w-3 h-3" aria-hidden />
                                  {t('settings.instagramOpenPost')}
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleInstagramInsights(post.id)}
                                disabled={insightsLoadingId === post.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-500 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
                              >
                                <BarChart2 className="w-3 h-3" aria-hidden />
                                {insightsLoadingId === post.id ? t('common.loading') : t('settings.instagramLoadInsights')}
                              </button>
                            </div>
                          </div>
                          {insight?.ok === false && (
                            <p className="text-red-600 dark:text-red-400">{insight.error}</p>
                          )}
                          {insight?.ok && insight.payload?.data?.length > 0 && (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-gray-700 dark:text-gray-300">
                              {insight.payload.data.map((row) => (
                                <li key={row.name || row.id}>
                                  <span className="font-medium">{row.title || row.name}</span>
                                  {Array.isArray(row.values) && row.values[0]?.value != null && (
                                    <span>: {row.values[0].value}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                          {insight?.ok && (!insight.payload?.data || insight.payload.data.length === 0) && (
                            <p className="text-gray-500">{t('settings.instagramInsightsEmpty')}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {discordConnected && onSaveClipsChannel && (
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('settings.discordClipsChannelTitle') || 'Canal para clips de Twitch'}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {t('settings.discordClipsChannelDescription') || 'Los clips de Twitch se publicarán automáticamente en el canal que elijas.'}
          </p>
          {clipsGuildsError && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-800 dark:text-amber-200">{clipsGuildsError}</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{t('settings.clipsErrorHint') || 'Disconnect and reconnect Discord in Settings, or add the bot to a server you own.'}</p>
              </div>
            </div>
          )}
          {!loadingClipsGuilds && clipsGuilds.length === 0 && !clipsGuildsError && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Server className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">{t('settings.clipsNoServersTitle')}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{t('settings.clipsNoServersHint')}</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { inviteUrl } = await getDiscordInviteUrl();
                      if (inviteUrl) window.open(inviteUrl, '_blank', 'noopener,noreferrer');
                    } catch {
                      // Silently fail - user will see no action
                    }
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4]"
                >
                  <Server className="w-4 h-4" />
                  {t('settings.addBotButton') || t('discord.addBotButton') || 'Add bot to server'}
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('settings.discordServer') || 'Servidor'}
              </label>
              <select
                value={clipsGuildId}
                onChange={(e) => { setClipsGuildId(e.target.value); setClipsChannelId(''); }}
                disabled={loadingClipsGuilds}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
              >
                <option value="">{loadingClipsGuilds ? (t('common.loading') || '...') : (t('settings.selectServer') || 'Seleccionar servidor')}</option>
                {clipsGuilds.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('settings.discordChannel') || 'Canal'}
              </label>
              <select
                value={clipsChannelId}
                onChange={(e) => setClipsChannelId(e.target.value)}
                disabled={!clipsGuildId || loadingClipsChannels}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
              >
                <option value="">{loadingClipsChannels ? (t('common.loading') || '...') : (t('settings.selectChannel') || 'Seleccionar canal')}</option>
                {clipsChannels.map((c) => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleSaveClipsChannel}
              disabled={savingClipsChannel}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 text-sm"
            >
              <Save className="w-4 h-4" />
              {savingClipsChannel ? (t('common.loading') || '...') : (t('common.save') || 'Guardar')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
