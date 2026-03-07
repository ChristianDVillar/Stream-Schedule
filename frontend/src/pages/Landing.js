/**
 * Landing page for non-authenticated visitors.
 * Value prop from market analysis: Schedule your streams. Promote them automatically. Grow your audience.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Calendar,
  Share2,
  TrendingUp,
  Layers,
  Zap,
  Bell,
  Twitch,
  Twitter,
  Server,
  Video,
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top nav */}
      <nav className="flex justify-between items-center px-4 sm:px-6 py-4">
        <span className="text-lg font-semibold text-gray-900 dark:text-white">{t('dashboard.appTitle') || 'Streamer Scheduler'}</span>
        <div className="flex gap-4">
          <button onClick={() => navigate('/pricing')} className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            {t('landing.viewPricing')}
          </button>
          <button onClick={() => navigate('/login')} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">
            {t('common.login')}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <div className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-lg">
              {t('landing.heroTitle') || 'Schedule your streams.'}
            </h1>
            <h2 className="mt-2 text-xl sm:text-2xl lg:text-3xl font-semibold text-white/95">
              {t('landing.heroSubtitle') || 'Promote them automatically. Grow your audience.'}
            </h2>
            <p className="mt-6 text-lg text-white/90 max-w-2xl mx-auto">
              {t('landing.heroDescription') || 'The creator tool for streamers. Plan content, publish to Twitch, Discord, Twitter, Instagram & YouTube — all from one place.'}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3.5 bg-white text-indigo-600 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
              >
                {t('landing.getStarted') || 'Get started free'}
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="px-8 py-3.5 bg-white/20 text-white font-semibold rounded-lg border-2 border-white/60 hover:bg-white/30 transition-colors"
              >
                {t('landing.viewPricing') || 'View pricing'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            {t('landing.featuresTitle') || 'Built for streamers'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <Calendar className="w-10 h-10 text-indigo-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('landing.featureCalendar') || 'Calendar & scheduling'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.featureCalendarDesc') || 'Plan streams and posts in advance. Drag & drop, multi-platform.'}
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <Layers className="w-10 h-10 text-purple-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('landing.featureMultiplatform') || 'Multi-platform'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.featureMultiplatformDesc') || 'Twitch, Discord, Twitter, Instagram, YouTube. One schedule for all.'}
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <Zap className="w-10 h-10 text-amber-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('landing.featureAutomation') || 'Automation & workers'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.featureAutomationDesc') || 'Queues, workers, auto-publish. Set it and forget it.'}
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <Share2 className="w-10 h-10 text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('landing.featurePromo') || 'Promote streams'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.featurePromoDesc') || 'Schedule reminders and announcements. Coming: auto-promo at T-24h, T-1h.'}
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <Bell className="w-10 h-10 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('landing.featureNotifications') || 'Discord events'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.featureNotificationsDesc') || 'Create Discord events, stream announcements. Your community stays informed.'}
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <TrendingUp className="w-10 h-10 text-pink-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('landing.featureGrow') || 'Grow your audience'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.featureGrowDesc') || 'Consistency builds viewers. Schedule, promote, grow.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            {t('landing.integrationsLabel') || 'Integrations'}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6">
            <Twitch className="w-8 h-8 text-[#9146FF]" />
            <Twitter className="w-8 h-8 text-gray-700 dark:text-gray-300" />
            <Server className="w-8 h-8 text-[#5865F2]" />
            <Video className="w-8 h-8 text-[#FF0000]" />
            <span className="text-gray-500 dark:text-gray-400">+ more</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('landing.ctaTitle') || 'Ready to grow?'}
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            {t('landing.ctaDescription') || 'Start with a free trial. No credit card required.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-8 px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {t('landing.startFree') || 'Start free trial'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} {t('dashboard.appTitle') || 'Streamer Scheduler'}
          </span>
          <div className="flex gap-6">
            <button
              onClick={() => navigate('/privacy')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {t('common.privacy') || 'Privacy'}
            </button>
            <button
              onClick={() => navigate('/terms')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {t('common.terms') || 'Terms'}
            </button>
            <button
              onClick={() => navigate('/faq')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {t('faq.menuTitle') || 'FAQ'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
