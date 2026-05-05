/**
 * Viewer suggestions — from !suggest in chat. Streamer can review and delete.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getSuggestions, deleteSuggestion } from '../features/content/api';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { MessageCircle, Trash2, RefreshCw } from 'lucide-react';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SuggestionsPage({ token }) {
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await getSuggestions();
      setSuggestions(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    try {
      await deleteSuggestion(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      toast.success(t('common.deleted') || 'Deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MessageCircle className="w-8 h-8 text-accent" />
          {t('suggestions.title') || 'Viewer suggestions'}
        </h1>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          title={t('common.refresh') || 'Refresh'}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('suggestions.hint') || 'Viewers can use !suggest play Elden Ring in chat. Add the webhook in Settings → Bots.'}
      </p>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">{t('common.loading') || 'Loading…'}</p>
      ) : suggestions.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{t('suggestions.empty') || 'No suggestions yet.'}</p>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((s) => (
            <li
              key={s.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <div className="min-w-0 flex-1">
                <p className="text-gray-900 dark:text-gray-100">{s.text}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {s.suggestedBy ? `${t('suggestions.by') || 'By'} ${s.suggestedBy} · ` : ''}{formatDate(s.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                className="p-2 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                title={t('common.delete') || 'Delete'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
