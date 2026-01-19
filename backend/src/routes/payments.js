import express from 'express';
import { Payment, User } from '../models/index.js';

const router = express.Router();

const PLANS = {
  monthly: { amount: 5.99, currency: 'USD', durationDays: 30 },
  quarterly: { amount: 13.98, currency: 'USD', durationDays: 90 },
  lifetime: { amount: 99.0, currency: 'USD', durationDays: null },
  temporary: { amount: 9.99, currency: 'USD', durationDays: 30 }
};

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' });
  next();
}

function resolveLicenseExpiry(licenseType) {
  if (licenseType === 'lifetime') {
    return null;
  }
  if (!PLANS[licenseType]) {
    return null;
  }
  const date = new Date();
  date.setDate(date.getDate() + PLANS[licenseType].durationDays);
  return date;
}

// Create a payment (mocked checkout)
router.post('/checkout', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const licenseType = req.body.licenseType || 'monthly';
  const plan = PLANS[licenseType];
  if (!plan) return res.status(400).json({ error: 'Invalid licenseType' });

  const payment = await Payment.create({
    userId: req.user.id,
    licenseType,
    amount: plan.amount,
    currency: plan.currency,
    status: 'pending',
    provider: 'manual'
  });

  res.json({
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status
  });
});

// Confirm payment and assign license (mocked charge)
router.post('/confirm', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { paymentId } = req.body;
  if (!paymentId) return res.status(400).json({ error: 'Missing paymentId' });

  const payment = await Payment.findOne({ where: { id: paymentId, userId: req.user.id } });
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status === 'paid') return res.json({ status: 'paid' });

  payment.status = 'paid';
  payment.paidAt = new Date();
  await payment.save();

  const licenseKey = Math.random().toString(36).substr(2, 16).toUpperCase();
  const expiresAt = resolveLicenseExpiry(payment.licenseType);
  const user = await User.findByPk(req.user.id);
  user.licenseKey = licenseKey;
  user.licenseType = payment.licenseType;
  user.licenseExpiresAt = expiresAt;
  await user.save();

  res.json({
    status: payment.status,
    licenseKey: user.licenseKey,
    licenseType: user.licenseType,
    licenseExpiresAt: user.licenseExpiresAt
  });
});

router.get('/admin/stats', requireAdmin, async (req, res) => {
  const payments = await Payment.findAll({ where: { status: 'paid' } });
  const totals = {};
  let totalPaid = 0;

  payments.forEach(payment => {
    const date = payment.paidAt || payment.createdAt;
    if (!date) return;
    const monthKey = new Date(date).toISOString().slice(0, 7);
    const amount = Number(payment.amount) || 0;
    totalPaid += amount;
    totals[monthKey] = (totals[monthKey] || 0) + amount;
  });

  const monthlyTotals = Object.entries(totals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthAmount = totals[currentMonth] || 0;

  res.json({
    currency: 'USD',
    totalPaid,
    currentMonthAmount,
    monthlyTotals
  });
});

export default router;
