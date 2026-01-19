import express from 'express';
import { Content } from '../models/index.js';
import checkLicense from '../middleware/checkLicense.js';
const router = express.Router();

router.use(checkLicense);

// Create content
router.post('/', async (req, res) => {
  try {
    const content = await Content.create({ ...req.body, userId: req.user.id });
    res.status(201).json(content);
  } catch (err) {
    res.status(400).json({ error: 'Invalid data', details: err.message });
  }
});

// List all content for user
router.get('/', async (req, res) => {
  const contents = await Content.findAll({ where: { userId: req.user.id }, order: [['scheduledFor', 'DESC']] });
  res.json(contents);
});

// Get content by id
router.get('/:id', async (req, res) => {
  const content = await Content.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!content) return res.status(404).json({ error: 'Not found' });
  res.json(content);
});

// Update content
router.put('/:id', async (req, res) => {
  const content = await Content.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!content) return res.status(404).json({ error: 'Not found' });
  try {
    await content.update(req.body);
    res.json(content);
  } catch (err) {
    res.status(400).json({ error: 'Invalid data', details: err.message });
  }
});

// Delete content
router.delete('/:id', async (req, res) => {
  const content = await Content.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!content) return res.status(404).json({ error: 'Not found' });
  await content.destroy();
  res.json({ message: 'Deleted' });
});

export default router; 