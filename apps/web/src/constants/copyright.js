/**
 * Copyright strings (keep in sync with apps/api/src/constants/copyright.js).
 * Used for HTML meta, runtime attribution, and UI fallbacks.
 */

export const COPYRIGHT_BRAND_NAME = 'Dakinis Systems';
export const COPYRIGHT_LEGAL_HOLDER = 'Christian David Villar Colodro';
export const COPYRIGHT_YEAR_START = 2024;

/**
 * Display year for footers (© YYYY); same rule as backend year span end.
 */
export function getCopyrightYearEnd() {
  return Math.max(COPYRIGHT_YEAR_START, new Date().getFullYear());
}

/** @type {{ year: number; text: string } | null} */
let noticeCache = null;

/**
 * Full English copyright line for meta tags and diagnostics.
 * Cached per year so repeated calls stay cheap if usage grows.
 */
export function dakinisCopyrightNotice() {
  const end = getCopyrightYearEnd();
  if (!noticeCache || noticeCache.year !== end) {
    noticeCache = {
      year: end,
      text: `Copyright © ${COPYRIGHT_YEAR_START}-${end} ${COPYRIGHT_LEGAL_HOLDER} (${COPYRIGHT_BRAND_NAME}). All rights reserved.`,
    };
  }
  return noticeCache.text;
}
