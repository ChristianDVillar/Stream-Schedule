/**
 * Stream Ideas Board — ideas, notes, quotes, clip ideas from !idea, !note, !quote, !clipidea.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getStreamItems, deleteStreamItem } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { Lightbulb, FileText, MessageCircle, Film, RefreshCw, Trash2 } from 'lucide-react';

const TABS = [
  { key: 'idea', labelKey: 'streamIdeas.ideas', Icon: Lightbulb },
  { key: 'note', labelKey: 'streamIdeas.notes', Icon: FileText },
  { key: 'quote', labelKey: 'streamIdeas.quotes', Icon: MessageCircle },
  { key: 'clipidea', labelKey: 'streamIdeas.clipIdeas', Icon: Film },
];

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const SORT_OPTIONS = [
  { value: 'recent', labelKey: 'streamIdeas.sortRecent' },
  { value: 'votes', labelKey: 'streamIdeas.sortVotes' },
];

export default function StreamIdeasPage({ token }) {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('idea');
  const [sort, setSort] = useState('recent');

  const load = useCallback(async (type, sortBy = 'recent') => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await getStreamItems(type || undefined, sortBy);
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load(activeTab, sort);
  }, [load, activeTab, sort]);

  const filtered = items.filter((i) => i.type === activeTab);

  const handleDelete = async (id) => {
    if (!window.confirm(t('streamIdeas.deleteConfirm') || 'Delete this item?')) return;
    try {
      await deleteStreamItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success(t('streamIdeas.deleted') || 'Deleted.');
    } catch (err) {
      toast.error(err.response?.data?.error || t('streamIdeas.deleteFailed') || 'Failed to delete.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('streamIdeas.title') || 'Stream Ideas'}
        </h1>
        <button
          type="button"
          onClick={() => load(activeTab)}
          disabled={loading}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          title={t('common.refresh') || 'Refresh'}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('streamIdeas.hint') || 'Saved from chat with !idea, !note, !quote, !clipidea. Configure in Settings → Bots.'}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
        {TABS.map(({ key, labelKey, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {t(labelKey) || key}
          </button>
        ))}
        {activeTab === 'idea' && (
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="ml-auto px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            aria-label={t('streamIdeas.sortBy') || 'Sort by'}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey) || opt.value}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">{t('common.loading') || 'Loading…'}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{t('streamIdeas.empty') || 'No items yet. Use chat commands to add some.'}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-start justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-gray-900 dark:text-gray-100">{item.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(item.createdAt)}</p>
                  {item.voteCount != null && item.voteCount > 1 && (
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {item.voteCount} {t('streamIdeas.votes') || 'votes'}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                title={t('streamIdeas.delete') || 'Delete'}
                aria-label={t('streamIdeas.delete') || 'Delete'}
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
