/**
 * Supabase Client for Frontend
 * Uses Anon Key (public, safe for frontend)
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY not set. Upload functionality will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Upload a file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - 'images' or 'videos'
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<{path: string, error: Error|null}>}
 */
export async function uploadFile(file, bucket, userId) {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  if (bucket !== 'images' && bucket !== 'videos') {
    throw new Error('Bucket debe ser "images" o "videos"');
  }

  try {
    // Generate unique file path: bucket/userId/timestamp-filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = userId ? `${userId}/${fileName}` : fileName;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    return { path: data.path, error: null };
  } catch (error) {
    console.error('Error in uploadFile:', error);
    return { path: null, error };
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

  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(filePath);

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

  const { data, error } = await supabase.storage
    .from('videos')
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }

  return data.signedUrl;
}
