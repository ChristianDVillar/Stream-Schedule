/**
 * Public calendar page customization: banner image and position.
 * Shows a live preview of how the shared calendar page will look.
 */
import React, { useState, useEffect } from 'react';
import { Image, Upload, ExternalLink, Calendar, Trash2 } from 'lucide-react';
import { getUploadStats } from '../../utils/uploadHelper';
import { getPublicImageUrl } from '../../utils/supabaseClient';
import { handleUpload } from '../../utils/uploadHelper';
import { devCatchLog } from '../../utils/devCatchLog';
import { getPublicStreamerShareUrl, getPublicShareLinkQueryString } from '../../shared/config/publicUrls';
const BANNER_POSITIONS = [
  { id: 'top', labelKey: 'publicPage.positionTop', descKey: 'publicPage.positionTopDesc' },
  { id: 'above-avatar', labelKey: 'publicPage.positionAboveAvatar', descKey: 'publicPage.positionAboveAvatarDesc' },
  { id: 'above-schedule', labelKey: 'publicPage.positionAboveSchedule', descKey: 'publicPage.positionAboveScheduleDesc' },
  { id: 'center', labelKey: 'publicPage.positionCenter', descKey: 'publicPage.positionCenterDesc' },
  { id: 'bottom', labelKey: 'publicPage.positionBottom', descKey: 'publicPage.positionBottomDesc' },
  { id: 'background', labelKey: 'publicPage.positionBackground', descKey: 'publicPage.positionBackgroundDesc' },
];

/**
 * Mini preview of the public page with banner at chosen position.
 * Simulates the layout: header area, avatar, content blocks, schedule, footer.
 */
function PublicPagePreview({ bannerUrl, position, username }) {
  const renderBanner = (where) => {
    if (!bannerUrl || position !== where) return null;
    return (
      <div className="w-full rounded overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0" style={{ minHeight: 28 }}>
        <img src={bannerUrl} alt="" className="w-full h-7 object-cover object-center" onError={(e) => { e.target.style.display = 'none'; }} />
      </div>
    );
  };

  const isBackground = position === 'background' && bannerUrl;

  return (
    <div className={`rounded-lg border-2 border-gray-300 dark:border-gray-600 overflow-hidden shadow-inner ${isBackground ? 'relative' : 'bg-gray-100 dark:bg-gray-800'}`}>
      {isBackground && (
        <div className="absolute inset-0 overflow-hidden rounded-lg z-0">
          <img src={bannerUrl} alt="" className="w-full h-full object-cover object-center opacity-60" />
          <div className="absolute inset-0 bg-white/40 dark:bg-gray-900/50" />
        </div>
      )}
      <div className={`text-[10px] font-medium text-gray-500 dark:text-gray-400 px-2 py-1 border-b border-gray-300 dark:border-gray-600 ${isBackground ? 'relative z-10 bg-gray-200/80 dark:bg-gray-700/80' : 'bg-gray-200 dark:bg-gray-700'}`}>
        {username ? `/streamer/${encodeURIComponent(username)}?${getPublicShareLinkQueryString()}` : 'Vista previa'}
      </div>
      <div className={`p-2 space-y-1 min-h-[140px] flex flex-col ${isBackground ? 'relative z-10' : ''}`}>
        {renderBanner('top')}
        <div className="flex gap-1.5 items-center flex-shrink-0">
          <div className="w-6 h-6 rounded-full bg-accent-subtle flex items-center justify-center text-[10px] font-bold text-[var(--accent)] flex-shrink-0">
            {(username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[80px]">{username || 'Username'}</div>
            <div className="text-[9px] text-gray-500 dark:text-gray-400">Upcoming streams</div>
          </div>
        </div>
        {renderBanner('above-avatar')}
        <div className="h-3 rounded bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center gap-1 px-1 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
          <span className="text-[9px] text-red-700 dark:text-red-300">LIVE</span>
        </div>
        {renderBanner('above-schedule')}
        {position === 'center' && renderBanner('center')}
        <div className="flex items-center gap-1 text-[10px] text-gray-700 dark:text-gray-300 flex-shrink-0">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          Schedule
        </div>
        <div className="grid grid-cols-3 gap-0.5 flex-1 min-h-0">
          {['Mon', 'Tue', 'Wed'].map((d) => (
            <div key={d} className="rounded bg-white dark:bg-gray-700 p-0.5 text-[8px] text-center font-medium text-gray-600 dark:text-gray-400">
              {d}
            </div>
          ))}
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded bg-white dark:bg-gray-700 p-0.5 min-h-[20px]" />
          ))}
        </div>
        {renderBanner('bottom')}
        <div className="text-[8px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-1 flex-shrink-0">
          Powered by Streamer Scheduler
        </div>
      </div>
    </div>
  );
}

