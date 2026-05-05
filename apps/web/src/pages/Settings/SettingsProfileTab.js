import React from 'react';
import { Camera } from 'lucide-react';
import { useStreamMode } from '../../contexts/StreamModeContext';

const timezones = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
  'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'
];

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' }
];

const MASK = '••••••••';

export default function SettingsProfileTab({
  user,
  profileData,
  setProfileData,
  errors,
  profilePhotoUploading,
  onProfilePhotoSelect,
  onProfilePhotoRemove,
  t,
}) {
  const { streamMode } = useStreamMode();

  return (
    <div className="space-y-6 min-w-0">
      {streamMode && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-800 dark:text-amber-200 text-sm">
          {t('common.streamModeProfileHint') || 'Stream mode is on — email, username and other sensitive fields are hidden. Turn it off in the header to edit.'}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-shrink-0">
          {profileData.profileImageUrl ? (
            <img
              src={profileData.profileImageUrl}
              alt=""
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {profileData.username?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <label className="absolute bottom-0 right-0 bg-white dark:bg-gray-700 p-2 rounded-full shadow cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={profilePhotoUploading}
              onChange={onProfilePhotoSelect}
            />
            <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.profilePhoto')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.profilePhotoHint')}</p>
          {profilePhotoUploading && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{t('settings.uploading')}</p>}
          {profileData.profileImageUrl && (
            <button
              type="button"
              onClick={onProfilePhotoRemove}
              className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
            >
              {t('settings.removePhoto')}
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Profile Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              id="username"
              type="text"
              value={streamMode ? MASK : profileData.username}
              onChange={(e) => !streamMode && setProfileData(prev => ({ ...prev, username: e.target.value }))}
              readOnly={streamMode}
              className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.username ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } ${streamMode ? 'opacity-80' : ''}`}
            />
            {streamMode && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</p>}
            {!streamMode && errors.username && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={streamMode ? MASK : profileData.email}
              onChange={(e) => !streamMode && setProfileData(prev => ({ ...prev, email: e.target.value }))}
              readOnly={streamMode}
              className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } ${streamMode ? 'opacity-80' : ''}`}
            />
            {streamMode && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</p>}
            {!streamMode && errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
          <textarea
            id="bio"
            rows={4}
            value={profileData.bio}
            onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Tell us about yourself..."
          />
        </div>

        <div className="mt-6">
          <label htmlFor="merchandisingLink" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('profile.merchandisingLink') || 'Link de Página de Merchandising'}
          </label>
          <input
            id="merchandisingLink"
            type="url"
            value={streamMode && profileData.merchandisingLink ? MASK : profileData.merchandisingLink}
            onChange={(e) => !streamMode && setProfileData(prev => ({ ...prev, merchandisingLink: e.target.value }))}
            readOnly={streamMode}
            className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${streamMode ? 'opacity-80' : ''}`}
            placeholder="https://ejemplo.com/tienda"
          />
          {streamMode && profileData.merchandisingLink && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</p>}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('profile.merchandisingLinkHint') || 'Agrega el link de tu página de merchandising'}</p>
          {profileData.merchandisingLink && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
              {t('profile.merchandisingDragHint') || 'Arrastra el botón de tienda en la pantalla para moverlo a donde prefieras.'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
            <select
              id="timezone"
              value={profileData.timezone}
              onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.language')}</label>
            <select
              id="language"
              value={profileData.language}
              onChange={(e) => setProfileData(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('settings.streamGoal') || 'Stream goal (!goal)'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('settings.streamGoalHint') || 'Set a follower or sub goal for the !goal chat command. Connect Twitch in Integrations to show current count.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="streamGoalType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.streamGoalType') || 'Goal type'}
              </label>
              <select
                id="streamGoalType"
                value={profileData.streamGoalType || ''}
                onChange={(e) => setProfileData(prev => ({ ...prev, streamGoalType: e.target.value || null }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">{t('settings.noGoal') || 'No goal'}</option>
                <option value="followers">{t('settings.goalFollowers') || 'Followers'}</option>
                <option value="subs">{t('settings.goalSubs') || 'Subs'}</option>
              </select>
            </div>
            <div>
              <label htmlFor="streamGoalTarget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.streamGoalTarget') || 'Target'}
              </label>
              <input
                id="streamGoalTarget"
                type="number"
                min={1}
                value={profileData.streamGoalTarget === '' || profileData.streamGoalTarget == null ? '' : profileData.streamGoalTarget}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setProfileData(prev => ({ ...prev, streamGoalTarget: v === '' ? '' : (parseInt(v, 10) || '') }));
                }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="discordAnnounceWebhookUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.discordAnnounceWebhook') || 'Discord announce webhook'}
            </label>
            <input
              id="discordAnnounceWebhookUrl"
              type="url"
              value={streamMode && profileData.discordAnnounceWebhookUrl ? MASK : (profileData.discordAnnounceWebhookUrl || '')}
              onChange={(e) => !streamMode && setProfileData(prev => ({ ...prev, discordAnnounceWebhookUrl: e.target.value.trim() || '' }))}
              readOnly={streamMode}
              className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${streamMode ? 'opacity-80' : ''}`}
              placeholder="https://discord.com/api/webhooks/..."
            />
            {streamMode && profileData.discordAnnounceWebhookUrl && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.discordAnnounceWebhookHint') || 'When you call "Stream start" webhook (or go live), we post a message to this Discord channel.'}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('settings.dashboardVisibility') || 'Qué ver en el dashboard'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('settings.dashboardVisibilityDescription') || 'Activa o desactiva qué datos de Twitch se muestran en el dashboard (suscripciones, bits, donaciones).'}
          </p>
          <div className="space-y-4">
            {[
              { key: 'dashboardShowTwitchSubs', label: t('settings.dashboardTwitchSubs') || 'Suscripciones de Twitch', desc: t('settings.dashboardTwitchSubsDesc') || 'Mostrar suscripciones al canal' },
              { key: 'dashboardShowTwitchBits', label: t('settings.dashboardTwitchBits') || 'Bits de Twitch', desc: t('settings.dashboardTwitchBitsDesc') || 'Mostrar bits/cheers recibidos' },
              { key: 'dashboardShowTwitchDonations', label: t('settings.dashboardTwitchDonations') || 'Donaciones de Twitch', desc: t('settings.dashboardTwitchDonationsDesc') || 'Mostrar donaciones (si están conectadas)' }
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profileData[key]}
                  onClick={() => setProfileData(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    profileData[key] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition translate-x-1 ${
                      profileData[key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
