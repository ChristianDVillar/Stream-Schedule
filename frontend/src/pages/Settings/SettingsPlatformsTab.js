import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const PLATFORMS = [
  { key: 'google', label: 'Google' },
  { key: 'twitch', label: 'Twitch' },
  { key: 'discord', label: 'Discord' },
  { key: 'twitter', label: 'X (Twitter)' },
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
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        {t('settings.platformsConnectTitle') || 'Connect platforms'}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('settings.connectedAccountsDescription') || 'Link sign-in methods to this account. Connect each platform to use it for login; if already connected, it will show as connected.'}
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
            return (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                  <div className="flex items-center gap-2 min-w-0 flex-1">
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
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait"
                  >
                    {connectingKey === key ? (t('common.loading') || '...') : (t('settings.connect') || 'Connect')}
                  </button>
                )}
                {disconnect && connected && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(t('settings.disconnectConfirm') || 'Disconnect this platform? You can reconnect later.')) return;
                      setConnectedAccounts(prev => (prev ? { ...prev, [key]: false } : prev));
                      try {
                        await onDisconnect(key);
                      } catch (err) {
                        if (token) fetchConnectedAccounts();
                      }
                    }}
                    disabled={disconnectingKey !== null}
                    className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                  >
                    {disconnectingKey === key ? (t('common.loading') || '...') : (t('settings.disconnect') || 'Disconnect')}
                  </button>
                )}
                {key === 'email' && !connected && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('settings.setPasswordInSecurity') || 'Set a password in Security tab.'}
                  </p>
                )}
                {key === 'twitter' && connected && connectedAccounts.twitterTokenMissing && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex-1 basis-full">
                    {t('settings.twitterReconnectToPublish') || 'Access token missing. Disconnect and reconnect X (Twitter) to enable publishing.'}
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