export default function SettingsPublicPageTab({
  user,
  token,
  publicPageData,
  setPublicPageData,
  loading,
  onSave,
  t,
}) {
  const [mediaList, setMediaList] = useState([]);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const stats = await getUploadStats(user.id.toString());
        const uploads = (stats?.uploads || []).filter((u) => u?.bucket === 'images' && u?.file_path);
        const list = [];
        for (const upload of uploads) {
          try {
            const url = getPublicImageUrl(upload.file_path);
            if (url) list.push({ url, file_path: upload.file_path });
          } catch (e) {
            devCatchLog('SettingsPublicPageTab.getPublicImageUrl', e);
          }
        }
        if (!cancelled) setMediaList(list);
      } catch (e) {
        devCatchLog('SettingsPublicPageTab.uploadStats', e);
        if (!cancelled) setMediaList([]);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleBannerUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';
    setUploading(true);
    const { url } = await handleUpload({ file, bucket: 'images', userId: user?.id });
    setUploading(false);
    if (url) setPublicPageData((prev) => ({ ...prev, publicPageBannerUrl: url }));
  };

  const handlePickFromMedia = (url) => {
    setPublicPageData((prev) => ({ ...prev, publicPageBannerUrl: url }));
    setMediaPickerOpen(false);
  };

  const handleRemoveBanner = () => {
    setPublicPageData((prev) => ({ ...prev, publicPageBannerUrl: '' }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Image className="w-5 h-5 text-[var(--accent)]" />
          {t('publicPage.title') || 'Editar página del calendario compartido'}
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
          {t('publicPage.description') || 'Personaliza la página que compartes con tu audiencia. Añade un banner o imagen y elige dónde mostrarla.'}
        </p>
      </div>

      {/* Link to public page */}
      {user?.username && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-5 sm:p-6">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
            <ExternalLink className="w-4 h-4 text-[var(--accent)]" />
            {t('publicPage.yourPage') || 'Tu página pública'}
          </h4>
          <a
            href={getPublicStreamerShareUrl(user.username)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--accent)] hover:underline break-all"
          >
            {getPublicStreamerShareUrl(user.username)}
          </a>
        </div>
      )}

      {/* Banner image */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50 p-5 sm:p-6">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('publicPage.bannerTitle') || 'Imagen o banner'}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('publicPage.bannerHint') || 'Sube una imagen o pega una URL. Recomendado: 1200×300 px o similar para banners.'}
        </p>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              value={publicPageData.publicPageBannerUrl || ''}
              onChange={(e) => setPublicPageData((prev) => ({ ...prev, publicPageBannerUrl: e.target.value }))}
              placeholder="https://ejemplo.com/banner.jpg"
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 text-sm"
            />
            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 cursor-pointer disabled:opacity-50">
              <Upload className="w-4 h-4" />
              {uploading ? (t('common.loading') || 'Subiendo…') : (t('publicPage.upload') || 'Subir')}
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploading} />
            </label>
            <button
              type="button"
              onClick={() => setMediaPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <Image className="w-4 h-4" />
              {t('publicPage.chooseFromMedia') || 'Elegir de Media'}
            </button>
            {publicPageData.publicPageBannerUrl && (
              <button
                type="button"
                onClick={handleRemoveBanner}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
                {t('publicPage.removeBanner') || 'Quitar'}
              </button>
            )}
          </div>
          {mediaPickerOpen && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('publicPage.selectImage') || 'Selecciona una imagen:'}</p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {mediaList.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('publicPage.noImages') || 'No hay imágenes en Media. Sube primero en la página Media.'}</p>
                ) : (
                  mediaList.map(({ url }) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => handlePickFromMedia(url)}
                      className="w-14 h-14 rounded border-2 border-gray-200 dark:border-gray-600 overflow-hidden hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))
                )}
              </div>
              <button type="button" onClick={() => setMediaPickerOpen(false)} className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                {t('common.close') || 'Cerrar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Position */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50 p-5 sm:p-6">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('publicPage.positionTitle') || 'Posición del banner'}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('publicPage.positionHint') || 'Elige dónde aparecerá la imagen en la página.'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BANNER_POSITIONS.map((pos) => (
            <button
              key={pos.id}
              type="button"
              onClick={() => setPublicPageData((prev) => ({ ...prev, publicPageBannerPosition: pos.id }))}
              className={`px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                publicPageData.publicPageBannerPosition === pos.id
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              {t(pos.labelKey) || pos.id}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-5 sm:p-6">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--accent)]" />
          {t('publicPage.previewTitle') || 'Vista previa'}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('publicPage.previewHint') || 'Así se verá tu página compartida. La imagen aparecerá en la posición seleccionada.'}
        </p>
        <div className="flex justify-center">
          <div className="w-full max-w-[220px]">
            <PublicPagePreview
              bannerUrl={publicPageData.publicPageBannerUrl || null}
              position={publicPageData.publicPageBannerPosition || 'top'}
              username={user?.username}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
