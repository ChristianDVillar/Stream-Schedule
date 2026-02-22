import React from 'react';
import { Twitch } from 'lucide-react';
import { DISCORD_ICON_URL } from '../../constants/platforms';

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
  email: MailIcon,
};

const PLATFORMS = [
  { key: 'google', label: 'Google' },
  { key: 'twitch', label: 'Twitch' },
  { key: 'discord', label: 'Discord' },
  { key: 'twitter', label: 'X (Twitter)' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'email', labelKey: 'settings.emailPassword', noConnect: true },
];

export default function SettingsPlatformsTab({
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
}) {
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
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t('settings.couldNotLoadAccounts') || 'Could not load connected accounts.'}</p>
      )}
    </div>
  );
}
