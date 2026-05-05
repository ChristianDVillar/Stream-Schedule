/**
 * Interactive onboarding tour using react-joyride
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import React, { useState, useEffect } from 'react';
import Joyride from 'react-joyride';
import { useLanguage } from '../contexts/LanguageContext';

export function OnboardingTour({ run = false, onComplete }) {
  const { t } = useLanguage();
  const [hasSeenTutorial, setHasSeenTutorial] = useState(() => {
    return localStorage.getItem('hasSeenTutorial') === 'true';
  });

  const steps = [
    {
      target: '.calendar',
      content: t('onboarding.calendar') || 'Here you can see and manage your scheduled content',
      disableBeacon: true,
    },
    {
      target: '.new-content-button',
      content: t('onboarding.createContent') || 'Create your first scheduled content',
    },
    {
      target: '.settings-link',
      content: t('onboarding.settings') || 'Configure your account and preferences here',
    },
    {
      target: '.profile-link',
      content: t('onboarding.profile') || 'View your profile and statistics',
    },
  ];

  const handleComplete = (data) => {
    if (data.status === 'finished' || data.status === 'skipped') {
      localStorage.setItem('hasSeenTutorial', 'true');
      setHasSeenTutorial(true);
      if (onComplete) {
        onComplete();
      }
    }
  };

  if (hasSeenTutorial && !run) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run && !hasSeenTutorial}
      continuous
      showProgress
      showSkipButton
      styles={{
        options: {
          primaryColor: '#3b82f6',
        },
      }}
      callback={handleComplete}
    />
  );
}
