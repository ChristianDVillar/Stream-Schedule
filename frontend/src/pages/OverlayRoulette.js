/**
 * Roulette (spin wheel) overlay for OBS.
 * URL: /overlay/roulette?key=API_KEY
 * Viewers join with !join (bot calls POST /api/webhooks/roulette/join). Streamer spins from dashboard or !spin.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const WHEEL_SIZE = 520;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = 240;
const COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#3F51B5', '#009688'];

function drawWheel(ctx, players, rotationDeg = 0) {
  if (!ctx || !players.length) return;
  const sliceAngle = (2 * Math.PI) / players.length;
  const rot = (rotationDeg * Math.PI) / 180;

  for (let i = 0; i < players.length; i++) {
    const start = rot + sliceAngle * i;
    const end = rot + sliceAngle * (i + 1);
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.arc(CENTER, CENTER, RADIUS, start, end);
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(CENTER, CENTER);
    ctx.rotate(start + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 2;
    const label = players[i].length > 12 ? players[i].slice(0, 11) + '…' : players[i];
    ctx.fillText(label, RADIUS - 12, 5);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 28, 0, 2 * Math.PI);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();
}

export default function OverlayRoulette() {
  const [searchParams] = useSearchParams();
  const key = searchParams.get('key') || searchParams.get('apiKey') || '';
  const [players, setPlayers] = useState([]);
  const [winner, setWinner] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const rotationRef = useRef(0);
  rotationRef.current = rotation;

  useEffect(() => {
    if (!key) {
      setError('Missing ?key=API_KEY in URL');
      return;
    }

    const socket = io(`${API_URL}/roulette`, {
      query: { key },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('connect_error', () => setError('Could not connect. Check API key and backend URL.'));
    socket.on('roulette_players', (data) => {
      setPlayers(data.players || []);
      setWinner(null);
    });
    socket.on('roulette_spin', (data) => {
      const list = data.players || [];
      const win = data.winner || '';
      setPlayers(list);
      setWinner(win);
      setSpinning(true);

      const winnerIndex = Math.max(0, list.findIndex((p) => p.toLowerCase() === win.toLowerCase()));
      const sliceDeg = 360 / Math.max(list.length, 1);
      const winnerCenterDeg = winnerIndex * sliceDeg + sliceDeg / 2;
      const targetRotation = 360 * 5 + (360 - winnerCenterDeg);
      const startRotation = rotationRef.current;
      const startTime = Date.now();
      const duration = 5000;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const current = startRotation + ease * (targetRotation - startRotation);
        setRotation(current);
        if (t < 1) requestAnimationFrame(animate);
        else setSpinning(false);
      };
      requestAnimationFrame(animate);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [key]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !players.length) return;
    const ctx = canvas.getContext('2d');
    drawWheel(ctx, players, rotation);
  }, [players, rotation]);

  if (!key) {
    return (
      <div style={{ background: 'transparent' }} className="w-full min-h-screen flex items-center justify-center">
        <div className="rounded-xl px-6 py-4 bg-black/80 text-white text-center">
          {error || 'Add ?key=API_KEY to the URL (from Settings → Bots).'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'transparent' }} className="w-full min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Pointer at top */}
      <div
        className="absolute z-10"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, calc(-50% - ' + (RADIUS + 20) + 'px))',
          width: 0,
          height: 0,
          borderLeft: '14px solid transparent',
          borderRight: '14px solid transparent',
          borderBottom: '28px solid #e53935',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }}
      />

      <canvas
        ref={canvasRef}
        width={WHEEL_SIZE}
        height={WHEEL_SIZE}
        style={{
          maxWidth: '90vmin',
          maxHeight: '90vmin',
          pointerEvents: 'none',
        }}
      />

      {winner && !spinning && (
        <div
          className="absolute text-center font-bold text-white"
          style={{
            bottom: '8%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 'clamp(24px, 5vw, 48px)',
            textShadow: '0 0 20px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          🎉 {winner}
        </div>
      )}

      {!connected && key && !error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
          Connecting…
        </div>
      )}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/50 text-xs">
        Powered by Streamer Scheduler
      </div>
    </div>
  );
}
