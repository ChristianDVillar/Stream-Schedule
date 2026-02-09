/**
 * Supabase Client for Frontend
 * Uses Anon Key (public, safe for frontend)
 * Single instance (singleton) to avoid "Multiple GoTrueClient instances" warning.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Supabase not configured; upload/OAuth may use backend only
}

// Rewrite requests to Supabase base URL only (no path) to /auth/v1/settings to avoid GET https://xxx.supabase.co/ 404 during OAuth
const AUTH_SETTINGS_PATH = '/auth/v1/settings';
function createSafeFetch() {
  const base = (supabaseUrl || '').replace(/\/$/, '');
  return function safeFetch(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url);
    if (url && base) {
      const u = String(url).replace(/\/$/, '').split('?')[0];
      if (u === base) {
        const newUrl = base + AUTH_SETTINGS_PATH;
        input = typeof input === 'string' ? newUrl : new Request(newUrl, input);
      }
    }
    return fetch(input, init);
  };
}

// Singleton: reuse one client across the app (avoids multiple GoTrueClient instances with HMR / multiple imports)
const globalKey = '__STREAMER_SCHEDULER_SUPABASE__';
function getSupabaseClient() {
  if (typeof window !== 'undefined' && window[globalKey]) {
    return window[globalKey];
  }
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: createSafeFetch() },
  });
  if (typeof window !== 'undefined') {
    window[globalKey] = client;
  }
  return client;
}

export const supabase = getSupabaseClient();

/**
 * Upload a file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - 'images' or 'videos'
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<{path: string, error: Error|null}>}
 */
export async function uploadFile(file, bucket, userId) {
  if (!supabase) {
    const error = new Error('Supabase no está configurado. Verifica REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY');
    return { path: null, error };
  }

  if (bucket !== 'images' && bucket !== 'videos') {
    const error = new Error('Bucket debe ser "images" o "videos"');
    return { path: null, error };
  }

  try {
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedFileName}`;
    const filePath = userId ? `${userId}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      // Provide more specific error messages
      if (error.message.includes('Bucket not found')) {
        return { path: null, error: new Error('Bucket no encontrado. Verifica que los buckets "images" y "videos" existan en Supabase Storage') };
      }
      if (error.message.includes('new row violates')) {
        return { path: null, error: new Error('Error de permisos. Verifica las politicas de Storage en Supabase') };
      }
      return { path: null, error };
    }

    return { path: data.path, error: null };
  } catch (error) {
    return { path: null, error };
  }
}

/** Supabase Storage path must be non-empty and not contain \ : * ? " < > | */
function isStoragePathValid(filePath) {
  if (filePath == null || typeof filePath !== 'string') return false;
  const trimmed = filePath.trim();
  if (!trimmed) return false;
  if (/[\\:*?"<>|]/.test(trimmed)) return false;
  return true;
}

/** Avoid using the Supabase base URL as resource URL (causes GET base 404) */
function ensureNotBaseUrl(url) {
  if (!url || typeof url !== 'string') return;
  const base = (supabaseUrl || '').replace(/\/$/, '');
  const u = url.replace(/\/$/, '').split('?')[0];
  if (base && u === base) {
    throw new Error('requested path is invalid');
  }
}

/**
 * Get public URL for an image
 * @param {string} filePath - Path to the file in storage
 * @returns {string} Public URL
 */
export function getPublicImageUrl(filePath) {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }
  if (!isStoragePathValid(filePath)) {
    throw new Error('requested path is invalid');
  }

  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(filePath.trim().replace(/^\/+/, ''));

  ensureNotBaseUrl(data.publicUrl);
  return data.publicUrl;
}

/**
 * Get signed URL for a video (videos are private)
 * @param {string} filePath - Path to the file in storage
 * @param {number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} Signed URL
 */
export async function getSignedVideoUrl(filePath, expiresIn = 3600) {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }
  if (!isStoragePathValid(filePath)) {
    throw new Error('requested path is invalid');
  }

  const path = filePath.trim().replace(/^\/+/, '');
  const { data, error } = await supabase.storage
    .from('videos')
    .createSignedUrl(path, expiresIn);

  if (error) throw error;

  ensureNotBaseUrl(data.signedUrl);
  return data.signedUrl;
}
