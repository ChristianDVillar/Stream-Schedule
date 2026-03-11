/**
 * Generic public overlay for OBS/Streamlabs Browser Source.
 * Single component driven by URL: /overlay/:type?key=API_KEY
 * Types: nextstream, goal, week, quote, suggestions
 */
import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';

const OVERLAY_CONFIG = {
  nextstream: {
    endpoints: [
      { path: 'nextstream', key: 'main' },
      { path: 'countdown', key: 'sub' },
    ],
    interval: 60_000,
    title: 'Next stream',
    gradient: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,64,175,0.9))',
    border: '1px solid rgba(148,163,184,0.6)',
    layout: 'card',
  },
  goal: {
    endpoints: [{ path: 'goal', key: 'main' }],
    interval: 60_000,
    title: 'Stream goal',
    gradient: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(22,163,74,0.9))',
    border: '1px solid rgba(134,239,172,0.7)',
    layout: 'card',
  },
  week: {
    endpoints: [{ path: 'week', key: 'main' }],
    interval: 120_000,
    title: 'Weekly schedule',
    gradient: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(14,165,233,0.9))',
    border: '1px solid rgba(125,211,252,0.6)',
    layout: 'card',
    multiline: true,
  },
  quote: {
    endpoints: [{ path: 'quote/random', key: 'main' }],
    interval: 90_000,
    title: 'Quote',
    gradient: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(147,51,234,0.9))',
    border: '1px solid rgba(192,132,252,0.6)',
    layout: 'card',
  },
  suggestions: {
    endpoints: [{ path: 'idea/latest', key: 'main' }],
    interval: 5_000,
    title: 'Chat suggestion',
    gradient: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(8,47,73,0.9))',
    border: '1px solid rgba(56,189,248,0.5)',
    layout: 'pop',
    popDuration: 6000,
  },
};

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function Overlay() {
  const { type } = useParams();
  const query = useQuery();
  const key = query.get('key') || query.get('apiKey') || '';
  const config = type ? OVERLAY_CONFIG[type] : null;

  const [data, setData] = useState({ main: 'Loading...', sub: '' });
  const [visible, setVisible] = useState(type !== 'suggestions');
  const [lastMain, setLastMain] = useState('');

  useEffect(() => {
    if (!config || !key) {
      setData({ main: key ? 'Unknown overlay type.' : 'Missing ?key=API_KEY in URL', sub: '' });
      if (type === 'suggestions') setVisible(true);
      return;
    }

    let cancelled = false;
    let popTimeoutId = null;
    const { endpoints, interval, layout, popDuration } = config;

    async function load() {
      try {
        const base = '/api/webhooks';
        const results = {};
        for (const { path, key: k } of endpoints) {
          const res = await fetch(`${base}/${path}?key=${encodeURIComponent(key)}`);
          results[k] = (await res.text()).trim();
        }
        if (cancelled) return;
        setData(results);
        if (layout === 'pop' && results.main && results.main !== lastMain) {
          setLastMain(results.main);
          setVisible(true);
          popTimeoutId = setTimeout(() => {
            if (!cancelled) setVisible(false);
          }, popDuration);
        }
      } catch {
        if (!cancelled) setData({ main: 'Could not load.', sub: '' });
      }
    }

    load();
    const id = setInterval(load, interval);
    return () => {
      cancelled = true;
      clearInterval(id);
      if (popTimeoutId) clearTimeout(popTimeoutId);
    };
  }, [key, type, lastMain]);

  if (!config) {
    return (
      <div style={{ backgroundColor: 'transparent' }} className="w-full h-full flex items-center justify-center">
        <div className="rounded-2xl px-6 py-4 text-white bg-gray-900/90">
          {data.main}
        </div>
      </div>
    );
  }

  const { title, gradient, border, layout, multiline } = config;
  const isPop = layout === 'pop';

  if (isPop) {
    return (
      <div style={{ backgroundColor: 'transparent' }} className="w-full h-full pointer-events-none">
        <div
          className={`fixed bottom-8 left-8 max-w-md transform transition-all duration-500 ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
          }`}
        >
          <div
            className="rounded-2xl px-4 py-3 text-white shadow-2xl"
            style={{ background: gradient, border }}
          >
            <div className="text-xs font-semibold tracking-wide uppercase text-slate-300">{title}</div>
            <div className="mt-1 text-base font-medium">{data.main || '—'}</div>
            <div className="mt-2 text-[10px] text-slate-400">Powered by Streamer Scheduler</div>
          </div>
        </div>
      </div>
    );
  }

  const mainText = data.main || (type === 'nextstream' ? 'No stream scheduled.' : '—');
  const [headline, ...restLines] = multiline ? mainText.split('\n') : [mainText];

  return (
    <div style={{ backgroundColor: 'transparent' }} className="w-full h-full flex items-center justify-center">
      <div
        className="rounded-2xl px-6 py-4 text-white shadow-2xl min-w-[280px] max-w-xl"
        style={{ background: gradient, border }}
      >
        <div className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-300">{title}</div>
        <div className="mt-1 text-lg font-semibold">
          {multiline ? headline : mainText}
        </div>
        {multiline && restLines.length > 0 && (
          <div className="mt-1 text-sm text-slate-200 whitespace-pre-wrap">{restLines.join('\n')}</div>
        )}
        {data.sub && <div className="mt-1 text-sm text-slate-200">{data.sub}</div>}
        <div className="mt-3 text-[10px] text-slate-400">Powered by Streamer Scheduler</div>
      </div>
    </div>
  );
}
