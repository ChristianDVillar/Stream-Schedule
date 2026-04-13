/**
 * Public overlay: latest chat idea/suggestion.
 * Intended to pair with !idea / !suggest style commands.
 * Usage: https://your-frontend-url/overlay/suggestions?key=API_KEY
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { devCatchLog } from '../utils/devCatchLog';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function OverlaySuggestions() {
  const query = useQuery();
  const key = query.get('key') || query.get('apiKey') || '';
  const [idea, setIdea] = useState('');
  const [visible, setVisible] = useState(false);
  const [lastIdea, setLastIdea] = useState('');

  useEffect(() => {
    if (!key) {
      setIdea('Missing ?key=API_KEY in URL');
      setVisible(true);
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`/api/webhooks/idea/latest?key=${encodeURIComponent(key)}`);
        const text = (await res.text()).trim();
        if (cancelled) return;
        if (text && text !== lastIdea) {
          setLastIdea(text);
          setIdea(text);
          setVisible(true);
          setTimeout(() => {
            if (!cancelled) setVisible(false);
          }, 6000);
        }
      } catch (e) {
        devCatchLog('OverlaySuggestions.check', e);
      }
    }

    const id = setInterval(check, 5000);
    check();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [key, lastIdea]);

  return (
    <div
      style={{ backgroundColor: 'transparent' }}
      className="w-full h-full pointer-events-none"
    >
      <div
        className={`fixed bottom-8 left-8 max-w-md transform transition-all duration-500 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div
          className="rounded-2xl px-4 py-3 text-white shadow-2xl"
          style={{
            background:
              'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(8,47,73,0.9))',
            border: '1px solid rgba(148,163,184,0.6)',
          }}
        >
          <div className="text-[11px] font-semibold tracking-[0.16em] uppercase text-slate-300">
            New chat idea
          </div>
          <div className="mt-1 text-sm">
            {idea || 'Waiting for !idea or !suggest from chat...'}
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            Powered by Streamer Scheduler
          </div>
        </div>
      </div>
    </div>
  );
}

