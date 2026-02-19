import React, { useState } from 'react';
import { Palette, Image as ImageIcon, Upload, X, Plus, Trash2 } from 'lucide-react';
import { setPlatformColors, resetPlatformColors, PLATFORM_IDS, DEFAULT_PLATFORM_COLORS } from '../../utils/platformColors';
import { BANNER_CONFIG_KEY, getBannersFromEnv } from '../../components/HeaderBanners';
import { ACCENT_COLORS, COLOR_PARTS, getCustomColorConfig, setCustomColorConfig, applyCustomColors } from '../../utils/themeUtils';
import toast from 'react-hot-toast';

const PRESET_COLOR_OPTIONS = [
  { id: 'blue', name: 'Blue' },
  { id: 'purple', name: 'Purple' },
  { id: 'green', name: 'Green' },
  { id: 'red', name: 'Red' },
  { id: 'orange', name: 'Orange' },
];

/** Fallbacks when translation key is missing (never show raw keys to the user). */
const FALLBACKS = {
  appearanceSettings: { en: 'Appearance', es: 'Ajustes de apariencia' },
  theme: { en: 'Theme', es: 'Tema' },
  compactMode: { en: 'Compact Mode', es: 'Modo compacto' },
  compactModeDesc: { en: 'Reduce spacing for more content', es: 'Menos espacio para ver más contenido' },
  customColors: { en: 'Custom colors', es: 'Colores personalizados' },
  customColorsHelp: { en: 'Add your own colors with the color wheel and choose which part of the app uses each color.', es: 'Añade colores con la rueda y elige qué parte de la app usa cada color.' },
  yourPalette: { en: 'Your color palette', es: 'Tu paleta de colores' },
  colorName: { en: 'Name', es: 'Nombre' },
  addColor: { en: 'Add color', es: 'Añadir color' },
  pickColor: { en: 'Pick color', es: 'Elegir color' },
  newColorName: { en: 'New color name', es: 'Nombre del nuevo color' },
  applyToParts: { en: 'Apply color to each part', es: 'Aplicar color a cada parte' },
  resetAssignments: { en: 'Reset all to default', es: 'Restablecer todo por defecto' },
  colorAdded: { en: 'Color added', es: 'Color añadido' },
  colorRemoved: { en: 'Color removed', es: 'Color eliminado' },
  assignmentsReset: { en: 'Assignments reset to default', es: 'Asignaciones restablecidas' },
  partAccent: { en: 'Accent / Primary', es: 'Acento / Principal' },
  partAccentDesc: { en: 'Main buttons, toggles, and primary actions', es: 'Botones principales, interruptores y acciones primarias' },
  partLinks: { en: 'Links', es: 'Enlaces' },
  partLinksDesc: { en: 'Text links and navigation links', es: 'Enlaces de texto y navegación' },
  partSidebar: { en: 'Sidebar', es: 'Barra lateral' },
  partSidebarDesc: { en: 'Active item in sidebar and settings', es: 'Elemento activo en la barra lateral y en ajustes' },
  partHeader: { en: 'Header', es: 'Cabecera' },
  partHeaderDesc: { en: 'Top bar accent (where used)', es: 'Acento de la barra superior' },
  partFocusRing: { en: 'Focus ring', es: 'Anillo de foco' },
  partFocusRingDesc: { en: 'Keyboard focus outline', es: 'Borde de foco del teclado' },
  partCalendarEvent: { en: 'Calendar events', es: 'Eventos del calendario' },
  partCalendarEventDesc: { en: 'Events in the schedule calendar', es: 'Eventos en el calendario de la agenda' },
};

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
  customColorConfig,
  setCustomColorConfigState,
  onCustomColorsApply,
  t,
  language = 'en',
}) {
  const config = customColorConfig || getCustomColorConfig();
  const setConfig = (next) => {
    setCustomColorConfigState?.(next);
    setCustomColorConfig(next);
    onCustomColorsApply?.(next);
  };

  const isEs = language === 'es';
  const tt = (key, fallbackKey) => {
    const v = t(key);
    if (v && typeof v === 'string' && v !== key) return v;
    const fk = fallbackKey || key.split('.').pop();
    const fallback = FALLBACKS[fk];
    return (fallback && (isEs ? fallback.es : fallback.en)) || key;
  };

  const PART_FALLBACK = { accent: 'partAccent', links: 'partLinks', sidebar: 'partSidebar', header: 'partHeader', focusRing: 'partFocusRing', calendarEvent: 'partCalendarEvent' };
  const partLabel = (part) => tt(part.labelKey, PART_FALLBACK[part.id]);
  const partDesc = (part) => tt(part.descriptionKey, PART_FALLBACK[part.id] + 'Desc');

  const colorOptions = [
    ...PRESET_COLOR_OPTIONS,
    ...(config.swatches || []).map((s, i) => ({
      id: s.id,
      name: s.name || (isEs ? `Color ${i + 1}` : `Color ${i + 1}`),
    })),
  ];
  const [newColorHex, setNewColorHex] = useState('#3b82f6');
  const [newColorName, setNewColorName] = useState('');

  const handleAddColor = () => {
    const id = 'custom-' + Math.random().toString(36).slice(2, 11);
    setConfig({
      ...config,
      swatches: [...(config.swatches || []), { id, hex: newColorHex, name: newColorName.trim() || undefined }],
    });
    setNewColorHex('#3b82f6');
    setNewColorName('');
    toast.success(tt('appearance.colorAdded', 'colorAdded'));
  };

  const handleRemoveColor = (swatchId) => {
    const nextSwatches = (config.swatches || []).filter((s) => s.id !== swatchId);
    const assignments = { ...(config.assignments || {}) };
    COLOR_PARTS.forEach((p) => {
      if (assignments[p.id] === swatchId) assignments[p.id] = 'blue';
    });
    setConfig({ ...config, swatches: nextSwatches, assignments });
    toast.success(tt('appearance.colorRemoved', 'colorRemoved'));
  };

  const handlePartAssignment = (partId, colorId) => {
    setConfig({
      ...config,
      assignments: { ...(config.assignments || {}), [partId]: colorId },
    });
  };

  const handleResetPartColors = () => {
    setConfig({
      ...config,
      assignments: { accent: 'blue', links: 'blue', sidebar: 'blue', header: 'blue', focusRing: 'blue', calendarEvent: 'blue' },
    });
    toast.success(tt('appearance.assignmentsReset', 'assignmentsReset'));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        {tt('settings.appearanceSettings', 'appearanceSettings')}
      </h3>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">{tt('settings.theme', 'theme')}</h4>
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
            {accentColors.map((color) => {
              const isSelected = (config.assignments?.accent || themeSettings.accentColor) === color.id;
              return (
                <button
                  key={color.id}
                  onClick={() => setThemeSettings(prev => ({ ...prev, accentColor: color.id }))}
                  className={`w-10 h-10 rounded-full ${color.color} border-2 transition-all ${
                    isSelected ? 'border-accent ring-2 ring-accent ring-offset-2 dark:ring-offset-gray-800 scale-110' : 'border-white dark:border-gray-700 hover:scale-105'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Custom colors: palette + assign to parts */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 space-y-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Palette className="w-4 h-4 text-accent" />
            {tt('appearance.customColors', 'customColors')}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tt('appearance.customColorsHelp', 'customColorsHelp')}
          </p>

          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{tt('appearance.yourPalette', 'yourPalette')}</p>
            <div className="flex flex-wrap gap-3 items-center">
              {PRESET_COLOR_OPTIONS.map((opt) => (
                <div key={opt.id} className="flex items-center gap-1.5">
                  <div
                    className="w-9 h-9 rounded-full border-2 border-white dark:border-gray-700 shadow shrink-0"
                    style={{ backgroundColor: ACCENT_COLORS[opt.id]?.hex || '#3b82f6' }}
                    title={opt.name}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400 hidden sm:inline">{opt.name}</span>
                </div>
              ))}
              {(config.swatches || []).map((swatch) => (
                <div key={swatch.id} className="flex items-center gap-1.5 group">
                  <input
                    type="color"
                    value={swatch.hex}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        swatches: (config.swatches || []).map((s) => (s.id === swatch.id ? { ...s, hex: e.target.value } : s)),
                      });
                    }}
                    className="w-9 h-9 rounded-full border-2 border-white dark:border-gray-700 cursor-pointer shadow shrink-0"
                    title={swatch.name || swatch.hex}
                  />
                  <input
                    type="text"
                    value={swatch.name || ''}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        swatches: (config.swatches || []).map((s) => (s.id === swatch.id ? { ...s, name: e.target.value.trim() || undefined } : s)),
                      });
                    }}
                    placeholder={tt('appearance.colorName', 'colorName')}
                    className="w-20 text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(swatch.id)}
                    className="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title={t('common.delete') || 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-9 h-9 rounded-full border-2 border-gray-300 dark:border-gray-600 cursor-pointer shrink-0"
                  title={tt('appearance.pickColor', 'pickColor')}
                />
                <input
                  type="text"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  placeholder={tt('appearance.newColorName', 'newColorName')}
                  className="w-28 text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={handleAddColor}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-accent text-accent rounded-lg hover:bg-accent hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {tt('appearance.addColor', 'addColor')}
                </button>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">{tt('appearance.applyToParts', 'applyToParts')}</p>
            <div className="space-y-2">
              {COLOR_PARTS.map((part) => (
                <div key={part.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-gray-200 dark:border-gray-600 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {partLabel(part)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {partDesc(part)}
                    </p>
                  </div>
                  <select
                    value={config.assignments?.[part.id] || 'blue'}
                    onChange={(e) => handlePartAssignment(part.id, e.target.value)}
                    className="text-sm px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[120px]"
                  >
                    {colorOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleResetPartColors}
              className="mt-3 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {tt('appearance.resetAssignments', 'resetAssignments')}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-3">
            <Palette className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{tt('settings.compactMode', 'compactMode')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{tt('settings.compactModeDesc', 'compactModeDesc')}</p>
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
