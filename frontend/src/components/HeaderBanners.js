/**
 * Header banners: show configurable banners in the header area (below Streamer Scheduler / User / EN/ES / Logout).
 * Config: from localStorage key header_banners_config first, then REACT_APP_HEADER_BANNERS env.
 * Each item: { id?, text, textEs?, url?, style?, dismissible?, imageUrl? }
 */
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const STORAGE_KEY = 'header_banners_dismissed';
export const BANNER_CONFIG_KEY = 'header_banners_config';

export function getBannersFromEnv() {
  try {
    const raw = process.env.REACT_APP_HEADER_BANNERS;
    if (!raw || typeof raw !== 'string') return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function getBannersConfig() {
  try {
    const fromStorage = localStorage.getItem(BANNER_CONFIG_KEY);
    if (fromStorage != null) {
      const parsed = JSON.parse(fromStorage);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return getBannersFromEnv();
}

const styleClasses = {
  info: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700',
  warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700',
  success: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
  neutral: 'bg-gray-100 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600',
};

function SingleBanner({ banner, onDismiss }) {
  const { language, t } = useLanguage();
  const text = language === 'es' && banner.textEs ? banner.textEs : (banner.text || '');
  const style = styleClasses[banner.style] || styleClasses.neutral;
  const id = banner.id || `banner-${(banner.text || '').slice(0, 20)}`;

  const content = (
    <span className="flex-1 min-w-0 truncate sm:whitespace-normal text-sm font-medium">
      {text}
    </span>
  );

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${style}`}
      role="banner"
    >
      {banner.imageUrl && (
        <img
          src={banner.imageUrl}
          alt=""
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
      {banner.url ? (
        <a
          href={banner.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 truncate sm:whitespace-normal text-sm font-medium underline hover:opacity-90 py-0.5"
        >
          {text}
        </a>
      ) : (
        content
      )}
      {banner.dismissible && (
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="flex-shrink-0 p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 dark:focus:ring-gray-400"
          aria-label={t ? t('common.close') : 'Close'}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function HeaderBanners() {
  const [banners, setBanners] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : [];
    } catch (_) {
      return [];
    }
  });

  const refreshBanners = () => setBanners(getBannersConfig());

  useEffect(() => {
    refreshBanners();
  }, []);

  useEffect(() => {
    const handler = () => refreshBanners();
    window.addEventListener('headerBannersUpdated', handler);
    return () => window.removeEventListener('headerBannersUpdated', handler);
  }, []);

  const persistDismissed = (next) => {
    setDismissed(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
  };

  const handleDismiss = (id) => {
    persistDismissed([...dismissed, id]);
  };

  const visible = banners.filter((b) => {
    const id = b.id || `banner-${(b.text || '').slice(0, 20)}`;
    return !dismissed.includes(id);
  });

  if (visible.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-1 pb-3 flex flex-col gap-2">
      {visible.map((banner, index) => (
        <SingleBanner
          key={banner.id || index}
          banner={banner}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}
