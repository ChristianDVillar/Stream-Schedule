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
import { cache } from '../utils/cache.js';
import { compressVideoQueued, compressImage } from '../utils/compressMedia.js';

const router = express.Router();

// Test endpoint - MUST be first so /stats/:user_id does not capture "test"
// GET /api/upload/test (no auth) - use this to verify upload routes are reachable
router.get('/test', (req, res) => {
  res.json({
    ok: true,
    message: 'Upload router is reachable',
    path: req.path,
    baseUrl: req.baseUrl
  });
});

// Log all registered routes for debugging (development only)
if (process.env.NODE_ENV === 'development') {
  router.use((req, res, next) => {
    if (req.path === '/video-url') {
      logger.debug('Video URL route matched', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        query: req.query
      });
    }
    next();
  });
}

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

// Límite diario: 1 subida por día (solo aplica a usuarios no trial; trial por ahora sin límite)
const DAILY_UPLOAD_LIMIT = 1;

/**
 * GET /api/upload/video-url
 * Get a signed URL for a video file
 * IMPORTANT: This route must be defined BEFORE /stats/:user_id to avoid route conflicts
 * 
 * @query {string} file_path - Path to the video file in storage (URL-encoded)
 * @query {number} expiresIn - Expiration time in seconds (default: 3600)
 */
