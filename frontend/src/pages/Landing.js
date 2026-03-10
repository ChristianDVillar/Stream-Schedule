/**
 * Landing page for non-authenticated visitors.
 * Positioning: automation hub for streamers — schedule, announce, manage from one dashboard.
 * No user counts or social proof numbers (pre-launch).
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import AppFooter from '../components/AppFooter';
import LandingCalendarPreview from '../components/LandingCalendarPreview';
import {
  Calendar,
  Share2,
  Layers,
  Zap,
  Bell,
  Twitch,
  Twitter,
  Server,
  Video,
  Globe,
  ExternalLink,
  MessageSquare,
  Check,
  X,
  ArrowDown,
} from 'lucide-react';

/** Product motion: 3-step flow that cycles to show Create stream → Select platforms → Auto-announce */
function ProductMotionSteps({ t }) {
  const [step, setStep] = useState(0);
  const steps = [
    { key: 'motionCreate', label: t('landing.motionCreate') || 'Create stream' },
    { key: 'motionSelect', label: t('landing.motionSelect') || 'Select Twitch + Discord' },
    { key: 'motionScheduled', label: t('landing.motionScheduled') || 'Auto-announce scheduled' },
  ];
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 3), 2500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 flex-wrap">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-500 ${
              step === i
                ? 'border-accent bg-accent-subtle dark:bg-accent-subtle scale-105'
                : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
            }`}
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.label}</span>
            {step === i && <Check className="w-4 h-4 text-accent flex-shrink-0" aria-hidden />}
          </div>
          {i < steps.length - 1 && (
            <ArrowDown className="w-4 h-4 text-gray-400 sm:rotate-0 rotate-90 flex-shrink-0" aria-hidden />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const productPreviewRef = useRef(null);

  const scrollToProduct = () => {
    productPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top nav */}
      <nav className="flex justify-between items-center px-4 sm:px-6 py-4">
        <span className="text-lg font-semibold text-gray-900 dark:text-white">{t('dashboard.appTitle') || 'Streamer Scheduler'}</span>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={toggleLanguage}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900"
            title={language === 'es' ? t('common.switchToEnglish') : t('common.switchToSpanish')}
            aria-label={language === 'es' ? t('common.switchToEnglish') : t('common.switchToSpanish')}
          >
            <Globe className="w-5 h-5 flex-shrink-0" aria-hidden />
            <span className="text-sm font-medium">{language === 'es' ? 'ES' : 'EN'}</span>
          </button>
          <button onClick={() => navigate('/pricing')} className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            {t('landing.viewPricing')}
          </button>
          <button onClick={() => navigate('/login')} className="text-sm font-medium text-[var(--accent)] hover:opacity-90">
            {t('common.login')}
          </button>
        </div>
      </nav>

      {/* Hero — gradient only here for impact */}
      <header className="relative overflow-hidden bg-gradient-accent-hero">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        <div className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-lg">
              {t('landing.heroTitle') || 'Plan your streams. Promote them automatically.'}
            </h1>
            <p className="mt-3 text-xl sm:text-2xl font-semibold text-white/95">
              {t('landing.heroSubline') || 'Schedule streams and auto-announce them to Discord, Twitter and your community.'}
            </p>
            <p className="mt-4 text-lg text-white/90 max-w-2xl mx-auto">
              {t('landing.heroDescription') || 'One dashboard. Your announcements go out everywhere — and your community gets reminders before you go live.'}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3.5 bg-white text-[var(--accent)] font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
              >
                {t('landing.getStarted') || 'Start scheduling streams'}
              </button>
              <button
                onClick={scrollToProduct}
                className="px-8 py-3.5 bg-white/20 text-white font-semibold rounded-lg border-2 border-white/60 hover:bg-white/30 transition-colors"
              >
                {t('landing.seeHowItWorks') || 'See how it works'}
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="px-8 py-3.5 bg-white/10 text-white font-semibold rounded-lg border border-white/40 hover:bg-white/20 transition-colors"
              >
                {t('landing.viewPricing') || 'View pricing'}
              </button>
            </div>
            <p className="mt-3 text-sm text-white/80">
              {t('landing.ctaMicroTrust') || 'No credit card required · Free trial'}
            </p>
          </div>
        </div>
      </header>

      {/* Social proof bar — no user counts, trust via platforms */}
      <section className="py-5 px-4 sm:px-6 lg:px-8 bg-gray-100 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {t('landing.trustBar') || 'Built for streamers on'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            <Twitch className="w-8 h-8 text-[#9146FF]" aria-hidden />
            <Video className="w-8 h-8 text-[#FF0000]" aria-hidden />
            <Server className="w-8 h-8 text-[#5865F2]" aria-hidden />
            <Twitter className="w-8 h-8 text-gray-600 dark:text-gray-400" aria-hidden />
          </div>
        </div>
      </section>

      {/* Product preview — scroll target for "See how it works" */}
      <section ref={productPreviewRef} id="product-preview" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50 scroll-mt-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('landing.productPreviewTitle') || 'See your stream schedule at a glance'}
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t('landing.productPreviewSubtitle') || 'Plan streams, automate announcements and manage all your platforms from one dashboard.'}
          </p>
          {/* Product motion — 3-step flow (Create → Select platforms → Auto-announce) */}
          <ProductMotionSteps t={t} />
          <div className="mt-6 rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 min-h-[200px] sm:min-h-[280px] flex items-center justify-center p-2 sm:p-4 w-full max-w-full min-w-0">
            <LandingCalendarPreview />
          </div>
        </div>
      </section>

      {/* Without / With — value comparison (no user counts) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
            {t('landing.compareTitle') || 'Stop forgetting to announce. Start growing.'}
          </h2>
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            <div className="p-6 rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                {t('landing.compareWithout') || 'Without Streamer Scheduler'}
              </h3>
              <ul className="mt-4 space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                <li>• {t('landing.compareWithout1') || 'Forget to announce your stream'}</li>
                <li>• {t('landing.compareWithout2') || 'No clear schedule for viewers'}</li>
                <li>• {t('landing.compareWithout3') || 'Viewers miss when you go live'}</li>
              </ul>
            </div>
            <div className="p-6 rounded-xl border-2 border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/10">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                {t('landing.compareWith') || 'With Streamer Scheduler'}
              </h3>
              <ul className="mt-4 space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                <li>• {t('landing.compareWith1') || 'Schedule streams and auto-announce everywhere'}</li>
                <li>• {t('landing.compareWith2') || 'Share your public schedule page (Twitch bio, Discord)'}</li>
                <li>• {t('landing.compareWith3') || 'Viewers get email reminders before you go live'}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Public schedule page — key differentiator + mock preview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <ExternalLink className="w-12 h-12 text-accent mx-auto mb-4" aria-hidden />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('landing.publicPageTitle') || 'Your public schedule page'}
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t('landing.publicPageDesc') || 'Share one link in your Twitch bio or Discord. Viewers see your upcoming streams, a countdown and can subscribe to email reminders. Embed it in panels or your website.'}
          </p>
          {/* Mock preview — screenshot-style for trust */}
          <div className="mt-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-xl overflow-hidden text-left max-w-md mx-auto">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <code className="text-xs font-mono text-gray-500 dark:text-gray-400">yoursite.com/streamer/yourname</code>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent-subtle flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">Streamer Name</p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">{t('landing.publicPageMockLive') || 'Next stream in 2h 30m'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('landing.publicPageMockUpcoming') || 'Upcoming'}</p>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-sm text-gray-800 dark:text-gray-200">Fri 20:00 — Minecraft</div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-sm text-gray-800 dark:text-gray-200">Sun 19:00 — Just Chatting</div>
              </div>
              <button type="button" className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium">
                {t('landing.publicPageMockNotify') || 'Notify me'}
              </button>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            {t('landing.publicPageEmbed') || 'Use the embed URL for Discord panels or iframes.'}
          </p>
        </div>
      </section>

      {/* Create stream → viewers get notified everywhere (3 preview mocks) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('landing.notifiedTitle') || 'Create a stream — viewers get notified everywhere'}
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t('landing.notifiedSubtitle') || 'Schedule once. Your community sees the announcement on Discord, Twitter and your public schedule.'}
          </p>
          <div className="mt-10 grid sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-lg overflow-hidden text-left">
              <div className="px-3 py-2 bg-[#5865F2] text-white text-xs font-medium">{t('landing.notifiedDiscord') || 'Discord'}</div>
              <div className="p-3 text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium">🔴 Stream starting in 1h</p>
                <p className="mt-1 text-gray-500 dark:text-gray-400">Friday 20:00 — Minecraft. Set your reminder!</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-lg overflow-hidden text-left">
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium">X</div>
              <div className="p-3 text-sm text-gray-700 dark:text-gray-300">
                <p>Going live in 1 hour! 🎮 Minecraft — Friday 20:00. See you there!</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-lg overflow-hidden text-left">
              <div className="px-3 py-2 bg-accent-subtle text-[var(--accent)] text-xs font-medium">{t('landing.notifiedSchedule') || 'Schedule page'}</div>
              <div className="p-3 text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium">Next stream in 1h 0m</p>
                <p className="mt-1 text-gray-500 dark:text-gray-400">Fri 20:00 — Minecraft · Notify me</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — streamer-specific copy */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            {t('landing.featuresTitle') || 'Built for streamers'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <Zap className="w-10 h-10 text-amber-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('landing.featureAutoAnnounce') || 'Auto-announce your streams'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.featureAutoAnnounceDesc') || 'Schedule once. Announcements go out to Twitch, Discord and social media automatically.'}
              </p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <Bell className="w-10 h-10 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('landing.featureReminders') || 'Reminders to Discord'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.featureRemindersDesc') || 'Notify your community when you go live. Discord events and stream-start announcements.'}
              </p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <MessageSquare className="w-10 h-10 text-purple-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('landing.featureChatIdeas') || 'Chat creates stream ideas'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.featureChatIdeasDesc') || 'Viewers suggest with !suggest. Save ideas, quotes and clip ideas from chat to your dashboard.'}
              </p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <Share2 className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('landing.featurePublicSchedule') || 'Share your public schedule'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.featurePublicScheduleDesc') || 'One link for your Twitch bio or Discord. Viewers see upcoming streams and can subscribe to email reminders.'}
              </p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <Calendar className="w-10 h-10 text-accent mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('landing.featureCalendar') || 'One calendar for all platforms'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.featureCalendarDesc') || 'Plan streams and posts. Drag & drop. Twitch, Discord, X, Instagram, YouTube from one place.'}
              </p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <Layers className="w-10 h-10 text-pink-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('landing.featureBots') || 'Bots in one place'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.featureBotsDesc') || 'One API key for Nightbot, Streamer.bot, Mix It Up. !schedule, !nextstream, !goal and more.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('landing.howItWorksTitle') || 'How it works'}
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{t('landing.howItWorks1Title') || '1. Connect platforms'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.howItWorks1Desc') || 'Link Twitch, Discord and your social media.'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{t('landing.howItWorks2Title') || '2. Schedule streams'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.howItWorks2Desc') || 'Plan your streams using a simple visual calendar.'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{t('landing.howItWorks3Title') || '3. Promote automatically'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.howItWorks3Desc') || 'Your announcements are sent automatically before going live.'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{t('landing.howItWorks4Title') || '4. Share your schedule'}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t('landing.howItWorks4Desc') || 'Share your public page link in Twitch bio or Discord. Viewers get reminders.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Built for streamers — 4 concrete checkmarks (this is made for me) */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-lg font-semibold text-gray-700 dark:text-gray-300 mb-6">
            {t('landing.builtForStreamersTitle') || 'Built for streamers'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: 'builtDiscord', label: t('landing.builtDiscord') || 'Discord announcements' },
              { key: 'builtChat', label: t('landing.builtChat') || 'Chat commands (!schedule)' },
              { key: 'builtPublic', label: t('landing.builtPublic') || 'Public stream page' },
              { key: 'builtMulti', label: t('landing.builtMulti') || 'Multi-platform streams' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border border-gray-100 dark:border-gray-700">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" aria-hidden />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for creators — consistency message (no user counts) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-100 dark:bg-gray-900/80">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('landing.builtForTitle') || 'Built for creators'}
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            {t('landing.builtForDesc') || 'Consistency builds viewers. Plan your streams and never miss announcements again. Most tools are made for marketing teams — Streamer Scheduler is creator-first so you can focus on streaming.'}
          </p>
        </div>
      </section>

      {/* Integrations — Works with (no user counts); subtle light background */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
            {t('landing.integrationsLabel') || 'Works with'}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-10">
            <div className="flex flex-col items-center gap-2">
              <Twitch className="w-10 h-10 text-[#9146FF]" aria-hidden />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Twitch</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Server className="w-10 h-10 text-[#5865F2]" aria-hidden />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Discord</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Video className="w-10 h-10 text-[#FF0000]" aria-hidden />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">YouTube</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Twitter className="w-10 h-10 text-gray-700 dark:text-gray-300" aria-hidden />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">X</span>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">{t('landing.integrationsMore') || '+ more'}</span>
          </div>
        </div>
      </section>

      {/* CTA — gradient only here to close conversion */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-accent-hero overflow-hidden">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40" aria-hidden />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">
            {t('landing.ctaTitle') || 'Ready to automate your streams?'}
          </h2>
          <p className="mt-4 text-white/90">
            {t('landing.ctaDescription') || 'Start with a free trial. No credit card required.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-8 px-8 py-3.5 bg-white text-[var(--accent)] font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
          >
            {t('landing.startFree') || 'Start scheduling streams'}
          </button>
        </div>
      </section>

      <AppFooter className="py-6 px-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-center text-gray-500 dark:text-gray-400 text-sm" />
    </div>
  );
}
