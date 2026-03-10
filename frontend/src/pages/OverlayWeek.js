/**
 * Public overlay: weekly schedule (text list).
 * Usage: https://your-frontend-url/overlay/week?key=API_KEY
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function OverlayWeek() {
  const query = useQuery();
  const key = query.get('key') || query.get('apiKey') || '';
  const [text, setText] = useState('Loading schedule...');

  useEffect(() => {
    if (!key) {
      setText('Missing ?key=API_KEY in URL');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/webhooks/week?key=${encodeURIComponent(key)}`);
        const body = await res.text();
        if (!cancelled) {
          setText(body || 'No streams scheduled this week.');
        }
      } catch {
        if (!cancelled) setText('Could not load schedule.');
      }
    }

    load();
    const id = setInterval(load, 120_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [key]);

  const [headline, ...lines] = text.split('\n');

  return (
    <div
      style={{ backgroundColor: 'transparent' }}
      className="w-full h-full flex items-center justify-center"
    >
      <div
        className="rounded-2xl px-6 py-4 text-white shadow-2xl min-w-[320px] max-w-xl"
        style={{
          background:
            'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(56,189,248,0.9))',
          border: '1px solid rgba(125,211,252,0.7)',
        }}
      >
        <div className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-300">
          This week's streams
        </div>
        <div className="mt-1 text-sm font-semibold whitespace-pre-line">
          {headline}
        </div>
        {lines.length > 0 && (
          <ul className="mt-2 text-xs space-y-1">
            {lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
        <div className="mt-3 text-[10px] text-slate-400">
          Powered by Streamer Scheduler
        </div>
      </div>
    </div>
  );
}