router.get('/video-url', requireAuth, async (req, res, next) => {
  // Log that this endpoint was hit - this should appear in server logs
  logger.info('Video URL endpoint hit', {
    path: req.path,
    fullPath: req.originalUrl,
    query: req.query,
    method: req.method,
    ip: req.ip,
    hasUser: !!req.user
  });
  
  try {
    // Get file_path from query parameter (more reliable for special characters)
    let file_path = typeof req.query.file_path === 'string' ? req.query.file_path.trim() : '';
    const expiresIn = parseInt(req.query.expiresIn) || 3600;

    if (!file_path) {
      logger.warn('Video URL endpoint called without file_path', {
        query: req.query,
        ip: req.ip
      });
      return res.status(400).json({
        error: 'file_path query parameter is required'
      });
    }

    // Supabase Storage: path must not start with / and must not contain invalid chars
    if (file_path.startsWith('/')) {
      file_path = file_path.replace(/^\/+/, '');
    }
    const invalidPathChars = /[\\:*?"<>|]/;
    if (invalidPathChars.test(file_path)) {
      logger.warn('Video URL endpoint called with invalid file_path characters', { file_path: file_path.substring(0, 100), ip: req.ip });
      return res.status(400).json({
        error: 'requested path is invalid',
        message: 'File path contains invalid characters'
      });
    }

    // Validate user object
    if (!req.user || !req.user.id) {
      logger.error('Invalid user object in /api/upload/video-url GET', {
        hasUser: !!req.user,
        hasUserId: !!(req.user && req.user.id),
        ip: req.ip
      });
      return res.status(401).json({ error: 'Usuario no autenticado correctamente' });
    }

    if (!supabase) {
      logger.error('Supabase not configured for video URL endpoint');
      return res.status(500).json({ 
        error: 'Supabase no está configurado' 
      });
    }

    const authenticatedUserId = req.user.id.toString();

    logger.debug('Video URL request', {
      file_path,
      userId: authenticatedUserId,
      expiresIn,
      ip: req.ip
    });

    // Verify that the file belongs to the user
    const { data: uploadRecord, error: fetchError } = await supabase
      .from('uploads')
      .select('id, user_id, bucket, file_path')
      .eq('file_path', file_path)
      .eq('bucket', 'videos')
      .single();

    if (fetchError || !uploadRecord) {
      logger.warn('Video file record not found in database', {
        file_path,
        userId: authenticatedUserId,
        error: fetchError?.message,
        ip: req.ip
      });
      return res.status(404).json({ 
        error: 'Archivo de video no encontrado en la base de datos',
        details: process.env.NODE_ENV === 'development' ? fetchError?.message : undefined
      });
    }

    // Verify ownership
    if (uploadRecord.user_id !== authenticatedUserId) {
      logger.warn('Unauthorized access attempt to video file', {
        file_path,
        ownerId: uploadRecord.user_id,
        requesterId: authenticatedUserId,
        ip: req.ip
      });
      return res.status(403).json({ 
        error: 'No tienes permiso para acceder a este archivo' 
      });
    }

    // Normalize path for Supabase (no leading slashes, valid chars)
    const storagePath = uploadRecord.file_path.replace(/^\/+/, '').trim();
    if (!storagePath || /[\\:*?"<>|]/.test(storagePath)) {
      return res.status(400).json({
        error: 'requested path is invalid',
        message: 'Stored file path is invalid or contains disallowed characters.'
      });
    }

    // Generate signed URL using Service Role Key (backend has full access)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('videos')
      .createSignedUrl(storagePath, expiresIn);

    if (signedError) {
      const errMsg = signedError.message || signedError.error || '';
      const isInvalidPath = errMsg.includes('requested path is invalid') || (signedError.error === 'requested path is invalid');

      if (isInvalidPath) {
        logger.warn('Invalid file path for signed URL', {
          file_path: uploadRecord.file_path,
          userId: authenticatedUserId,
          ip: req.ip
        });
        return res.status(400).json({
          error: 'requested path is invalid',
          message: 'File path format is invalid. It may be empty, contain invalid characters, or be malformed.'
        });
      }

      // Check if the error is because the file doesn't exist
      if (errMsg && (
        errMsg.includes('not found') ||
        errMsg.includes('Object not found') ||
        signedError.statusCode === 400
      )) {
        logger.warn('Video file not found in Storage (orphaned record)', {
          file_path: uploadRecord.file_path,
          userId: authenticatedUserId,
          uploadId: uploadRecord.id,
          ip: req.ip
        });
        return res.status(404).json({
          error: 'El archivo de video no existe en Storage',
          details: process.env.NODE_ENV === 'development'
            ? `File path: ${uploadRecord.file_path}. This record may be orphaned (file deleted but record remains in database).`
            : undefined,
          orphaned: true
        });
      }

      logger.error('Error creating signed URL for video', {
        error: signedError.message,
        file_path: uploadRecord.file_path,
        userId: authenticatedUserId,
        ip: req.ip
      });
      return res.status(500).json({
        error: 'Error al generar URL firmada',
        details: process.env.NODE_ENV === 'development' ? signedError.message : undefined
      });
    }

    logger.info('Video signed URL generated successfully', {
      file_path: uploadRecord.file_path,
      userId: authenticatedUserId,
      expiresIn,
      ip: req.ip
    });

    res.json({
      signedUrl: signedData.signedUrl,
      expiresIn,
      file_path: uploadRecord.file_path
    });
  } catch (err) {
    logger.error('Unexpected error in /api/upload/video-url GET', {
      error: err.message,
      file_path: req.query.file_path,
      userId: req.user?.id,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    // Always return JSON, never HTML
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

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

    // Límite diario: solo 1 subida por día para usuarios NO trial (trial por ahora sin límite)
    if (!isTrial) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
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

      uploads = uploadsData;

      if (uploads && uploads.length >= DAILY_UPLOAD_LIMIT) {
        return res.status(403).json({ 
          error: `Has alcanzado el límite diario (${DAILY_UPLOAD_LIMIT} upload por día)` 
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

    // Invalidate cache for this user's stats
    const statsCacheKey = `stats:${finalUserId}`;
    cache.delete(statsCacheKey);
    logger.debug('Stats cache invalidated', {
      userId: finalUserId,
      cacheKey: statsCacheKey
    });

    // Respuesta exitosa
    logger.info('Upload registered', {
      userId: finalUserId,
      bucket,
      file_path,
      isTrialUser: isTrial,
      remainingUploads: !isTrial && uploads ? Math.max(0, DAILY_UPLOAD_LIMIT - uploads.length - 1) : null
    });
    
    res.json({ 
      message: 'Upload registrado exitosamente', 
      upload: data[0],
      isTrialUser: isTrial,
      remainingUploads: !isTrial && uploads ? Math.max(0, DAILY_UPLOAD_LIMIT - uploads.length - 1) : null
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
    const userLicenseType = req.user?.licenseType || null;
    const isTrial = userLicenseType === LICENSE_TYPES.TRIAL;
    let uploads = null; // Initialize uploads variable outside the if block
    
    // Log user info for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('User license info', {
        userId: authenticatedUserId,
        licenseType: userLicenseType,
        isTrial,
        hasLicenseType: 'licenseType' in (req.user || {})
      });
    }

    // Límite diario: 1 subida por día solo para usuarios NO trial (trial por ahora sin límite)
    if (!isTrial) {
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

      uploads = uploadsData;

      if (uploads && uploads.length >= DAILY_UPLOAD_LIMIT) {
        return res.status(403).json({ 
          error: `Has alcanzado el límite diario (${DAILY_UPLOAD_LIMIT} upload por día)` 
        });
      }
    }

    // Comprimir vídeos (y opcionalmente imágenes grandes) antes de subir
    let bufferToUpload = file.buffer;
    let contentTypeToUse = file.mimetype;
    let finalFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');

    if (bucket === 'videos' && file.buffer.length > 8 * 1024 * 1024) {
      logger.info('Compressing video before upload', {
        userId: authenticatedUserId,
        originalSizeMB: (file.buffer.length / 1024 / 1024).toFixed(2),
      });
      const compressed = await compressVideoQueued(file.buffer);
      if (compressed && compressed.length > 0) {
        bufferToUpload = compressed;
        contentTypeToUse = 'video/mp4';
        if (!finalFileName.toLowerCase().endsWith('.mp4')) {
          finalFileName = finalFileName.replace(/\.[^.]+$/, '') + '.mp4';
        }
        logger.info('Video compressed for upload', {
          userId: authenticatedUserId,
          resultSizeMB: (compressed.length / 1024 / 1024).toFixed(2),
        });
      } else {
        logger.warn('Video compression failed or unavailable, uploading original', {
          userId: authenticatedUserId,
        });
      }
    } else if (bucket === 'images' && file.buffer.length > 4 * 1024 * 1024) {
      const compressed = await compressImage(file.buffer);
      if (compressed && compressed.length > 0) {
        bufferToUpload = compressed;
        contentTypeToUse = 'image/jpeg';
        if (!finalFileName.toLowerCase().match(/\.(jpe?g|webp)$/)) {
          finalFileName = finalFileName.replace(/\.[^.]+$/, '') + '.jpg';
        }
      }
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileName = `${timestamp}-${finalFileName}`;
    const filePath = `${authenticatedUserId}/${fileName}`;

    // Upload file to Supabase Storage using Service Role Key
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, bufferToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentTypeToUse
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
      const urlData = supabase.storage
        .from('images')
        .getPublicUrl(uploadData.path);
      url = urlData?.data?.publicUrl || null;
      if (!url) {
        logger.warn('Could not generate public URL for image', {
          filePath: uploadData.path,
          urlData
        });
      }
    } else {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('videos')
        .createSignedUrl(uploadData.path, 3600);
      if (signedError) {
        logger.error('Error creating signed URL', {
          error: signedError.message,
          filePath: uploadData.path
        });
        url = null;
      } else {
        url = signedData?.signedUrl || null;
      }
    }

    // Invalidate cache for this user's stats
    const statsCacheKey = `stats:${authenticatedUserId}`;
    cache.delete(statsCacheKey);
    logger.debug('Stats cache invalidated after file upload', {
      userId: authenticatedUserId,
      cacheKey: statsCacheKey
    });

    logger.info('File uploaded successfully', {
      userId: authenticatedUserId,
      bucket,
      file_path: uploadData.path,
      isTrialUser: isTrial,
      remainingUploads: !isTrial && uploads ? Math.max(0, DAILY_UPLOAD_LIMIT - uploads.length - 1) : null
    });

    res.json({
      message: 'Archivo subido exitosamente',
      upload: insertData[0],
      url,
      bucket,
      file_path: uploadData.path,
      isTrialUser: isTrial,
      remainingUploads: !isTrial && uploads ? Math.max(0, DAILY_UPLOAD_LIMIT - uploads.length - 1) : null
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

    // Check cache first (try Redis with timeout, fallback to memory)
    const cacheKey = `stats:${userIdToQuery}`;
    let cachedStats = null;
    const CACHE_GET_MS = 3000; // Don't wait more than 3s for cache

    try {
      const cacheGetWithTimeout = (getPromise) =>
        Promise.race([
          getPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Cache timeout')), CACHE_GET_MS)
          ),
        ]);
      try {
        const { redisCache } = await import('../utils/redisCache.js');
        if (redisCache.isAvailable()) {
          cachedStats = await cacheGetWithTimeout(redisCache.get(cacheKey));
        } else {
          cachedStats = cache.get(cacheKey);
        }
      } catch (cacheErr) {
        cachedStats = cache.get(cacheKey);
      }
    } catch (error) {
      cachedStats = cache.get(cacheKey);
    }

    if (cachedStats) {
      logger.debug('Stats cache hit', {
        userId: userIdToQuery,
        cacheKey
      });
      return res.json(cachedStats);
    }

    // Cache miss - fetch from database
    logger.debug('Stats cache miss - querying Supabase', {
      userId: userIdToQuery,
      cacheKey
    });

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
    
    // Build response object
    const statsResponse = {
      totalUploads24h: uploads24h.length || 0,
      isTrialUser: isTrial,
      dailyLimit: !isTrial ? DAILY_UPLOAD_LIMIT : null,
      remainingUploads: !isTrial ? Math.max(0, DAILY_UPLOAD_LIMIT - uploads24h.length) : null,
      uploads: uploadsList // Always return an array, even if empty
    };

    // Cache the response for 30 seconds (try Redis, fallback to memory)
    try {
      const { redisCache } = await import('../utils/redisCache.js');
      if (redisCache.isAvailable()) {
        await redisCache.set(cacheKey, statsResponse, 30);
      } else {
        cache.set(cacheKey, statsResponse, 30);
      }
    } catch (error) {
      cache.set(cacheKey, statsResponse, 30);
    }

    logger.debug('Stats cached', {
      userId: userIdToQuery,
      cacheKey,
      ttl: 30
    });
    
    // Return safe defaults - never return null/undefined that could cause frontend errors
    res.json(statsResponse);

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

    // Invalidate cache for this user's stats
    const statsCacheKey = `stats:${authenticatedUserId}`;
    cache.delete(statsCacheKey);
    logger.debug('Stats cache invalidated after file deletion', {
      userId: authenticatedUserId,
      cacheKey: statsCacheKey
    });

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

// Log registered routes in development
if (process.env.NODE_ENV === 'development') {
  logger.info('Upload routes registered', {
    routes: [
      'GET /test',
      'GET /video-url',
      'POST /',
      'POST /file',
      'GET /stats/:user_id',
      'DELETE /:upload_id'
    ]
  });
}

export default router;
