/**
 * Public FAQ page. Content depends on current language (i18n).
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import AppFooter from '../components/AppFooter';

const FAQ_ITEMS = 10;

export default function FAQ() {
  const { t } = useLanguage();
  const location = useLocation();
  const backTo = location.state?.from || '/login';

  const items = [];
  for (let i = 1; i <= FAQ_ITEMS; i++) {
    const q = t(`faq.q${i}`);
    const a = t(`faq.a${i}`);
    if (q && q !== `faq.q${i}` && a && a !== `faq.a${i}`) {
      items.push({ q, a });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('faq.backToApp') || 'Back to app'}
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-8 h-8 text-accent" aria-hidden />
          <h1 className="text-3xl font-bold">
            {t('faq.title') || 'Frequently asked questions'}
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          {t('faq.subtitle') || 'Quick answers to common questions.'}
        </p>

        <div className="space-y-6">
          {items.map((item, index) => (
            <section
              key={index}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {item.q}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {item.a}
              </p>
            </section>
          ))}
        </div>

        {items.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">
            {t('common.loading') || 'Loading...'}
          </p>
        )}
      </div>
      <AppFooter className="mt-12 py-6 px-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-center text-gray-500 dark:text-gray-400 text-sm" />
    </div>
  );
}
