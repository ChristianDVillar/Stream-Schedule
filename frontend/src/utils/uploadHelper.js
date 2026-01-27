/**
 * Upload Helper Functions
 * Complete flow for uploading files with trial/pro limits
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { uploadFile, getPublicImageUrl, getSignedVideoUrl } from './supabaseClient';
import { registerUpload } from '../api';
import toast from 'react-hot-toast';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
};

/**
 * Complete upload flow: Upload to Supabase Storage + Register in backend
 * @param {Object} params
 * @param {File} params.file - File to upload
 * @param {string} params.bucket - 'images' or 'videos'
 * @param {number|string} params.userId - User ID (optional, will be inferred from auth token)
 * @param {boolean} params.isTrialUser - Whether user is on trial (optional, will be inferred from user)
 * @returns {Promise<{url: string, error: Error|null}>}
 */
export async function handleUpload({ file, bucket, userId, isTrialUser }) {
  try {
    // Validate Supabase is configured
    if (!isSupabaseConfigured()) {
      const errorMsg = 'Supabase no esta configurado. Verifica REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY en las variables de entorno.';
      toast.error(errorMsg);
      console.error('Supabase configuration missing:', {
        hasUrl: !!process.env.REACT_APP_SUPABASE_URL,
        hasKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY
      });
      return { url: null, error: new Error('Supabase not configured') };
    }

    // Step 1: Upload file to Supabase Storage
    const uploadResult = await uploadFile(file, bucket, userId?.toString());
    
    if (uploadResult.error) {
      toast.error('Error subiendo archivo a Supabase Storage');
      return { url: null, error: uploadResult.error };
    }

    // Step 2: Register upload in backend (this checks trial limits)
    // user_id is optional - backend will use authenticated user from token
    try {
      const response = await registerUpload({
        ...(userId && { user_id: userId }), // Only include if provided
        bucket,
        file_path: uploadResult.path,
        ...(isTrialUser !== undefined && { isTrialUser }) // Only include if provided
      });

      // Check if upload was rejected due to limits
      if (response.data.error) {
        toast.error(response.data.error);
        // Optionally: Delete the uploaded file from storage if limit was reached
        return { url: null, error: new Error(response.data.error) };
      }

      toast.success('Archivo subido y registrado con éxito');
    } catch (registerError) {
      // If registration fails, the file is already uploaded
      // You might want to delete it or handle this case
      console.error('Error registrando upload:', registerError);
      const errorMessage = registerError.response?.data?.error || 'Error al registrar upload';
      toast.error(errorMessage);
      return { url: null, error: new Error(errorMessage) };
    }

    // Step 3: Get URL for display
    let url;
    if (bucket === 'images') {
      url = getPublicImageUrl(uploadResult.path);
    } else {
      url = await getSignedVideoUrl(uploadResult.path, 300); // 5 minutes for preview
    }

    return { url, error: null };
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
      return null;
    }
    const response = await getStats(userId);
    return response.data;
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return null;
  }
}
