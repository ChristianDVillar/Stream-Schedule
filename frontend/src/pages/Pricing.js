/**
 * Pricing page – suggested tiers from market analysis.
 * FREE | 7€/mes | 15€/mes (adjustable while deciding)
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Check, Zap, Star, Rocket } from 'lucide-react';

const TIERS = [
  {
    id: 'free',
    nameKey: 'pricing.free',
    priceKey: 'pricing.freePrice',
    descKey: 'pricing.freeDesc',
    features: [
      'pricing.freeF1',
      'pricing.freeF2',
      'pricing.freeF3',
      'pricing.freeF4',
    ],
    ctaKey: 'pricing.startFree',
    ctaAction: 'login',
    highlight: false,
    icon: Zap,
  },
  {
    id: 'starter',
    nameKey: 'pricing.starter',
    priceKey: 'pricing.starterPrice',
    descKey: 'pricing.starterDesc',
    features: [
      'pricing.starterF1',
      'pricing.starterF2',
      'pricing.starterF3',
      'pricing.starterF4',
      'pricing.starterF5',
    ],
    ctaKey: 'pricing.getStarted',
    ctaAction: 'login',
    highlight: true,
    icon: Star,
  },
  {
    id: 'pro',
    nameKey: 'pricing.pro',
    priceKey: 'pricing.proPrice',
    descKey: 'pricing.proDesc',
    features: [
      'pricing.proF1',
      'pricing.proF2',
      'pricing.proF3',
      'pricing.proF4',
      'pricing.proF5',
      'pricing.proF6',
    ],
    ctaKey: 'pricing.getPro',
    ctaAction: 'login',
    highlight: false,
    icon: Rocket,
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleCta = (action) => {
    if (action === 'login') navigate('/login');
    else if (action === 'settings') navigate('/settings');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            {t('pricing.title') || 'Simple, transparent pricing'}
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t('pricing.subtitle') || 'Start free. Upgrade when you grow. We recommend 7€/month for most streamers.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl border-2 p-6 sm:p-8 flex flex-col ${
                  tier.highlight
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold bg-indigo-500 text-white rounded-full">
                    {t('pricing.recommended') || 'Recommended'}
                  </span>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`w-8 h-8 ${tier.highlight ? 'text-indigo-500' : 'text-gray-500 dark:text-gray-400'}`} />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t(tier.nameKey)}
                  </h2>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {t(tier.priceKey)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {t(tier.descKey)}
                </p>
                <ul className="space-y-3 flex-1">
                  {tier.features.map((fKey) => (
                    <li key={fKey} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{t(fKey)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleCta(tier.ctaAction)}
                  className={`mt-6 w-full py-3 rounded-lg font-semibold transition-colors ${
                    tier.highlight
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(tier.ctaKey)}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('pricing.note') || 'Prices may vary. Check Settings → Billing for current plans. Trial available for new users.'}
        </p>
      </div>
    </div>
  );
}
