/**
 * Bots integration: Nightbot, Streamer.bot, Mix It Up, StreamElements.
 * Streamer-friendly layout: quick setup, command table, copy-paste ready docs.
 */
import React, { useState, useEffect } from 'react';
import { Bot, Copy, RefreshCw, Check, ExternalLink, Key, ListTodo, Calendar, Radio, MessageSquare, Zap } from 'lucide-react';
import { getNightbotKey, generateNightbotKey } from '../../api';
import toast from 'react-hot-toast';
import { useStreamMode } from '../../contexts/StreamModeContext';

const API_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '') || (typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '');
const NIGHTBOT_TODO_URL = API_BASE ? `${API_BASE}/api/nightbot/todo` : '';
const FRONTEND_ORIGIN = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';

function CopyButton({ text, label, copiedMessage = 'Copied', className = '' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success(copiedMessage);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${className}`}
      title={label || 'Copy'}
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
      <span>{copied ? 'Copied' : (label || 'Copy')}</span>
    </button>
  );
}

export default function SettingsBotsTab({ user, token, t }) {
  const { streamMode } = useStreamMode();
  const [key, setKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedNightbot, setCopiedNightbot] = useState(false);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchKey on mount and when token changes
  }, [token]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newKey = await generateNightbotKey();
      setKey(newKey);
      toast.success(t('bots.keyGenerated') || 'Key generated. Use it in Nightbot and other bots.');
    } catch (err) {
      toast.error(err.response?.data?.error || t('bots.keyGenerateFailed') || 'Failed to generate key');
    } finally {
      setGenerating(false);
    }
  };

  const nightbotMessage = !streamMode && key && NIGHTBOT_TODO_URL
    ? `$(urlfetch ${NIGHTBOT_TODO_URL}?key=${encodeURIComponent(key)}&text=$(query)&user=$(user)&channel=$(channel))`
    : '';

  const copyNightbot = () => {
    if (!nightbotMessage) return;
    navigator.clipboard.writeText(nightbotMessage).then(() => {
      setCopiedNightbot(true);
      toast.success(t('bots.copied') || 'Copied to clipboard');
      setTimeout(() => setCopiedNightbot(false), 2000);
    });
  };

  const copyLabel = t('bots.copy') || 'Copy';
  const copiedMessage = t('bots.copied') || 'Copied';

  const CHAT_COMMANDS = [
    { cmd: '!nextstream', path: 'nextstream', desc: t('bots.cmdNextstream') || 'Shows next scheduled stream', example: 'Next stream: Friday 20:00 — Minecraft Hardcore' },
    { cmd: '!countdown', path: 'countdown', desc: t('bots.cmdCountdown') || 'Time until next stream', example: 'Next stream in: 3h 12m' },
    { cmd: '!schedule / !week', path: 'schedule', pathAlt: 'week', desc: t('bots.cmdSchedule') || 'Weekly schedule', example: "This week's streams:\nFriday — Minecraft\nSunday — Just Chatting" },
    { cmd: '!goal', path: 'goal', desc: t('bots.cmdGoal') || 'Follower/sub goal', example: 'Follower goal: 500. Current: 421' },
    { cmd: '!myschedule', path: 'myschedule', desc: t('bots.cmdMyschedule') || 'Public schedule link', example: '📅 My stream schedule: https://yoursite.com/streamer/username' },
    { cmd: '!streamstats', path: 'streamstats', desc: t('bots.cmdStreamstats') || 'Stream statistics', example: 'Streams this week: 3. Next stream: Friday 20:00' },
    { cmd: '!quote random', path: 'quote/random', desc: t('bots.cmdQuote') || 'Random saved quote', example: '"I screamed like a potato"' },
    { cmd: '!randomidea', path: 'idea/random', desc: t('bots.cmdRandomidea') || 'Random stream idea', example: 'Play a horror game challenge' },
    { cmd: '!commands', path: 'commands', desc: t('bots.cmdCommands') || 'List all commands', example: 'Available commands:\n!nextstream\n!countdown\n...' },
  ];

  const getChatUrl = (path) => !streamMode && key && API_BASE ? `${API_BASE}/api/webhooks/${path}?key=${encodeURIComponent(key)}` : '';
  const getNightbotMsg = (path) => !streamMode && key && API_BASE ? `$(urlfetch ${API_BASE}/api/webhooks/${path}?key=${encodeURIComponent(key)})` : '';

  return (
    <div className="space-y-8">
      {/* Header — streamer-friendly */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-500" />
          {t('bots.title') || 'Bots & integrations'}
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
          {t('bots.description') || 'Connect Nightbot, Streamer.bot, Mix It Up and StreamElements. One API key works for all.'}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-sm">
          <Zap className="w-4 h-4" />
          {t('bots.setupInMinutes') || 'Setup in ~2 minutes'}
        </div>
      </div>

      {streamMode && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-800 dark:text-amber-200 text-sm">
          {t('common.streamModeBotsHint') || 'Stream mode is on — API key and URLs are hidden. Turn it off in the header to view or copy them.'}
        </div>
      )}

      {/* 1. API key — first and prominent */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800/80 dark:to-gray-800/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium mb-1">
          <Key className="w-5 h-5 text-indigo-500" />
          {t('bots.apiKeyLabel') || 'Your API key'}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('bots.apiKeyHint') || 'Use this key in Nightbot and in Streamer.bot, Mix It Up, StreamElements, etc. Keep it private.'}
        </p>
        {loading ? (
          <p className="text-sm text-gray-500">{t('common.loading') || 'Loading...'}</p>
        ) : key ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-200 break-all max-w-full" title={streamMode ? undefined : key}>
              {streamMode ? '••••••••••••••••' : key}
            </code>
            {!streamMode && <CopyButton text={key} label={copyLabel} copiedMessage={copiedMessage} />}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? (t('bots.generating') || 'Generating...') : (t('bots.generateKey') || 'Generate API key')}
          </button>
        )}
      </div>

      {/* 2. Nightbot — simple steps */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-5 sm:p-6">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t('bots.nightbotTitle') || 'Nightbot — !todo in chat'}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('bots.nightbotIntro') || 'When someone types !todo buy new mic, it appears in your Todos list.'}
        </p>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold">1</span>
            <span className="text-gray-700 dark:text-gray-300">{t('bots.step1') || 'Nightbot dashboard → Commands → Custom → Add Command'}</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold">2</span>
            <span className="text-gray-700 dark:text-gray-300">{t('bots.step2') || 'Command: !todo'}</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold">3</span>
            <div className="flex-1 min-w-0">
              <span className="text-gray-700 dark:text-gray-300 block mb-2">{t('bots.step3') || 'Message (paste this):'}</span>
              {!key ? (
                <span className="text-amber-600 dark:text-amber-400 text-xs">{t('bots.generateKeyFirst') || 'Generate a key above first.'}</span>
              ) : streamMode ? (
                <span className="text-gray-500 dark:text-gray-400 text-xs">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</span>
              ) : (
                <div className="flex flex-wrap items-start gap-2">
                  <code className="flex-1 min-w-0 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-3 py-2 text-xs break-all font-mono">
                    {nightbotMessage}
                  </code>
                  <button
                    type="button"
                    onClick={copyNightbot}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                  >
                    {copiedNightbot ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedNightbot ? (t('bots.copied') || 'Copied!') : copyLabel}
                  </button>
                </div>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold">4</span>
            <span className="text-gray-700 dark:text-gray-300">{t('bots.step4') || 'Userlevel: Moderator (recommended)'}</span>
          </li>
        </ol>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('bots.todosLink') || 'Todos show up in the Todos section of this app.'}
        </p>
      </div>

      {/* 3. Other bots — clear cards per action */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-5 sm:p-6">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t('bots.webhooksTitle') || 'Streamer.bot, Mix It Up, StreamElements'}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('bots.webhooksDesc') || 'Same API key. In your bot, add a Web Request (POST) and use one of the URLs below. Put your key in the header X-API-Key.'}
        </p>
        <div className="space-y-3">
          <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium text-sm mb-1">
              <ListTodo className="w-4 h-4 text-indigo-500" />
              {t('bots.webhookTodo') || 'Add a todo'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">POST — Body: {JSON.stringify({ text: 'your task' })}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs break-all text-gray-700 dark:text-gray-300">{API_BASE}/api/webhooks/todo</code>
              <CopyButton text={`${API_BASE}/api/webhooks/todo`} label={copyLabel} copiedMessage={copiedMessage} />
            </div>
          </div>
          <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium text-sm mb-1">
              <Calendar className="w-4 h-4 text-indigo-500" />
              {t('bots.webhookEvent') || 'Create stream event'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">POST — Body: {JSON.stringify({ title: 'Friday 20:00 Minecraft' })}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs break-all text-gray-700 dark:text-gray-300">{API_BASE}/api/webhooks/events</code>
              <CopyButton text={`${API_BASE}/api/webhooks/events`} label={copyLabel} copiedMessage={copiedMessage} />
            </div>
          </div>
          <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium text-sm mb-1">
              <Radio className="w-4 h-4 text-indigo-500" />
              {t('bots.webhookStreamStart') || 'Mark stream started'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">POST — Optional body: {JSON.stringify({})}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs break-all text-gray-700 dark:text-gray-300">{API_BASE}/api/webhooks/stream/start</code>
              <CopyButton text={`${API_BASE}/api/webhooks/stream/start`} label={copyLabel} copiedMessage={copiedMessage} />
            </div>
          </div>
          <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium text-sm mb-1">
              <ListTodo className="w-4 h-4 text-indigo-500" />
              {t('bots.webhookIdeaNoteQuote') || '!idea / !note / !quote / !clipidea'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">POST — Body: {JSON.stringify({ text: 'your text' })} — Use /idea, /note, /quote or /clipidea</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs break-all text-gray-700 dark:text-gray-300">{API_BASE}/api/webhooks/idea</code>
              <CopyButton text={`${API_BASE}/api/webhooks/idea`} label={copyLabel} copiedMessage={copiedMessage} />
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
          {t('bots.webhooksExample') || 'Example: In Streamer.bot, when you go live → add action → Web Request → POST to the "Mark stream started" URL with header X-API-Key: your key.'}
        </p>
        <details className="group">
          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            {t('bots.timelineWebhook') || 'POST /api/webhooks/timeline — Body: { "type": "clip", "payload": {} } to log stream moments (for timeline).'}
          </summary>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="text-xs break-all text-gray-700 dark:text-gray-300">{API_BASE}/api/webhooks/timeline</code>
            <CopyButton text={`${API_BASE}/api/webhooks/timeline`} label={copyLabel} copiedMessage={copiedMessage} />
          </div>
        </details>
      </div>

      {/* Chat commands (GET) — quick table + detailed cards */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-5 sm:p-6">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          {t('bots.chatCommandsTitle') || 'Chat commands (GET — bot replies in chat)'}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {t('bots.chatCommandsDesc') || 'These endpoints return plain text. Your bot does a GET request and says the response in chat. Use ?key=YOUR_KEY.'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {t('bots.streamerBotHint') || 'Streamer.bot: Action → HTTP Request → GET to the URL below. Nightbot: use $(urlfetch URL) in Custom Command.'}
        </p>

        {/* Quick reference table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600 mb-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700/50">
                <th className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">{t('bots.tableCommand') || 'Command'}</th>
                <th className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100">{t('bots.tableWhat') || 'What it does'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {CHAT_COMMANDS.map(({ cmd, desc }) => (
                <tr key={cmd} className="bg-white dark:bg-gray-800/50">
                  <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400">{cmd}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detailed cards — copy-paste ready */}
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">{t('bots.copyPasteReady') || 'Copy-paste ready (with your API key):'}</p>
        <div className="space-y-4">
          {CHAT_COMMANDS.map(({ cmd, path, pathAlt, desc, example }) => {
            const url = getChatUrl(path);
            const nightbotMsg = getNightbotMsg(path);
            const urlAlt = pathAlt ? getChatUrl(pathAlt) : null;
            return (
              <div key={path} className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <code className="font-mono font-medium text-indigo-600 dark:text-indigo-400">{cmd}</code>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">— {desc}</span>
                </div>
                {example && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 mt-1 italic">
                    {t('bots.exampleResponse') || 'Example'}: {example.split('\n')[0]}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {url ? (
                    <>
                      <code className="flex-1 min-w-0 text-xs break-all bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{url}</code>
                      <CopyButton text={url} label={copyLabel} copiedMessage={copiedMessage} />
                    </>
                  ) : streamMode && key ? (
                    <span className="text-gray-500 dark:text-gray-400 text-xs">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 text-xs">{t('bots.generateKeyFirst') || 'Generate a key above first.'}</span>
                  )}
                </div>
                {!streamMode && url && nightbotMsg && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('bots.nightbotExample') || 'Nightbot — Message:'}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="flex-1 min-w-0 text-xs break-all bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">{nightbotMsg}</code>
                      <CopyButton text={nightbotMsg} label={copyLabel} copiedMessage={copiedMessage} />
                    </div>
                  </div>
                )}
                {urlAlt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {t('bots.scheduleAlsoAt') || 'Also works at'}: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/api/webhooks/week</code>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Viewer suggest — public URL (no key) */}
      {user?.username && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-5 sm:p-6">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('bots.viewerSuggestTitle') || '!suggest — Viewer suggestions'}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t('bots.viewerSuggestDesc') || 'Viewers can suggest stream ideas. No API key needed. POST to this URL from your bot when someone types !suggest play Elden Ring.'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">POST — Body: {JSON.stringify({ text: 'play Elden Ring', suggestedBy: 'viewer_name' })}</p>
          <div className="flex flex-wrap items-center gap-2">
            {streamMode ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</span>
            ) : (
              <>
                <code className="text-xs break-all text-gray-700 dark:text-gray-300">{API_BASE}/api/streamer/{encodeURIComponent(user.username)}/suggest</code>
                <CopyButton text={`${API_BASE}/api/streamer/${user.username}/suggest`} label={copyLabel} copiedMessage={copiedMessage} />
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('bots.viewerSuggestDashboard') || 'Suggestions appear in the Suggestions page in the app.'}</p>
        </div>
      )}

      {/* 4. Public schedule — share link */}
      {user?.username && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-5 sm:p-6">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-1">
            <ExternalLink className="w-4 h-4 text-indigo-500" />
            {t('bots.publicScheduleTitle') || 'Your public schedule'}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('bots.publicScheduleDesc') || 'Share this link in your Twitch bio, Discord or Twitter. Viewers see your upcoming streams and can get reminders.'}
          </p>
          <div className="space-y-3">
            {streamMode ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('common.streamModeHidden') || 'Hidden (stream mode is on)'}</span>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`${FRONTEND_ORIGIN}/streamer/${encodeURIComponent(user.username)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                  >
                    {FRONTEND_ORIGIN}/streamer/{user.username}
                  </a>
                  <CopyButton
                    text={`${FRONTEND_ORIGIN}/streamer/${user.username}`}
                    label={copyLabel}
                    copiedMessage={copiedMessage}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('bots.embedHint') || 'Embed (iframe):'}</span>
                  <code className="text-xs break-all text-gray-700 dark:text-gray-300">{FRONTEND_ORIGIN}/embed/streamer/{user.username}</code>
                  <CopyButton text={`${FRONTEND_ORIGIN}/embed/streamer/${user.username}`} label={copyLabel} copiedMessage={copiedMessage} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
