import React, { createContext, useContext, useState, useEffect } from 'react';
import esTranslations from '../locales/es.json';
import enTranslations from '../locales/en.json';

const LanguageContext = createContext();

const translations = {
  es: esTranslations,
  en: enTranslations
};

function lookupTranslation(lang, key) {
  const keys = key.split('.');
  let value = translations[lang];
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) return undefined;
  }
  return value;
}

/** When a key is missing, never show raw "namespace.key" in the UI — use readable words instead. */
function humanizeMissingKey(key) {
  const last = key.includes('.') ? key.split('.').pop() : key;
  if (!last) return '';
  const spaced = last
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();
  if (!spaced) return last;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function applyParams(value, params) {
  if (typeof value !== 'string' || !params || Object.keys(params).length === 0) return value;
  return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
    return params[paramKey] !== undefined ? params[paramKey] : match;
  });
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('app_language');
    return saved || 'en'; // Default to English
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const t = (key, params = {}) => {
    const raw = lookupTranslation(language, key);
    if (raw === undefined) return humanizeMissingKey(key);
    if (typeof raw !== 'string') return humanizeMissingKey(key);

    return applyParams(raw, params);
  };

  /** Returns fallback only when the key is missing from the active locale (works even though t() no longer returns raw keys). */
  const tSafe = (key, fallback) => {
    const raw = lookupTranslation(language, key);
    if (raw === undefined || typeof raw !== 'string') return fallback;
    return applyParams(raw, {});
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'es' ? 'en' : 'es');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tSafe, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
