/**
 * Public overlay: next stream + countdown.
 * Designed for OBS/Streamlabs as a Browser Source.
 * Usage: https://your-frontend-url/overlay/nextstream?key=API_KEY
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { devCatchLog } from '../utils/devCatchLog';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function OverlayNextStream() {
  const query = useQuery();
  const key = query.get('key') || query.get('apiKey') || '';
  const [streamText, setStreamText] = useState('Loading...');
  const [countdownText, setCountdownText] = useState('');

  useEffect(() => {
    if (!key) {
      setStreamText('Missing ?key=API_KEY in URL');
      setCountdownText('');
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [nextRes, countdownRes] = await Promise.all([
          fetch(`/api/webhooks/nextstream?key=${encodeURIComponent(key)}`),
          fetch(`/api/webhooks/countdown?key=${encodeURIComponent(key)}`),
        ]);
        const [nextText, countdown] = await Promise.all([
          nextRes.text(),
          countdownRes.text(),
        ]);
        if (cancelled) return;
        setStreamText(nextText || 'No stream scheduled.');
        setCountdownText(countdown || '');
      } catch (e) {
        devCatchLog('OverlayNextStream.load', e);
        if (!cancelled) {
          setStreamText('Could not load schedule.');
          setCountdownText('');
        }
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
      <div className="rounded-2xl px-6 py-4 text-white shadow-2xl min-w-[320px] max-w-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,64,175,0.9))',
          border: '1px solid rgba(148,163,184,0.6)',
        }}
      >
        <div className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-300">
          Next stream
        </div>
        <div className="mt-1 text-lg font-semibold">
          {streamText}
        </div>
        {countdownText && (
          <div className="mt-1 text-sm text-slate-200">
            {countdownText}
          </div>
        )}
        <div className="mt-3 text-[10px] text-slate-400">
          Powered by Streamer Scheduler
        </div>
      </div>
    </div>
  );
}

