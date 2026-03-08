/**
 * Shared footer: © 2026 Christian · Develop · v2.2.0 + FAQ, Privacy, Terms.
 * Used on all pages (app layout and public pages).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { APP_VERSION } from '../version';

const CURRENT_YEAR = 2026;

export default function AppFooter({ className = '' }) {
  const { t } = useLanguage();
  const baseClass = 'text-center text-gray-500 dark:text-gray-400 py-3 sm:py-4 px-4 text-sm border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
  return (
    <footer className={className || baseClass}>
      <div className="flex flex-col items-center gap-2">
        <span>© {CURRENT_YEAR} Christian · Develop · v{APP_VERSION}</span>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link to="/faq" className="hover:text-accent underline">{t('faq.menuTitle') || 'FAQ'}</Link>
          <Link to="/privacy" className="hover:text-accent underline">{t('footer.privacy') || 'Privacy'}</Link>
          <Link to="/terms" className="hover:text-accent underline">{t('footer.terms') || 'Terms'}</Link>
        </div>
      </div>
    </footer>
  );
}
