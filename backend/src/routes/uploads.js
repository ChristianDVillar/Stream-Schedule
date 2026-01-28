/**
 * Upload Routes
 * Handles file upload registration and trial/pro limits
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import multer from 'multer';
import { supabase } from '../utils/supabaseClient.js';
import { LICENSE_TYPES } from '../constants/licenseTypes.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { registerUploadSchema, getUploadStatsSchema } from '../validators/uploadSchemas.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Configure multer for memory storage (we'll upload directly to Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  }
});

// Límite diario para usuarios trial
const TRIAL_DAILY_LIMIT = 1;

/**
 * POST /api/upload
 * Registra una subida de archivo y verifica límites de trial/pro
 * 
 * Body:
 * - user_id: UUID del usuario (opcional, se usa el usuario autenticado si no se proporciona)
 * - bucket: 'images' o 'videos'
 * - file_path: Ruta del archivo en Supabase Storage
 * - isTrialUser: boolean (opcional, se puede inferir del user)
 */
router.post('/', requireAuth, validateBody(registerUploadSchema), async (req, res) => {
  const { user_id, bucket, file_path, isTrialUser } = req.body;

  // Usar el usuario autenticado si no se proporciona user_id
  // O verificar que el user_id coincida con el usuario autenticado
  const authenticatedUserId = req.user.id.toString();
  const providedUserId = user_id ? user_id.toString() : null;
  
  // Si se proporciona user_id, debe coincidir con el usuario autenticado (excepto admins)
  if (providedUserId && providedUserId !== authenticatedUserId && !req.user.isAdmin) {
    return res.status(403).json({ 
      error: 'No tienes permiso para registrar uploads de otro usuario' 
    });
  }

  // Usar el ID del usuario autenticado
  const finalUserId = providedUserId || authenticatedUserId;

  // Bucket ya está validado por el schema

  // Verificar que Supabase está configurado
  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase no está configurado. Verifica SUPABASE_URL y SUPABASE_SERVICE_KEY' 
    });
  }

  try {
    // Determinar si es usuario trial
    // Si no viene isTrialUser en el body, intentar obtenerlo del usuario autenticado
    let isTrial = isTrialUser;
    
    if (isTrial === undefined && req.user) {
      // Si tenemos el usuario autenticado, verificar su licenseType
      isTrial = req.user.licenseType === LICENSE_TYPES.TRIAL;
    }

    // Si es usuario trial, verificar límite diario
    if (isTrial) {
      // Calcular fecha de hace 24 horas
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Contar uploads en las últimas 24 horas
      // Convert user_id to string for Supabase (it stores as text/uuid)
      const { data: uploads, error: countError } = await supabase
        .from('uploads')
        .select('id')
        .eq('user_id', finalUserId.toString())
        .gte('created_at', twentyFourHoursAgo);

      if (countError) {
        logger.error('Error counting uploads', {
          error: countError.message,
          userId: finalUserId,
          ip: req.ip
        });
        return res.status(500).json({ 
          error: 'Error al verificar límites de upload' 
        });
      }

      // Verificar si alcanzó el límite
      if (uploads && uploads.length >= TRIAL_DAILY_LIMIT) {
        return res.status(403).json({ 
          error: `Has alcanzado el límite diario de trial (${TRIAL_DAILY_LIMIT} upload por día)` 
        });
      }
    }

    // Registrar upload en la tabla uploads
    // Convert user_id to string for Supabase (it stores as text/uuid)
    const { data, error: insertError } = await supabase
      .from('uploads')
      .insert([
        { 
          user_id: finalUserId.toString(), 
          bucket, 
          file_path,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (insertError) {
      logger.error('Error inserting upload', {
        error: insertError.message,
        userId: finalUserId,
        bucket,
        file_path,
        ip: req.ip
      });
      return res.status(500).json({ 
        error: 'Error al registrar upload',
        details: insertError.message 
      });
    }

    // Respuesta exitosa
    logger.info('Upload registered', {
      userId: finalUserId,
      bucket,
      file_path,
      isTrialUser: isTrial,
      remainingUploads: isTrial ? Math.max(0, TRIAL_DAILY_LIMIT - (uploads?.length || 0) - 1) : null
    });
    
    res.json({ 
      message: 'Upload registrado exitosamente', 
      upload: data[0],
      isTrialUser: isTrial,
      remainingUploads: isTrial ? Math.max(0, TRIAL_DAILY_LIMIT - (uploads?.length || 0) - 1) : null
    });

  } catch (err) {
    logger.error('Error in /api/upload', {
      error: err.message,
      userId: finalUserId,
      bucket,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/upload/file
 * Upload file through backend (more secure, uses Service Role Key)
 * 
 * Multipart form data:
 * - file: The file to upload
 * - bucket: 'images' or 'videos' (optional, auto-detected from file type)
 */
router.post('/file', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase no está configurado. Verifica SUPABASE_URL y SUPABASE_SERVICE_KEY' 
    });
  }

  const authenticatedUserId = req.user.id.toString();
  const file = req.file;
  const bucket = req.body.bucket || (file.mimetype.startsWith('image/') ? 'images' : 'videos');

  // Validate bucket
  if (bucket !== 'images' && bucket !== 'videos') {
    return res.status(400).json({ error: 'Bucket must be "images" or "videos"' });
  }

  try {
    // Determine if user is trial
    const isTrial = req.user.licenseType === LICENSE_TYPES.TRIAL;

    // Check trial limits before uploading
    if (isTrial) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: uploads, error: countError } = await supabase
        .from('uploads')
        .select('id')
        .eq('user_id', authenticatedUserId)
        .gte('created_at', twentyFourHoursAgo);

      if (countError) {
        logger.error('Error counting uploads', {
          error: countError.message,
          userId: authenticatedUserId,
          ip: req.ip
        });
        return res.status(500).json({ 
          error: 'Error al verificar límites de upload' 
        });
      }

      if (uploads && uploads.length >= TRIAL_DAILY_LIMIT) {
        return res.status(403).json({ 
          error: `Has alcanzado el límite diario de trial (${TRIAL_DAILY_LIMIT} upload por día)` 
        });
      }
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedFileName}`;
    const filePath = `${authenticatedUserId}/${fileName}`;

    // Upload file to Supabase Storage using Service Role Key
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.mimetype
      });

    if (uploadError) {
      logger.error('Error uploading file to Supabase', {
        error: uploadError.message,
        userId: authenticatedUserId,
        bucket,
        filePath,
        ip: req.ip
      });
      return res.status(500).json({ 
        error: 'Error al subir archivo a Supabase Storage',
        details: uploadError.message 
      });
    }

    // Register upload in database
    const { data: insertData, error: insertError } = await supabase
      .from('uploads')
      .insert([
        { 
          user_id: authenticatedUserId, 
          bucket, 
          file_path: uploadData.path,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (insertError) {
      logger.error('Error inserting upload', {
        error: insertError.message,
        userId: authenticatedUserId,
        bucket,
        file_path: uploadData.path,
        ip: req.ip
      });
      // File is already uploaded, but registration failed
      // Optionally: Delete the file from storage
      return res.status(500).json({ 
        error: 'Error al registrar upload',
        details: insertError.message 
      });
    }

    // Get URL for the uploaded file
    let url;
    if (bucket === 'images') {
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(uploadData.path);
      url = urlData.publicUrl;
    } else {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('videos')
        .createSignedUrl(uploadData.path, 3600);
      if (signedError) {
        logger.error('Error creating signed URL', {
          error: signedError.message,
          filePath: uploadData.path
        });
      } else {
        url = signedData.signedUrl;
      }
    }

    logger.info('File uploaded successfully', {
      userId: authenticatedUserId,
      bucket,
      file_path: uploadData.path,
      isTrialUser: isTrial,
      remainingUploads: isTrial ? Math.max(0, TRIAL_DAILY_LIMIT - (uploads?.length || 0) - 1) : null
    });

    res.json({
      message: 'Archivo subido exitosamente',
      upload: insertData[0],
      url,
      bucket,
      file_path: uploadData.path,
      isTrialUser: isTrial,
      remainingUploads: isTrial ? Math.max(0, TRIAL_DAILY_LIMIT - (uploads?.length || 0) - 1) : null
    });

  } catch (err) {
    logger.error('Error in /api/upload/file', {
      error: err.message,
      userId: authenticatedUserId,
      bucket,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * GET /api/upload/stats/:user_id
 * Obtiene estadísticas de uploads del usuario
 * 
 * @param {string} user_id - UUID del usuario (debe coincidir con el usuario autenticado)
 */
router.get('/stats/:user_id', requireAuth, validateParams(getUploadStatsSchema), async (req, res) => {
  const { user_id } = req.params;

  // Verificar que el user_id coincida con el usuario autenticado (excepto admins)
  const authenticatedUserId = req.user.id.toString();
  // Convert user_id from params to string for comparison (handle UUID format)
  const paramUserId = user_id.toString().trim();
  
  if (paramUserId !== authenticatedUserId && !req.user.isAdmin) {
    logger.warn('Unauthorized stats access attempt', {
      requestedUserId: paramUserId,
      authenticatedUserId,
      ip: req.ip
    });
    return res.status(403).json({ 
      error: 'No tienes permiso para ver estadísticas de otro usuario' 
    });
  }

  if (!supabase) {
    logger.error('Supabase not configured for stats endpoint');
    return res.status(500).json({ 
      error: 'Supabase no está configurado' 
    });
  }

  try {
    // Use authenticated user ID to ensure we're using the correct UUID format
    const userIdToQuery = authenticatedUserId;

    // Get all uploads (not just last 24h) for media gallery
    // For stats, we still want last 24h, but for gallery we want more
    const { data: uploads, error } = await supabase
      .from('uploads')
      .select('id, bucket, file_path, created_at')
      .eq('user_id', userIdToQuery) // Use UUID directly
      .order('created_at', { ascending: false })
      .limit(100); // Limit to last 100 uploads

    if (error) {
      logger.error('Error getting upload stats from Supabase', {
        error: error.message,
        errorCode: error.code,
        userId: userIdToQuery,
        ip: req.ip
      });
      return res.status(500).json({ 
        error: 'Error al obtener estadísticas',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Determinar si es trial
    let isTrial = false;
    if (req.user) {
      isTrial = req.user.licenseType === LICENSE_TYPES.TRIAL;
    }

    // Calculate 24h stats separately
    // Ensure we handle null/undefined uploads gracefully
    const uploadsList = uploads || [];
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const uploads24h = uploadsList.filter(u => {
      if (!u || !u.created_at) return false;
      const uploadDate = new Date(u.created_at);
      return uploadDate >= twentyFourHoursAgo;
    });
    
    // Return safe defaults - never return null/undefined that could cause frontend errors
    res.json({
      totalUploads24h: uploads24h.length || 0,
      isTrialUser: isTrial,
      dailyLimit: isTrial ? TRIAL_DAILY_LIMIT : null,
      remainingUploads: isTrial ? Math.max(0, TRIAL_DAILY_LIMIT - uploads24h.length) : null,
      uploads: uploadsList // Always return an array, even if empty
    });

  } catch (err) {
    logger.error('Error in /api/upload/stats', {
      error: err.message,
      errorStack: err.stack,
      userId: user_id,
      authenticatedUserId,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    // Return safe error response that won't break frontend
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router;
