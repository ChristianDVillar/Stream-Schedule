/**
 * Stream mode: when ON, hides sensitive data (username, API keys, etc.) so nothing is shared when streaming.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { devCatchLog } from '../utils/devCatchLog';

const STORAGE_KEY = 'streamer_scheduler_stream_mode';

const StreamModeContext = createContext(null);

export function StreamModeProvider({ children }) {
  const [streamMode, setStreamMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch (e) {
      devCatchLog('StreamModeProvider.localStorage.get', e);
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, streamMode ? 'true' : 'false');
    } catch (e) {
      devCatchLog('StreamModeProvider.localStorage.set', e);
    }
  }, [streamMode]);

  const toggleStreamMode = () => setStreamMode((prev) => !prev);

  return (
    <StreamModeContext.Provider value={{ streamMode, setStreamMode, toggleStreamMode }}>
      {children}
    </StreamModeContext.Provider>
  );
}

export function useStreamMode() {
  const ctx = useContext(StreamModeContext);
  return ctx || { streamMode: false, setStreamMode: () => {}, toggleStreamMode: () => {} };
}
