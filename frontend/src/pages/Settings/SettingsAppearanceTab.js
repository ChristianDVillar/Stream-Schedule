import React from 'react';
import { Palette, Image as ImageIcon, Upload, X } from 'lucide-react';
import { setPlatformColors, resetPlatformColors, PLATFORM_IDS, DEFAULT_PLATFORM_COLORS } from '../../utils/platformColors';
import { BANNER_CONFIG_KEY, getBannersFromEnv } from '../../components/HeaderBanners';
import toast from 'react-hot-toast';

export default function SettingsAppearanceTab({
  themeSettings,
  setThemeSettings,
  themes,
  accentColors,
  platformColors,
  setPlatformColorsState,
  bannerConfig,
  setBannerConfig,
  bannerMediaPickerFor,
  setBannerMediaPickerFor,
  bannerMediaList,
  bannerUploadingFor,
  setBannerUploadingFor,
  bannerImageInputRef,
  user,
  onBannerImageUpload,
  t,
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Appearance Settings</h3>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Theme</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setThemeSettings(prev => ({ ...prev, theme: theme.id }))}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  themeSettings.theme === theme.id ? 'border-accent bg-gray-50 dark:bg-gray-800' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <div className={`w-full h-16 rounded ${theme.preview} mb-2`} />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{theme.name}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Accent Color</h4>
          <div className="flex space-x-3">
            {accentColors.map((color) => (
              <button
                key={color.id}
                onClick={() => setThemeSettings(prev => ({ ...prev, accentColor: color.id }))}
                className={`w-10 h-10 rounded-full ${color.color} border-2 transition-all ${
                  themeSettings.accentColor === color.id ? 'border-accent ring-2 ring-accent ring-offset-2 dark:ring-offset-gray-800 scale-110' : 'border-white dark:border-gray-700 hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-3">
            <Palette className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Compact Mode</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Reduce spacing for more content</p>
            </div>
          </div>
          <button
            onClick={() => setThemeSettings(prev => ({ ...prev, compactMode: !prev.compactMode }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${themeSettings.compactMode ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${themeSettings.compactMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('settings.platformColors') || 'Platform colors'}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('settings.platformColorsHelp') || 'Colors used to identify each platform in the calendar and content list.'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {PLATFORM_IDS.map((id) => (
              <div key={id} className="flex items-center gap-2">
                <input
                  type="color"
                  value={platformColors[id] || DEFAULT_PLATFORM_COLORS[id]}
                  onChange={(e) => {
                    const next = setPlatformColors({ [id]: e.target.value });
                    setPlatformColorsState(next);
                  }}
                  className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{id}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setPlatformColorsState(resetPlatformColors());
              toast.success(t('settings.platformColorsReset') || 'Platform colors reset to defaults');
            }}
            className="mt-3 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('settings.resetPlatformColors') || 'Reset to defaults'}
          </button>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('settings.headerBanner') || 'Header banner'}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('settings.headerBannerHelp') || 'Banner shown below the top bar. Optional image URL. Leave text empty to hide.'}</p>
          <div className="space-y-4">
            {bannerConfig.map((banner, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.banner') || 'Banner'} {bannerConfig.length > 1 ? index + 1 : ''}</span>
                  {bannerConfig.length > 1 && (
                    <button type="button" onClick={() => setBannerConfig(prev => prev.filter((_, i) => i !== index))} className="text-sm text-red-600 hover:text-red-700 dark:text-red-400">
                      {t('common.delete') || 'Delete'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('settings.bannerTextEn') || 'Text (EN)'}</label>
                    <input
                      type="text"
                      value={banner.text || ''}
                      onChange={(e) => setBannerConfig(prev => prev.map((b, i) => i === index ? { ...b, text: e.target.value } : b))}
                      placeholder="Welcome!"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('settings.bannerTextEs') || 'Text (ES)'}</label>
                    <input
                      type="text"
                      value={banner.textEs || ''}
                      onChange={(e) => setBannerConfig(prev => prev.map((b, i) => i === index ? { ...b, textEs: e.target.value } : b))}
                      placeholder="¡Bienvenido!"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('settings.bannerImageUrl') || 'Image (optional)'}</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      type="url"
                      value={banner.imageUrl || ''}
                      onChange={(e) => setBannerConfig(prev => prev.map((b, i) => i === index ? { ...b, imageUrl: e.target.value || undefined } : b))}
                      placeholder="https://... or choose below"
                      className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                    <button type="button" onClick={() => setBannerMediaPickerFor(index)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                      <ImageIcon className="w-4 h-4" />
                      {t('settings.bannerChooseFromMedia') || 'From Media'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBannerUploadingFor(index); bannerImageInputRef.current?.click(); }}
                      disabled={bannerUploadingFor !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                    >
                      {bannerUploadingFor === index ? <span className="animate-pulse">{t('media.uploading') || 'Uploading...'}</span> : <><Upload className="w-4 h-4" />{t('settings.bannerUploadImage') || 'Upload'}</>}
                    </button>
                  </div>
                  <input
                    ref={bannerImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      const idx = bannerUploadingFor;
                      if (!file || idx == null) return;
                      onBannerImageUpload(file, idx);
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('settings.bannerLinkUrl') || 'Link URL (optional)'}</label>
                    <input type="url" value={banner.url || ''} onChange={(e) => setBannerConfig(prev => prev.map((b, i) => i === index ? { ...b, url: e.target.value || undefined } : b))} placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('settings.bannerStyle') || 'Style'}</label>
                    <select value={banner.style || 'neutral'} onChange={(e) => setBannerConfig(prev => prev.map((b, i) => i === index ? { ...b, style: e.target.value } : b))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm">
                      <option value="info">Info (blue)</option>
                      <option value="success">Success (green)</option>
                      <option value="warning">Warning (amber)</option>
                      <option value="neutral">Neutral (gray)</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!banner.dismissible} onChange={(e) => setBannerConfig(prev => prev.map((b, i) => i === index ? { ...b, dismissible: e.target.checked } : b))} className="rounded border-gray-300 dark:border-gray-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('settings.bannerDismissible') || 'Users can close this banner'}</span>
                </label>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setBannerConfig(prev => [...prev, { text: '', style: 'neutral', dismissible: true }])} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                + {t('settings.addBanner') || 'Add banner'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const payload = bannerConfig.map(b => ({
                    id: b.id || `banner-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    text: (b.text || '').trim(),
                    textEs: (b.textEs || '').trim() || undefined,
                    url: (b.url || '').trim() || undefined,
                    imageUrl: (b.imageUrl || '').trim() || undefined,
                    style: b.style || 'neutral',
                    dismissible: !!b.dismissible
                  })).filter(b => b.text);
                  localStorage.setItem(BANNER_CONFIG_KEY, JSON.stringify(payload));
                  setBannerConfig(payload.length ? payload : [{ text: '', style: 'neutral', dismissible: true }]);
                  window.dispatchEvent(new CustomEvent('headerBannersUpdated'));
                  toast.success(t('settings.bannerSaved') || 'Banner saved');
                }}
                className="px-3 py-2 text-sm bg-accent text-white rounded-lg hover:opacity-90"
              >
                {t('common.save') || 'Save'} {t('settings.banner') || 'banner'}
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(BANNER_CONFIG_KEY);
                  setBannerConfig(getBannersFromEnv().length ? getBannersFromEnv() : []);
                  window.dispatchEvent(new CustomEvent('headerBannersUpdated'));
                  toast.success(t('settings.bannerReset') || 'Banner reset to default');
                }}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {t('settings.resetToDefault') || 'Reset to default'}
              </button>
            </div>
          </div>
        </div>

        {bannerMediaPickerFor !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setBannerMediaPickerFor(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('settings.bannerChooseFromMedia') || 'Choose from Media'}</h4>
                <button type="button" onClick={() => setBannerMediaPickerFor(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {bannerMediaList.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.bannerNoImagesInMedia') || 'No images in Media. Upload images in the Media section first.'}</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {bannerMediaList.map((item, i) => (
                      <button key={i} type="button" onClick={() => { setBannerConfig(prev => prev.map((b, j) => j === bannerMediaPickerFor ? { ...b, imageUrl: item.url } : b)); setBannerMediaPickerFor(null); }} className="aspect-square rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-accent overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
