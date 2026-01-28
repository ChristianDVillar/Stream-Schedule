/**
 * Upload Routes
 * Handles file upload registration and trial/pro limits
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 * 
 * IMPORTANT: The 'uploads' table in Supabase must have 'user_id' as TEXT type,
 * not UUID, to support numeric user IDs from Sequelize.
 * Run the migration script: backend/migrations/fix-uploads-user-id-type.sql
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
    if (file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/'))) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Archivo demasiado grande. Máximo 100MB' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Campo de archivo inesperado' });
    }
    logger.error('Multer error', {
      error: err.message,
      code: err.code,
      field: err.field,
      ip: req.ip
    });
    return res.status(400).json({ error: `Error al procesar archivo: ${err.message}` });
  }
  if (err) {
    // Handle fileFilter errors
    logger.error('File upload error', {
      error: err.message,
      ip: req.ip
    });
    return res.status(400).json({ error: err.message || 'Error al procesar archivo' });
  }
  next();
};

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

  // Validate user object
  if (!req.user || !req.user.id) {
    logger.error('Invalid user object in /api/upload', {
      hasUser: !!req.user,
      hasUserId: !!(req.user && req.user.id),
      ip: req.ip
    });
    return res.status(401).json({ error: 'Usuario no autenticado correctamente' });
  }

  // Verificar que Supabase está configurado
  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase no está configurado. Verifica SUPABASE_URL y SUPABASE_SERVICE_KEY' 
    });
  }

  try {
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
    // Determinar si es usuario trial
    // Si no viene isTrialUser en el body, intentar obtenerlo del usuario autenticado
    let isTrial = isTrialUser;
    let uploads = null; // Initialize uploads variable outside the if block
    
    if (isTrial === undefined && req.user) {
      // Si tenemos el usuario autenticado, verificar su licenseType
      // Handle case where licenseType might be undefined/null
      isTrial = req.user?.licenseType === LICENSE_TYPES.TRIAL;
    }

    // Si es usuario trial, verificar límite diario
    if (isTrial) {
      // Calcular fecha de hace 24 horas
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Contar uploads en las últimas 24 horas
      // Convert user_id to string for Supabase (it stores as text/uuid)
      const { data: uploadsData, error: countError } = await supabase
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

      uploads = uploadsData; // Assign to the outer variable

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
      userId: req.user?.id?.toString() || 'unknown',
      bucket: req.body?.bucket || 'unknown',
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      errorName: err.name,
      errorCode: err.code
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
router.post('/file', requireAuth, (req, res, next) => {
  // Wrap multer middleware to catch errors properly
  upload.single('file')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  // Log request details for debugging
  logger.debug('Upload file request received', {
    hasFile: !!req.file,
    hasUser: !!req.user,
    contentType: req.get('content-type'),
    ip: req.ip
  });

  if (!req.file) {
    logger.warn('No file provided in upload request', {
      hasUser: !!req.user,
      bodyKeys: Object.keys(req.body || {}),
      ip: req.ip
    });
    return res.status(400).json({ error: 'No file provided' });
  }

  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase no está configurado. Verifica SUPABASE_URL y SUPABASE_SERVICE_KEY' 
    });
  }

  // Validate user object
  if (!req.user || !req.user.id) {
    logger.error('Invalid user object in /api/upload/file', {
      hasUser: !!req.user,
      hasUserId: !!(req.user && req.user.id),
      ip: req.ip
    });
    return res.status(401).json({ error: 'Usuario no autenticado correctamente' });
  }

  try {
    const authenticatedUserId = req.user.id.toString();
    const file = req.file;
    
    // Validate file properties
    if (!file.mimetype) {
      logger.error('File missing mimetype', {
        fileName: file.originalname,
        userId: authenticatedUserId,
        ip: req.ip
      });
      return res.status(400).json({ error: 'Archivo inválido: falta tipo MIME' });
    }
    
    if (!file.buffer) {
      logger.error('File missing buffer', {
        fileName: file.originalname,
        userId: authenticatedUserId,
        ip: req.ip
      });
      return res.status(400).json({ error: 'Archivo inválido: falta contenido' });
    }
    
    const bucket = req.body.bucket || (file.mimetype.startsWith('image/') ? 'images' : 'videos');

    // Validate bucket
    if (bucket !== 'images' && bucket !== 'videos') {
      return res.status(400).json({ error: 'Bucket must be "images" or "videos"' });
    }

    // Determine if user is trial
    // Handle case where licenseType might be undefined/null
    const isTrial = req.user?.licenseType === LICENSE_TYPES.TRIAL;
    let uploads = null; // Initialize uploads variable outside the if block

    // Check trial limits before uploading
    if (isTrial) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: uploadsData, error: countError } = await supabase
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

      uploads = uploadsData; // Assign to the outer variable

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
      userId: req.user?.id?.toString() || 'unknown',
      bucket: req.body?.bucket || 'unknown',
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      errorName: err.name,
      errorCode: err.code
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
  // Validate user object first
  if (!req.user || !req.user.id) {
    logger.error('Invalid user object in /api/upload/stats', {
      hasUser: !!req.user,
      hasUserId: !!(req.user && req.user.id),
      ip: req.ip
    });
    return res.status(401).json({ error: 'Usuario no autenticado correctamente' });
  }

  if (!supabase) {
    logger.error('Supabase not configured for stats endpoint');
    return res.status(500).json({ 
      error: 'Supabase no está configurado' 
    });
  }

  try {
    const { user_id } = req.params;
    // Verificar que el user_id coincida con el usuario autenticado (excepto admins)
    const authenticatedUserId = req.user.id.toString();
    // Convert user_id from params to string for comparison (handle UUID format)
    // Handle both number and string types from validation middleware
    const paramUserId = String(user_id).trim();
    
    logger.debug('Stats request', {
      paramUserId,
      authenticatedUserId,
      paramUserIdType: typeof user_id,
      authenticatedUserIdType: typeof req.user.id,
      isAdmin: req.user.isAdmin
    });
    
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

    // Use authenticated user ID to ensure we're using the correct UUID format
    const userIdToQuery = authenticatedUserId;

    // Get all uploads (not just last 24h) for media gallery
    // For stats, we still want last 24h, but for gallery we want more
    logger.debug('Querying Supabase for uploads', {
      userId: userIdToQuery,
      userIdType: typeof userIdToQuery
    });
    
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
    // Handle case where licenseType might be undefined/null
    const isTrial = req.user?.licenseType === LICENSE_TYPES.TRIAL;

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
      authenticatedUserId: req.user?.id?.toString() || 'unknown',
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      errorName: err.name,
      errorCode: err.code
    });
    
    // Return safe error response that won't break frontend
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * DELETE /api/upload/:upload_id
 * Delete an uploaded file from Supabase Storage and database
 * 
 * @param {string} upload_id - ID of the upload record
 */
