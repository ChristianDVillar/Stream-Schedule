import express from 'express';
import Stripe from 'stripe';
import { Payment, User } from '../models/index.js';

const router = express.Router();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

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

// Create a Stripe checkout session
router.post('/checkout', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!stripe) return res.status(500).json({ error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.' });
  
  const licenseType = req.body.licenseType || 'monthly';
  const plan = PLANS[licenseType];
  if (!plan) return res.status(400).json({ error: 'Invalid licenseType' });

  try {
    // Create payment record
    const payment = await Payment.create({
      userId: req.user.id,
      licenseType,
      amount: plan.amount,
      currency: plan.currency,
      status: 'pending',
      provider: 'stripe'
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: `License - ${licenseType.charAt(0).toUpperCase() + licenseType.slice(1)}`,
              description: licenseType === 'lifetime' 
                ? 'Lifetime license - Unlimited access'
                : `${plan.durationDays} days license`,
            },
            unit_amount: Math.round(plan.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?payment=cancelled`,
      client_reference_id: payment.id.toString(),
      customer_email: req.user.email,
      metadata: {
        userId: req.user.id.toString(),
        paymentId: payment.id.toString(),
        licenseType: licenseType,
      },
    });

    // Update payment with Stripe session ID
    payment.stripeSessionId = session.id;
    await payment.save();

    res.json({
      sessionId: session.id,
      url: session.url,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

// Verify payment status from Stripe session
router.post('/verify-session', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!stripe) return res.status(500).json({ error: 'Stripe is not configured' });
  
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      const payment = await Payment.findOne({ 
        where: { stripeSessionId: sessionId, userId: req.user.id } 
      });
      
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.status === 'paid') {
        return res.json({ 
          status: 'paid',
          licenseKey: req.user.licenseKey,
          licenseType: req.user.licenseType,
          licenseExpiresAt: req.user.licenseExpiresAt
        });
      }

      // Update payment status
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.stripePaymentIntentId = session.payment_intent;
      await payment.save();

      // Assign license to user
      const licenseKey = Math.random().toString(36).substr(2, 16).toUpperCase();
      const expiresAt = resolveLicenseExpiry(payment.licenseType);
      const user = await User.findByPk(req.user.id);
      user.licenseKey = licenseKey;
      user.licenseType = payment.licenseType;
      user.licenseExpiresAt = expiresAt;
      await user.save();

      return res.json({
        status: 'paid',
        licenseKey: user.licenseKey,
        licenseType: user.licenseType,
        licenseExpiresAt: user.licenseExpiresAt
      });
    }

    res.json({ status: session.payment_status });
  } catch (error) {
    console.error('Stripe session verification error:', error);
    res.status(500).json({ error: 'Failed to verify session', details: error.message });
  }
});

// Webhook endpoint for Stripe
router.post('/webhook', async (req, res) => {
  if (!stripe) {
    console.error('Stripe is not configured');
    return res.status(500).json({ error: 'Stripe is not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      const payment = await Payment.findOne({ 
        where: { stripeSessionId: session.id } 
      });

      if (!payment) {
        console.error('Payment not found for session:', session.id);
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.status === 'paid') {
        return res.json({ received: true });
      }

      // Update payment status
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.stripePaymentIntentId = session.payment_intent;
      payment.stripeCustomerId = session.customer;
      await payment.save();

      // Assign license to user
      const userId = parseInt(session.metadata?.userId || payment.userId);
      const user = await User.findByPk(userId);
      
      if (user) {
        const licenseKey = Math.random().toString(36).substr(2, 16).toUpperCase();
        const expiresAt = resolveLicenseExpiry(payment.licenseType);
        user.licenseKey = licenseKey;
        user.licenseType = payment.licenseType;
        user.licenseExpiresAt = expiresAt;
        await user.save();
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Error processing webhook' });
    }
  } else {
    res.json({ received: true });
  }
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
