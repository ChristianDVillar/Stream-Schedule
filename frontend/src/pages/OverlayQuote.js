/**
 * Public overlay: random quote widget.
 * Usage: https://your-frontend-url/overlay/quote?key=API_KEY
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { devCatchLog } from '../utils/devCatchLog';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function OverlayQuote() {
  const query = useQuery();
  const key = query.get('key') || query.get('apiKey') || '';
  const [quote, setQuote] = useState('Loading quote...');
  const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');

  useEffect(() => {
    if (!key) {
      setQuote('Missing ?key=API_KEY in URL');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const ts = Date.now();
        const res = await fetch(`${API_URL}/api/webhooks/quote/random?key=${encodeURIComponent(key)}&t=${ts}`, {
          cache: 'no-store',
        });
        const body = await res.text();
        if (!cancelled) {
          setQuote(body || 'No quotes yet. Use !quote your funny line to add one.');
        }
      } catch (e) {
        devCatchLog('OverlayQuote.load', e);
        if (!cancelled) setQuote('Could not load quote.');
      }
    }

    load();
    const id = setInterval(load, 25_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [key, API_URL]);

  return (
    <div
      style={{ backgroundColor: 'transparent' }}
      className="w-full h-full flex items-center justify-center"
    >
      <div
        className="rounded-2xl px-6 py-4 text-white shadow-2xl min-w-[280px] max-w-xl border"
        style={{
          background:
            'linear-gradient(135deg, rgba(15,23,42,0.82), rgba(88,28,135,0.82))',
          borderColor: 'rgba(216,180,254,0.7)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <div className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-300">
          Stream quote
        </div>
        <div className="mt-1 text-sm italic">
          {quote}
        </div>
        <div className="mt-3 text-[10px] text-slate-400">
          Powered by Streamer Scheduler
        </div>
      </div>
    </div>
  );
}

