/**
 * Trial Warning Component
 * Shows warning when trial is about to expire (3-4 days left)
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { useState } from 'react';
import { AlertTriangle, X, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function TrialWarning({ user, onDismiss }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  // Check if user is on trial
  if (!user || user.licenseType !== 'trial' || !user.licenseExpiresAt) {
    return null;
  }

  // Calculate days left
  const now = new Date();
  const expiresAt = new Date(user.licenseExpiresAt);
  const diffMs = expiresAt - now;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Only show warning if 3-4 days left
  if (daysLeft < 3 || daysLeft > 4) {
    return null;
  }

  // If dismissed, don't show
  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleUpgrade = () => {
    navigate('/settings');
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 mb-6 rounded-r-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {t('trialWarning.title') || 'Tu periodo de prueba esta por expirar'}
            </h3>
            <button
              onClick={handleDismiss}
              className="ml-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
              aria-label={t('common.close') || 'Cerrar'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>
              {(t('trialWarning.message') || 'Tu trial expira en {days} dias. Actualiza tu plan para continuar disfrutando de todas las funciones.')
                .replace('{days}', daysLeft)
                .replace('dias', daysLeft === 1 ? 'dia' : 'dias')
                .replace('days', daysLeft === 1 ? 'day' : 'days')}
            </p>
          </div>
          <div className="mt-4">
            <button
              onClick={handleUpgrade}
              className="inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {t('trialWarning.upgradeButton') || 'Actualizar Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
