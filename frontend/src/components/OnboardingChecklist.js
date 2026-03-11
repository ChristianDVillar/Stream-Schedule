/**
 * Getting started checklist for new users (Dashboard).
 * Dismissible; state stored in localStorage. Does not block any functionality.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, X, ExternalLink } from 'lucide-react';
import { getConnectedAccounts } from '../api';
import { useLanguage } from '../contexts/LanguageContext';

const STORAGE_KEY = 'streamer_scheduler_onboarding_dismissed';

export default function OnboardingChecklist({ user, token, hasScheduledContent }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [connectedAccounts, setConnectedAccounts] = useState(null);

  useEffect(() => {
    if (!token || !user || user.isAdmin) return;
    let cancelled = false;
    getConnectedAccounts()
      .then((data) => { if (!cancelled) setConnectedAccounts(data); })
      .catch(() => { if (!cancelled) setConnectedAccounts(null); });
    return () => { cancelled = true; };
  }, [token, user]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      setDismissed(true);
    } catch {}
  };

  if (!user || user.isAdmin || dismissed) return null;

  const twitchOk = connectedAccounts?.twitch === true;
  const discordOk = connectedAccounts?.discord === true;
  const scheduleOk = !!hasScheduledContent;
  const allDone = twitchOk && discordOk && scheduleOk;

  return (
    <div className="bg-accent/10 dark:bg-accent/20 border border-accent/30 rounded-lg p-4 sm:p-5 mb-6 relative">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 pr-8">
        {t('dashboard.onboardingTitle') || 'Getting started'}
      </h3>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2">
          {twitchOk ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> : <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <span className={twitchOk ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}>
            {t('dashboard.onboardingTwitch') || 'Connect Twitch'}
          </span>
          {!twitchOk && (
            <button type="button" onClick={() => navigate('/settings')} className="text-accent hover:underline ml-1">
              {t('settings.title') || 'Settings'} →
            </button>
          )}
        </li>
        <li className="flex items-center gap-2">
          {scheduleOk ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> : <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <span className={scheduleOk ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}>
            {t('dashboard.onboardingSchedule') || 'Schedule your first stream'}
          </span>
          {!scheduleOk && (
            <button type="button" onClick={() => navigate('/schedule')} className="text-accent hover:underline ml-1">
              {t('dashboard.schedule') || 'Schedule'} →
            </button>
          )}
        </li>
        <li className="flex items-center gap-2">
          {discordOk ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> : <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <span className={discordOk ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}>
            {t('dashboard.onboardingDiscord') || 'Connect Discord'}
          </span>
          {!discordOk && (
            <button type="button" onClick={() => navigate('/settings')} className="text-accent hover:underline ml-1">
              {t('settings.title') || 'Settings'} →
            </button>
          )}
        </li>
        <li className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-700 dark:text-gray-300">
            {t('dashboard.onboardingShare') || 'Share your schedule page'}
          </span>
          <button
            type="button"
            onClick={() => navigate(`/streamer/${user?.username || 'me'}`)}
            className="text-accent hover:underline ml-1 flex items-center gap-0.5"
          >
            /streamer/{user?.username || 'you'}
          </button>
        </li>
      </ul>
      {allDone && (
        <p className="mt-3 text-xs text-green-700 dark:text-green-400 font-medium">
          {t('dashboard.onboardingAllSet') || "You're all set. Share your schedule link with your viewers!"}
        </p>
      )}
    </div>
  );
}
