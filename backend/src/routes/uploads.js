/**
 * Upload Routes
 * Handles file upload registration and trial/pro limits
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { LICENSE_TYPES } from '../constants/licenseTypes.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { registerUploadSchema, getUploadStatsSchema } from '../validators/uploadSchemas.js';
import logger from '../utils/logger.js';

const router = express.Router();

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
 * GET /api/upload/stats/:user_id
 * Obtiene estadísticas de uploads del usuario
 */
router.get('/stats/:user_id', requireAuth, validateParams(getUploadStatsSchema), async (req, res) => {
  const { user_id } = req.params;

  // Verificar que el user_id coincida con el usuario autenticado (excepto admins)
  const authenticatedUserId = req.user.id.toString();
  // Convert user_id from params to string for comparison
  const paramUserId = user_id.toString();
  if (paramUserId !== authenticatedUserId && !req.user.isAdmin) {
    return res.status(403).json({ 
      error: 'No tienes permiso para ver estadísticas de otro usuario' 
    });
  }

  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase no está configurado' 
    });
  }

  try {
    // Get all uploads (not just last 24h) for media gallery
    // For stats, we still want last 24h, but for gallery we want more
    const { data: uploads, error } = await supabase
      .from('uploads')
      .select('id, bucket, file_path, created_at')
      .eq('user_id', user_id.toString())
      .order('created_at', { ascending: false })
      .limit(100); // Limit to last 100 uploads

    if (error) {
      logger.error('Error getting upload stats', {
        error: error.message,
        userId: user_id,
        ip: req.ip
      });
      return res.status(500).json({ 
        error: 'Error al obtener estadísticas' 
      });
    }

    // Determinar si es trial
    let isTrial = false;
    if (req.user) {
      isTrial = req.user.licenseType === LICENSE_TYPES.TRIAL;
    }

    // Calculate 24h stats separately
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const uploads24h = uploads?.filter(u => new Date(u.created_at) >= new Date(twentyFourHoursAgo)) || [];
    
    res.json({
      totalUploads24h: uploads24h.length,
      isTrialUser: isTrial,
      dailyLimit: isTrial ? TRIAL_DAILY_LIMIT : null,
      remainingUploads: isTrial ? Math.max(0, TRIAL_DAILY_LIMIT - uploads24h.length) : null,
      uploads: uploads || [] // Return all uploads for gallery (empty array if no uploads)
    });

  } catch (err) {
    logger.error('Error in /api/upload/stats', {
      error: err.message,
      userId: user_id,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
});

export default router;
