/**
 * Messages Routes
 * User to Admin messaging system
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import multer from 'multer';
import { Message, MessageReply, User } from '../models/index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createMessageSchema,
  updateMessageStatusSchema,
  replyMessageSchema,
  deleteMessageSchema,
  getMessagesQuerySchema,
  resolveMessageSchema
} from '../validators/messageSchemas.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';
import { supabase } from '../utils/supabaseClient.js';
import { compressImage } from '../utils/compressMedia.js';

const router = express.Router();

// Configure multer for message attachments (images only, max 5MB per file, max 5 files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper function to upload image to Supabase
async function uploadImageToSupabase(file, userId) {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  let bufferToUpload = file.buffer;
  let contentTypeToUse = file.mimetype;

  // Compress if larger than 2MB
  if (bufferToUpload.length > 2 * 1024 * 1024) {
    const compressed = await compressImage(bufferToUpload);
    if (compressed && compressed.length > 0) {
      bufferToUpload = compressed;
      contentTypeToUse = 'image/jpeg';
    }
  }

  const timestamp = Date.now();
  const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}-${sanitizedFileName}`;
  const filePath = `messages/${userId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('images')
    .upload(filePath, bufferToUpload, {
      cacheControl: '3600',
      upsert: false,
      contentType: contentTypeToUse
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('images')
    .getPublicUrl(filePath);

  return {
    path: filePath,
    url: urlData.publicUrl,
    name: file.originalname,
    size: bufferToUpload.length,
    type: contentTypeToUse
  };
}

// Log that messages routes are loaded
logger.info('Messages routes initialized');

// Create a message (user) - with file upload support
router.post('/', requireAuth, upload.array('attachments', 5), async (req, res) => {
  try {
    // Validate body (subject, content, etc.)
    const { error: validationError, value } = createMessageSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const { subject, content, priority, category } = value;
    
    // Upload attachments if any
    let attachments = [];
    if (req.files && req.files.length > 0) {
      try {
        attachments = await Promise.all(
          req.files.map(file => uploadImageToSupabase(file, req.user.id))
        );
      } catch (uploadError) {
        logger.error('Error uploading message attachments', {
          error: uploadError.message,
          userId: req.user.id
        });
        return res.status(500).json({ error: 'Failed to upload attachments: ' + uploadError.message });
      }
    }
    
    const message = await Message.create({
      userId: req.user.id,
      subject,
      content,
      priority: priority || 'normal',
      category: category || null,
      status: 'unread',
      attachments: attachments.length > 0 ? attachments : []
    });

    // Include user info in response
    const messageWithUser = await Message.findByPk(message.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }]
    });

    logger.info('Message created', {
      messageId: message.id,
      userId: req.user.id,
      subject: message.subject,
      priority: message.priority,
      category: message.category,
      attachmentsCount: attachments.length
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: messageWithUser
    });
  } catch (error) {
    logger.error('Error creating message', {
      error: error.message,
      userId: req.user?.id,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get user's own messages
router.get('/my-messages', requireAuth, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'repliedByUser',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: User,
          as: 'readByUser',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: User,
          as: 'resolvedByUser',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: MessageReply,
          as: 'replies',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }],
          order: [['createdAt', 'ASC']],
          required: false
        }
      ]
    });

    res.json({ messages });
  } catch (error) {
    logger.error('Error fetching user messages', {
      error: error.message,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get all messages (admin only)
router.get('/admin', requireAdmin, validateQuery(getMessagesQuerySchema), async (req, res) => {
  try {
    const { status, priority, category, userId, page = 1, limit = 20, resolved } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (userId) where.userId = userId;
    if (resolved !== undefined && resolved !== '') {
      where.resolved = resolved === 'true' || resolved === true;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: messages } = await Message.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [
        ['priority', 'DESC'], // urgent first
        ['createdAt', 'DESC']
      ],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'repliedByUser',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: User,
          as: 'readByUser',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: User,
          as: 'resolvedByUser',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: MessageReply,
          as: 'replies',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }],
          order: [['createdAt', 'ASC']],
          required: false
        }
      ]
    });

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching admin messages', {
      error: error.message,
      adminId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get unread message count (admin)
router.get('/admin/unread-count', requireAdmin, async (req, res) => {
  try {
    const count = await Message.count({
      where: { status: 'unread' }
    });

    res.json({ unreadCount: count });
  } catch (error) {
    logger.error('Error fetching unread count', {
      error: error.message,
      adminId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Get single message (admin)
router.get('/admin/:messageId', requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findByPk(messageId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'repliedByUser',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: User,
          as: 'readByUser',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: User,
          as: 'resolvedByUser',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: MessageReply,
          as: 'replies',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }],
          order: [['createdAt', 'ASC']],
          required: false
        }
      ]
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Mark as read if unread
    if (message.status === 'unread') {
      message.status = 'read';
      message.readAt = new Date();
      message.readBy = req.user.id;
      await message.save();
    }

    res.json({ message });
  } catch (error) {
    logger.error('Error fetching message', {
      error: error.message,
      messageId: req.params.messageId,
      adminId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// Get single message (user - for their own messages)
router.get('/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findOne({
      where: { 
        id: messageId,
        userId: req.user.id // User can only see their own messages
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'resolvedByUser',
          attributes: ['id', 'username'],
          required: false
        },
        {
          model: MessageReply,
          as: 'replies',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }],
          order: [['createdAt', 'ASC']],
          required: false
        }
      ]
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message });
  } catch (error) {
    logger.error('Error fetching message', {
      error: error.message,
      messageId: req.params.messageId,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// Update message status (admin)
router.patch('/admin/status', requireAdmin, validateBody(updateMessageStatusSchema), async (req, res) => {
  try {
    const { messageId, status } = req.body;
    
    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Set readAt and readBy if marking as read for the first time
    if (status === 'read' && !message.readAt) {
      message.readAt = new Date();
      message.readBy = req.user.id;
    }

    message.status = status;
    await message.save();

    logger.info('Message status updated', {
      messageId,
      status,
      adminId: req.user.id
    });

    res.json({
      message: 'Message status updated',
      data: message
    });
  } catch (error) {
    logger.error('Error updating message status', {
      error: error.message,
      messageId: req.body.messageId,
      adminId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to update message status' });
  }
});

// Reply to message (admin or user) - with file upload support
router.post('/reply', requireAuth, upload.array('attachments', 5), async (req, res) => {
  try {
    // Validate body
    const { error: validationError, value } = replyMessageSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationError.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const { messageId, reply } = value;
    
    const message = await Message.findByPk(messageId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }]
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if message is resolved
    if (message.resolved) {
      return res.status(400).json({ error: 'This conversation is already resolved' });
    }

    // Check if user is authorized (must be the message owner or an admin)
    const isAdmin = req.user.isAdmin;
    const isOwner = message.userId === req.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'You are not authorized to reply to this message' });
    }

    // Upload reply attachments if any
    let replyAttachments = [];
    if (req.files && req.files.length > 0) {
      try {
        replyAttachments = await Promise.all(
          req.files.map(file => uploadImageToSupabase(file, req.user.id))
        );
      } catch (uploadError) {
        logger.error('Error uploading reply attachments', {
          error: uploadError.message,
          userId: req.user.id,
          messageId
        });
        return res.status(500).json({ error: 'Failed to upload attachments: ' + uploadError.message });
      }
    }

    // Create reply
    const messageReply = await MessageReply.create({
      messageId: message.id,
      userId: req.user.id,
      content: reply,
      attachments: replyAttachments.length > 0 ? replyAttachments : [],
      isAdmin: isAdmin
    });

    // Update message status
    if (!message.readAt) {
      message.readAt = new Date();
      message.readBy = isAdmin ? req.user.id : null;
    }
    
    // Update repliedAt and repliedBy for first admin reply (backward compatibility)
    if (isAdmin && !message.repliedAt) {
      message.repliedAt = new Date();
      message.repliedBy = req.user.id;
    }
    
    message.status = 'replied';
    await message.save();

    // Load reply with user info
    const replyWithUser = await MessageReply.findByPk(messageReply.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }]
    });

    logger.info('Message replied', {
      messageId,
      replyId: messageReply.id,
      userId: req.user.id,
      isAdmin,
      attachmentsCount: replyAttachments.length
    });

    res.json({
      message: 'Reply sent successfully',
      data: replyWithUser
    });
  } catch (error) {
    logger.error('Error replying to message', {
      error: error.message,
      messageId: req.body?.messageId,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Mark message as resolved (admin only)
router.post('/admin/resolve', requireAdmin, validateBody(resolveMessageSchema), async (req, res) => {
  try {
    const { messageId } = req.body;
    
    const message = await Message.findByPk(messageId, {
      include: [{
        model: User,
        as: 'resolvedByUser',
        attributes: ['id', 'username'],
        required: false
      }]
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.resolved = true;
    message.resolvedAt = new Date();
    message.resolvedBy = req.user.id;
    await message.save();

    logger.info('Message resolved', {
      messageId,
      adminId: req.user.id
    });

    res.json({
      message: 'Message marked as resolved',
      data: message
    });
  } catch (error) {
    logger.error('Error resolving message', {
      error: error.message,
      messageId: req.body?.messageId,
      adminId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to resolve message' });
  }
});

// Reopen resolved message (admin only)
router.post('/admin/reopen', requireAdmin, validateBody(resolveMessageSchema), async (req, res) => {
  try {
    const { messageId } = req.body;
    
    const message = await Message.findByPk(messageId, {
      include: [{
        model: MessageReply,
        as: 'replies',
        required: false
      }]
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.resolved = false;
    message.resolvedAt = null;
    message.resolvedBy = null;
    await message.save();

    logger.info('Message reopened', {
      messageId,
      adminId: req.user.id
    });

    res.json({
      message: 'Message reopened',
      data: message
    });
  } catch (error) {
    logger.error('Error reopening message', {
      error: error.message,
      messageId: req.body?.messageId,
      adminId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to reopen message' });
  }
});

// Delete message (admin)
router.delete('/admin/:messageId', requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await message.destroy();

    logger.info('Message deleted', {
      messageId,
      adminId: req.user.id
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    logger.error('Error deleting message', {
      error: error.message,
      messageId: req.params.messageId,
      adminId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
