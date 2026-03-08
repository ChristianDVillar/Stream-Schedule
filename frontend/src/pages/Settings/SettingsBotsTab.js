/**
 * Bots integration: connect chat bots (e.g. Nightbot) to Streamer Scheduler.
 * Shows how to use Custom Commands with urlfetch to create todos from Twitch chat.
 */
import React, { useState, useEffect } from 'react';
import { Bot, Copy, RefreshCw, Check, ExternalLink } from 'lucide-react';
import { getNightbotKey, generateNightbotKey } from '../../api';
import toast from 'react-hot-toast';

const API_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '') || (typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '');
const NIGHTBOT_TODO_URL = API_BASE ? `${API_BASE}/api/nightbot/todo` : '';
const FRONTEND_ORIGIN = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';

export default function SettingsBotsTab({ user, token, t }) {
  const [key, setKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchKey = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const k = await getNightbotKey();
      setKey(k);
    } catch {
      setKey(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKey();
  }, [token]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newKey = await generateNightbotKey();
      setKey(newKey);
      toast.success(t('bots.keyGenerated') || 'Key generated. Copy it and paste it in Nightbot.');
    } catch (err) {
      toast.error(err.response?.data?.error || t('bots.keyGenerateFailed') || 'Failed to generate key');
    } finally {
      setGenerating(false);
    }
  };

  const nightbotMessage = key && NIGHTBOT_TODO_URL
    ? `$(urlfetch ${NIGHTBOT_TODO_URL}?key=${encodeURIComponent(key)}&text=$(query)&user=$(user)&channel=$(channel))`
    : '';

  const copyMessage = () => {
    if (!nightbotMessage) return;
    navigator.clipboard.writeText(nightbotMessage).then(() => {
      setCopied(true);
      toast.success(t('bots.copied') || 'Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Bot className="w-5 h-5" />
        {t('bots.title') || 'Bots'}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('bots.description') || 'Connect chat bots like Nightbot to add todos from Twitch chat. Viewers (or you) can type !todo buy new mic and it appears in your Streamer Scheduler todo list.'}
      </p>

      {/* Nightbot */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-6 space-y-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
          {t('bots.nightbotTitle') || 'Nightbot — !todo command'}
        </h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>{t('bots.step1') || 'In Nightbot dashboard: Commands → Custom → Add Command'}</li>
          <li>{t('bots.step2') || 'Command: !todo'}</li>
          <li>
            {t('bots.step3') || 'Message (copy below):'}
            {loading ? (
              <span className="block mt-2 text-gray-500">{t('common.loading') || 'Loading...'}</span>
            ) : !key ? (
              <span className="block mt-2 text-amber-600 dark:text-amber-400">
                {t('bots.generateKeyFirst') || 'Generate a key first, then the command URL will appear.'}
              </span>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="block w-full max-w-full overflow-x-auto rounded bg-gray-200 dark:bg-gray-700 px-2 py-1.5 text-xs break-all">
                  $(urlfetch {NIGHTBOT_TODO_URL}?key={key}&text=$(query)&user=$(user)&channel=$(channel))
                </code>
                <button
                  type="button"
                  onClick={copyMessage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? (t('bots.copied') || 'Copied') : (t('bots.copy') || 'Copy')}
                </button>
              </div>
            )}
          </li>
          <li>{t('bots.step4') || 'Userlevel: Moderator (recommended) — so only you or mods can add todos and avoid spam.'}</li>
        </ol>

        <div className="pt-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 block mb-2">
            {t('bots.apiKeyLabel') || 'Your API key (keep it private):'}
          </span>
          {loading ? (
            <p className="text-sm text-gray-500">{t('common.loading') || 'Loading...'}</p>
          ) : key ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-gray-200 dark:bg-gray-700 px-2 py-1 text-xs font-mono break-all max-w-[240px] truncate" title={key}>
                {key}
              </code>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                {generating ? (t('bots.generating') || 'Generating...') : (t('bots.regenerate') || 'Regenerate')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? (t('bots.generating') || 'Generating...') : (t('bots.generateKey') || 'Generate API key')}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('bots.todosLink') || 'Todos appear in Streamer Scheduler under Todos. You can manage them from the app.'}
      </p>

      {/* Public schedule page */}
      {user?.username && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-6 space-y-2">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            {t('bots.publicScheduleTitle') || 'Your public schedule'}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('bots.publicScheduleDesc') || 'Share this link in your Twitch bio, Discord or Twitter. Viewers see your upcoming streams.'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={`${FRONTEND_ORIGIN}/streamer/${encodeURIComponent(user.username)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all"
            >
              {FRONTEND_ORIGIN}/streamer/{user.username}
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${FRONTEND_ORIGIN}/streamer/${user.username}`);
                toast.success(t('bots.copied') || 'Copied');
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-sm"
            >
              <Copy className="w-3.5 h-3.5" /> {t('bots.copy') || 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
            {t('bots.embedHint') || 'Embed: use'} <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">/embed/streamer/{user.username}</code> {t('bots.embedHintIn') || 'in an iframe for Discord panels or your site.'}
          </p>
        </div>
      )}
    </div>
  );
}
