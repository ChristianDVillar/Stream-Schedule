/**
 * Upload Helper Functions
 * Complete flow for uploading files with trial/pro limits
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { uploadFile, getPublicImageUrl, getSignedVideoUrl } from './supabaseClient';
import { registerUpload, uploadFileThroughBackend } from '../api';
import toast from 'react-hot-toast';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
};

/**
 * Complete upload flow: Upload through backend (secure method)
 * This uses the backend Service Role Key instead of frontend anon key
 * @param {Object} params
 * @param {File} params.file - File to upload
 * @param {string} params.bucket - 'images' or 'videos' (optional, auto-detected)
 * @param {number|string} params.userId - User ID (optional, not needed when using backend)
 * @param {boolean} params.isTrialUser - Whether user is on trial (optional, backend will check)
 * @returns {Promise<{url: string, error: Error|null}>}
 */
export async function handleUpload({ file, bucket, userId, isTrialUser }) {
  try {
    // Use backend upload method (more secure, uses Service Role Key)
    try {
      const response = await uploadFileThroughBackend(file, bucket);
      
      if (response.data.error) {
        toast.error(response.data.error);
        return { url: null, error: new Error(response.data.error) };
      }

      toast.success('Archivo subido exitosamente');
      return { 
        url: response.data.url, 
        path: response.data.file_path,
        bucket: response.data.bucket,
        error: null 
      };
    } catch (uploadError) {
      console.error('Error uploading through backend:', uploadError);
      const errorMessage = uploadError.response?.data?.error || uploadError.message || 'Error al subir archivo';
      toast.error(errorMessage);
      return { url: null, error: new Error(errorMessage) };
    }
  } catch (error) {
    console.error('Error en handleUpload:', error);
    toast.error('Error subiendo archivo');
    return { url: null, error };
  }
}

/**
 * Get upload statistics for a user
 * @param {string} userId - User UUID (optional, will use authenticated user if not provided)
 * @returns {Promise<Object>} Upload stats
 */
export async function getUploadStats(userId) {
  try {
    const { getUploadStats: getStats } = await import('../api');
    // If userId is not provided, we need to get it from the user object
    // For now, require userId - can be enhanced later to get from auth context
    if (!userId) {
      console.warn('getUploadStats requires userId');
      return { uploads: [], totalUploads24h: 0, isTrialUser: false };
    }
    const response = await getStats(userId);
    return response.data || { uploads: [], totalUploads24h: 0, isTrialUser: false };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    // Return empty stats instead of null to prevent errors in components
    return { uploads: [], totalUploads24h: 0, isTrialUser: false, error: error.message };
  }
}
