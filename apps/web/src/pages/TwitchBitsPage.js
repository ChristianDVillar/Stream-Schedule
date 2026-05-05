import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Twitch, ArrowLeft, RefreshCw } from 'lucide-react';
import { getTwitchBits } from '../features/twitchBits/api';
import { useLanguage } from '../contexts/LanguageContext';

function aggregateByUser(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    const user = row.user_name || row.user_login || 'N/A';
    const amount = Number(row.amount || 0);
    if (!map.has(user)) map.set(user, 0);
    map.set(user, map.get(user) + amount);
  });
  return Array.from(map.entries())
    .map(([user, total]) => ({ user, total }))
    .sort((a, b) => b.total - a.total);
}

export default function TwitchBitsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFormat = searchParams.get('format') === 'total' ? 'total' : 'chronological';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadBits = useCallback(async (format) => {
    setLoading(true);
    setError('');
    try {
      const data = await getTwitchBits(format);
      setRows(Array.isArray(data?.bits) ? data.bits : []);
    } catch (e) {
      setRows([]);
      setError(e.response?.data?.error || t('dashboard.errorDownloadingBits') || 'Could not load bits');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadBits(currentFormat);
  }, [currentFormat, loadBits]);

  const totalRows = useMemo(() => {
    if (currentFormat === 'total') {
      return aggregateByUser(rows);
    }
    return aggregateByUser(rows);
  }, [rows, currentFormat]);

  const handleFormatChange = (format) => {
    setSearchParams({ format });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back') || 'Back'}
          </button>
          <button
            type="button"
            onClick={() => loadBits(currentFormat)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh') || 'Refresh'}
          </button>
        </div>

        <section className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border-t-4 border-accent">
          <h1 className="text-lg sm:text-xl font-bold text-accent mb-4 flex items-center">
            <Twitch className="w-5 h-5 mr-2" />
            {t('dashboard.statsBits') || 'Bits'}
          </h1>

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => handleFormatChange('chronological')}
              className={`text-xs px-3 py-1.5 rounded ${currentFormat === 'chronological' ? 'bg-accent text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              {t('dashboard.chronological') || 'Chronological'}
            </button>
            <button
              type="button"
              onClick={() => handleFormatChange('total')}
              className={`text-xs px-3 py-1.5 rounded ${currentFormat === 'total' ? 'bg-accent text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              {t('dashboard.total') || 'Total'}
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading') || 'Loading...'}</p>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : currentFormat === 'chronological' ? (
            rows.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.noBitsChronologicalHint') || 'No chronological bits yet.'}</p>
            ) : (
              <div className="overflow-auto max-h-[60vh]">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400">
                      <th className="py-2 pr-3">{t('dashboard.csvUser') || 'User'}</th>
                      <th className="py-2 pr-3">{t('dashboard.csvAmount') || 'Amount'}</th>
                      <th className="py-2">{t('dashboard.csvDate') || 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={`${row.user_id || row.user_login || 'u'}-${idx}`} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="py-2 pr-3 text-gray-900 dark:text-gray-100">{row.user_name || row.user_login || 'N/A'}</td>
                        <td className="py-2 pr-3 text-gray-900 dark:text-gray-100">{Number(row.amount || 0)}</td>
                        <td className="py-2 text-gray-600 dark:text-gray-300">{row.date ? new Date(row.date).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            totalRows.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.noBitsToDownload') || 'No bits yet.'}</p>
            ) : (
              <div className="overflow-auto max-h-[60vh]">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400">
                      <th className="py-2 pr-3">{t('dashboard.csvUser') || 'User'}</th>
                      <th className="py-2">{t('dashboard.csvTotal') || 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totalRows.map((row) => (
                      <tr key={row.user} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="py-2 pr-3 text-gray-900 dark:text-gray-100">{row.user}</td>
                        <td className="py-2 text-gray-900 dark:text-gray-100">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </section>
      </main>
    </div>
  );
}

