/**
 * Getting started checklist for new users (Dashboard).
 * Dismissible; state stored in localStorage. Does not block any functionality.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, X, ExternalLink, Loader2 } from 'lucide-react';
import { getConnectedAccounts, getOnboardingStatus, autoCreateFirstStream } from '../features/account/api';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { getPublicShareLinkQueryString } from '../shared/config/publicUrls';
import { devCatchLog } from '../utils/devCatchLog';

const STORAGE_KEY = 'streamer_scheduler_onboarding_dismissed';

export default function OnboardingChecklist({ user, token, hasScheduledContent, onFirstStreamCreated }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch (e) {
      devCatchLog('OnboardingChecklist.dismissed.init', e);
      return false;
    }
  });
  const [connectedAccounts, setConnectedAccounts] = useState(null);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [creatingExample, setCreatingExample] = useState(false);

  useEffect(() => {
    if (!token || !user || user.isAdmin) return;
    let cancelled = false;
    getConnectedAccounts()
      .then((data) => { if (!cancelled) setConnectedAccounts(data); })
      .catch((e) => {
        devCatchLog('OnboardingChecklist.getConnectedAccounts', e);
        if (!cancelled) setConnectedAccounts(null);
      });
    return () => { cancelled = true; };
  }, [token, user]);

  useEffect(() => {
    if (!token || !user || user.isAdmin) return;
    let cancelled = false;
    getOnboardingStatus()
      .then((data) => { if (!cancelled) setOnboardingStatus(data); })
      .catch((e) => {
        devCatchLog('OnboardingChecklist.getOnboardingStatus', e);
        if (!cancelled) setOnboardingStatus(null);
      });
    return () => { cancelled = true; };
  }, [token, user, hasScheduledContent]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      setDismissed(true);
    } catch (e) {
      devCatchLog('OnboardingChecklist.handleDismiss', e);
    }
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
        {onboardingStatus?.score != null && (
          <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">
            ({onboardingStatus.score}%)
          </span>
        )}
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
            <span className="flex items-center gap-1 ml-1">
              <button type="button" onClick={() => navigate('/schedule')} className="text-accent hover:underline">
                {t('dashboard.schedule') || 'Schedule'} →
              </button>
              {twitchOk && typeof onFirstStreamCreated === 'function' && (
                <button
                  type="button"
                  disabled={creatingExample}
                  onClick={async () => {
                    setCreatingExample(true);
                    try {
                      await autoCreateFirstStream();
                      toast.success(t('dashboard.firstStreamCreated') || 'Example stream created!');
                      onFirstStreamCreated();
                    } catch (err) {
                      const msg = err.response?.data?.error || err.message;
                      toast.error(msg || 'Could not create example stream');
                    } finally {
                      setCreatingExample(false);
                    }
                  }}
                  className="text-accent hover:underline ml-1 flex items-center gap-0.5"
                >
                  {creatingExample ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {creatingExample ? (t('dashboard.creating') || 'Creating...') : (t('dashboard.createExampleStream') || 'Create example stream')}
                </button>
              )}
            </span>
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
            onClick={() => navigate({ pathname: `/streamer/${user?.username || 'me'}`, search: `?${getPublicShareLinkQueryString()}` })}
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
