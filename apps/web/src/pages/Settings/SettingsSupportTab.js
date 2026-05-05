import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import ContactAdmin from '../../components/ContactAdmin';
import MyMessages from '../../components/MyMessages';

export default function SettingsSupportTab({ token }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{t('settings.support') || 'Support'}</h3>
      <div className="space-y-6">
        <ContactAdmin token={token} />
        <MyMessages token={token} />
      </div>
    </div>
  );
}