router.delete('/:upload_id', requireAuth, async (req, res) => {
  const { upload_id } = req.params;

  // Validate user object
  if (!req.user || !req.user.id) {
    logger.error('Invalid user object in /api/upload/:upload_id DELETE', {
      hasUser: !!req.user,
      hasUserId: !!(req.user && req.user.id),
      ip: req.ip
    });
    return res.status(401).json({ error: 'Usuario no autenticado correctamente' });
  }

  if (!supabase) {
    logger.error('Supabase not configured for delete endpoint');
    return res.status(500).json({ 
      error: 'Supabase no está configurado' 
    });
  }

  try {
    const authenticatedUserId = req.user.id.toString();

    // First, get the upload record to verify ownership and get file path
    const { data: uploadRecord, error: fetchError } = await supabase
      .from('uploads')
      .select('id, user_id, bucket, file_path')
      .eq('id', upload_id)
      .single();

    if (fetchError || !uploadRecord) {
      logger.error('Upload record not found', {
        upload_id,
        error: fetchError?.message,
        ip: req.ip
      });
      return res.status(404).json({ 
        error: 'Archivo no encontrado' 
      });
    }

    // Verify ownership (user can only delete their own uploads, unless admin)
    if (uploadRecord.user_id !== authenticatedUserId && !req.user.isAdmin) {
      logger.warn('Unauthorized delete attempt', {
        upload_id,
        recordUserId: uploadRecord.user_id,
        authenticatedUserId,
        ip: req.ip
      });
      return res.status(403).json({ 
        error: 'No tienes permiso para eliminar este archivo' 
      });
    }

    // Delete file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(uploadRecord.bucket)
      .remove([uploadRecord.file_path]);

    if (storageError) {
      logger.error('Error deleting file from Supabase Storage', {
        error: storageError.message,
        bucket: uploadRecord.bucket,
        file_path: uploadRecord.file_path,
        ip: req.ip
      });
      // Continue with database deletion even if storage deletion fails
      // (file might already be deleted or not exist)
    }

    // Delete record from database
    const { error: deleteError } = await supabase
      .from('uploads')
      .delete()
      .eq('id', upload_id);

    if (deleteError) {
      logger.error('Error deleting upload record', {
        error: deleteError.message,
        upload_id,
        ip: req.ip
      });
      return res.status(500).json({ 
        error: 'Error al eliminar registro del archivo',
        details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
      });
    }

    logger.info('File deleted successfully', {
      upload_id,
      userId: authenticatedUserId,
      bucket: uploadRecord.bucket,
      file_path: uploadRecord.file_path,
      ip: req.ip
    });

    res.json({
      message: 'Archivo eliminado exitosamente',
      upload_id,
      bucket: uploadRecord.bucket,
      file_path: uploadRecord.file_path
    });

  } catch (err) {
    logger.error('Error in /api/upload/:upload_id DELETE', {
      error: err.message,
      upload_id,
      userId: req.user?.id?.toString() || 'unknown',
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      errorName: err.name,
      errorCode: err.code
    });
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router;
