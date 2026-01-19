import express from 'express';
import { Content } from '../models/index.js';
import checkLicense from '../middleware/checkLicense.js';
const router = express.Router();

router.use(checkLicense);

function buildOccurrences(baseDate, recurrence) {
  if (!recurrence || !recurrence.enabled) {
    return [baseDate];
  }

  const occurrences = [];
  const count = Math.max(1, Math.min(Number(recurrence.count || 1), 50));
  const frequency = recurrence.frequency || 'weekly';

  for (let i = 0; i < count; i += 1) {
    const date = new Date(baseDate);
    if (frequency === 'daily') {
      date.setDate(date.getDate() + i);
    } else if (frequency === 'weekly') {
      date.setDate(date.getDate() + i * 7);
    } else {
      date.setDate(date.getDate() + i);
    }
    occurrences.push(date);
  }

  return occurrences;
}

// Create content
router.post('/', async (req, res) => {
  try {
    const scheduledFor = new Date(req.body.scheduledFor);
    const occurrences = buildOccurrences(scheduledFor, req.body.recurrence);
    const created = await Promise.all(
      occurrences.map(date => Content.create({
        ...req.body,
        scheduledFor: date,
        userId: req.user.id
      }))
    );
    res.status(201).json(created);
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