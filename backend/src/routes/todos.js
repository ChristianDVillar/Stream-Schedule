/**
 * Todo list routes - all authenticated users
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Todo } from '../models/index.js';
import { validateBody } from '../middleware/validate.js';
import logger from '../utils/logger.js';
import Joi from 'joi';

const router = express.Router();

const createTodoSchema = Joi.object({
  title: Joi.string().min(1).max(500).required(),
  order: Joi.number().integer().min(0).optional(),
});

const updateTodoSchema = Joi.object({
  title: Joi.string().min(1).max(500).optional(),
  completed: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).optional(),
}).min(1);

// List todos for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const todos = await Todo.findAll({
      where: { userId: req.user.id },
      order: [
        ['completed', 'ASC'],
        ['order', 'ASC'],
        ['createdAt', 'ASC'],
      ],
      attributes: ['id', 'title', 'completed', 'order', 'createdAt', 'updatedAt'],
    });
    res.json(todos);
  } catch (err) {
    logger.error('Todos list error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// Create todo
router.post('/', requireAuth, validateBody(createTodoSchema), async (req, res) => {
  try {
    const { title, order } = req.body;
    const todo = await Todo.create({
      userId: req.user.id,
      title: title.trim(),
      order: order ?? 0,
    });
    res.status(201).json(todo);
  } catch (err) {
    logger.error('Todo create error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// Update todo (toggle completed, edit title, reorder)
router.patch('/:id', requireAuth, validateBody(updateTodoSchema), async (req, res) => {
  try {
    const todo = await Todo.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    const { title, completed, order } = req.body;
    if (title !== undefined) todo.title = String(title).trim();
    if (completed !== undefined) todo.completed = Boolean(completed);
    if (order !== undefined) todo.order = Number(order);
    await todo.save();
    res.json(todo);
  } catch (err) {
    logger.error('Todo update error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// Delete todo
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await Todo.destroy({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!deleted) return res.status(404).json({ error: 'Todo not found' });
    res.status(204).end();
  } catch (err) {
    logger.error('Todo delete error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

export default router;
