/**
 * Shared footer with legal links and localized copyright.
 * Used on all pages (app layout and public pages).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { COPYRIGHT_BRAND_NAME, getCopyrightYearEnd } from '../constants/copyright';

const DAKINIS_SYSTEMS_URL = 'https://dakinissystems.onrender.com/';

export default function AppFooter({ className = '' }) {
  const { t } = useLanguage();
  const displayYear = getCopyrightYearEnd();
  const baseClass = 'text-center text-gray-600 dark:text-gray-400 py-3 sm:py-4 px-4 text-sm border-t border-accent-light dark:border-gray-700 bg-accent-subtle dark:bg-gray-800';
  return (
    <footer className={className || baseClass}>
      <div className="flex flex-col items-center gap-2">
        <a
          href={DAKINIS_SYSTEMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          aria-label={t('footer.brandName') || COPYRIGHT_BRAND_NAME}
        >
          <img
            src="/Logo Grande.jpeg"
            alt=""
            className="h-10 sm:h-12 lg:h-16 w-auto object-contain"
            loading="lazy"
          />
        </a>
        <span>
          {t('footer.copyrightPrefix', { year: displayYear }) || `© ${displayYear} `}
          <a
            href={DAKINIS_SYSTEMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-700 dark:text-gray-300 hover:text-accent underline underline-offset-2"
          >
            {t('footer.brandName') || COPYRIGHT_BRAND_NAME}
          </a>
          {t('footer.copyrightSuffix') || ' (trading name of Christian Villar). All rights reserved.'}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link to="/faq" className="hover:text-accent underline">{t('faq.menuTitle') || 'FAQ'}</Link>
          <Link to="/privacy" className="hover:text-accent underline">{t('footer.privacy') || 'Privacy'}</Link>
          <Link to="/terms" className="hover:text-accent underline">{t('footer.terms') || 'Terms'}</Link>
          <Link to="/aviso-legal" className="hover:text-accent underline">{t('footer.legalNotice') || 'Legal notice'}</Link>
        </div>
      </div>
    </footer>
  );
}
