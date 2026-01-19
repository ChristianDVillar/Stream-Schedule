import express from 'express';
import { Platform } from '../models/index.js';
import checkLicense from '../middleware/checkLicense.js';
const router = express.Router();

router.use(checkLicense);

// Connect platform (store tokens)
router.post('/connect/:platform', async (req, res) => {
  const { accessToken, refreshToken, expiresAt, extra } = req.body;
  const { platform } = req.params;
  try {
    let record = await Platform.findOne({ where: { userId: req.user.id, platform } });
    if (record) {
      await record.update({ accessToken, refreshToken, expiresAt, extra });
    } else {
      record = await Platform.create({ userId: req.user.id, platform, accessToken, refreshToken, expiresAt, extra });
    }
    res.json({ message: 'Platform connected', platform: record });
  } catch (err) {
    res.status(400).json({ error: 'Invalid data', details: err.message });
  }
});

// Disconnect platform
router.post('/disconnect/:platform', async (req, res) => {
  const { platform } = req.params;
  const record = await Platform.findOne({ where: { userId: req.user.id, platform } });
  if (!record) return res.status(404).json({ error: 'Not connected' });
  await record.destroy();
  res.json({ message: 'Platform disconnected' });
});

// Get status of all platforms
router.get('/status', async (req, res) => {
  const platforms = await Platform.findAll({ where: { userId: req.user.id } });
  res.json(platforms);
});

export default router; 