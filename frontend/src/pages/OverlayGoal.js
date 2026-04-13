/**
 * Public overlay: stream goal (followers/subs).
 * Usage: https://your-frontend-url/overlay/goal?key=API_KEY
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { devCatchLog } from '../utils/devCatchLog';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function OverlayGoal() {
  const query = useQuery();
  const key = query.get('key') || query.get('apiKey') || '';
  const [text, setText] = useState('Loading goal...');

  useEffect(() => {
    if (!key) {
      setText('Missing ?key=API_KEY in URL');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/webhooks/goal?key=${encodeURIComponent(key)}`);
        const body = await res.text();
        if (!cancelled) {
          setText(body || 'No goal set. Set a follower or sub goal in Streamer Scheduler → Settings.');
        }
      } catch (e) {
        devCatchLog('OverlayGoal.load', e);
        if (!cancelled) setText('Could not load goal.');
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [key]);

  return (
    <div
      style={{ backgroundColor: 'transparent' }}
      className="w-full h-full flex items-center justify-center"
    >
      <div
        className="rounded-2xl px-6 py-4 text-white shadow-2xl min-w-[280px] max-w-xl"
        style={{
          background:
            'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(22,163,74,0.9))',
          border: '1px solid rgba(134,239,172,0.7)',
        }}
      >
        <div className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-300">
          Stream goal
        </div>
        <div className="mt-1 text-lg font-semibold">
          {text}
        </div>
        <div className="mt-3 text-[10px] text-slate-400">
          Powered by Streamer Scheduler
        </div>
      </div>
    </div>
  );
}

