/**
 * Public overlay: random quote widget.
 * Usage: https://your-frontend-url/overlay/quote?key=API_KEY
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function OverlayQuote() {
  const query = useQuery();
  const key = query.get('key') || query.get('apiKey') || '';
  const [quote, setQuote] = useState('Loading quote...');

  useEffect(() => {
    if (!key) {
      setQuote('Missing ?key=API_KEY in URL');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/webhooks/quote/random?key=${encodeURIComponent(key)}`);
        const body = await res.text();
        if (!cancelled) {
          setQuote(body || 'No quotes yet. Use !quote your funny line to add one.');
        }
      } catch {
        if (!cancelled) setQuote('Could not load quote.');
      }
    }

    load();
    const id = setInterval(load, 90_000);
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
            'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(147,51,234,0.9))',
          border: '1px solid rgba(216,180,254,0.7)',
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

