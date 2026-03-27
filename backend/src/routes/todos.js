/**
 * Todo list routes - all authenticated users
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import logger from '../utils/logger.js';
import Joi from 'joi';
import { createTodo, deleteTodo, getTodos, updateTodo } from '../modules/content/application/todosService.js';

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
    const todos = await getTodos(req.user.id);
    res.json(todos);
  } catch (err) {
    logger.error('Todos list error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// Create todo
router.post('/', requireAuth, validateBody(createTodoSchema), async (req, res) => {
  try {
    const todo = await createTodo(req.user.id, req.body);
    res.status(201).json(todo);
  } catch (err) {
    logger.error('Todo create error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// Update todo (toggle completed, edit title, reorder)
router.patch('/:id', requireAuth, validateBody(updateTodoSchema), async (req, res) => {
  try {
    const todo = await updateTodo(req.user.id, req.params.id, req.body);
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json(todo);
  } catch (err) {
    logger.error('Todo update error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// Delete todo
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await deleteTodo(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Todo not found' });
    res.status(204).end();
  } catch (err) {
    logger.error('Todo delete error', { error: err.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

export default router;
