import React from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SettingsDataTab({ loading, onExport, onDeleteAccount, t }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Data & Export</h3>

      <div className="space-y-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Export Your Data</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                Download all your content, settings, and account data in JSON format.
              </p>
              <button
                onClick={onExport}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? t('settings.exporting') : t('settings.exportData')}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">Danger Zone</h4>
              <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={onDeleteAccount}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? t('settings.deleting') : t('settings.deleteAccount')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
