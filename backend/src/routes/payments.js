import express from 'express';
import Stripe from 'stripe';
import { Payment, User } from '../models/index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { resolveLicenseExpiry } from '../utils/licenseUtils.js';
import { LICENSE_TYPES } from '../constants/licenseTypes.js';
import { PAYMENT_STATUS } from '../constants/paymentStatus.js';
import { generateLicenseKey } from '../utils/cryptoUtils.js';
import { validateBody } from '../middleware/validate.js';
import { checkoutSchema, verifySessionSchema } from '../validators/paymentSchemas.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

const PLANS = {
  [LICENSE_TYPES.MONTHLY]: { amount: 5.99, currency: 'USD', durationDays: 30 },
  [LICENSE_TYPES.QUARTERLY]: { amount: 13.98, currency: 'USD', durationDays: 90 },
  [LICENSE_TYPES.LIFETIME]: { amount: 99.0, currency: 'USD', durationDays: null },
  [LICENSE_TYPES.TEMPORARY]: { amount: 9.99, currency: 'USD', durationDays: 30 }
};

// requireAdmin is now imported from middleware/auth.js

// Create a Stripe checkout session
router.post('/checkout', requireAuth, validateBody(checkoutSchema), async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ 
      error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.',
      details: 'Payments require STRIPE_SECRET_KEY to be set. Webhook (STRIPE_WEBHOOK_SECRET) is optional but recommended for automatic payment processing.'
    });
  }
  
  const licenseType = req.body.licenseType || LICENSE_TYPES.MONTHLY;
  const plan = PLANS[licenseType];
  if (!plan) return res.status(400).json({ error: 'Invalid licenseType' });
  
  // Warn if webhook is not configured (but allow payment to proceed)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn('Stripe checkout initiated without webhook secret configured', {
      userId: req.user.id,
      licenseType,
      note: 'Payment will work but requires manual verification via /verify-session endpoint'
    });
  }

  try {
    // Create payment record
    const payment = await Payment.create({
      userId: req.user.id,
      licenseType,
      amount: plan.amount,
      currency: plan.currency,
      status: PAYMENT_STATUS.PENDING,
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
              description: licenseType === LICENSE_TYPES.LIFETIME 
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

    // Include warning if webhook is not configured
    const webhookConfigured = !!process.env.STRIPE_WEBHOOK_SECRET;
    const response = {
      sessionId: session.id,
      url: session.url,
      paymentId: payment.id,
    };
    
    if (!webhookConfigured) {
      response.warning = 'Webhook not configured. After payment, you will need to verify manually via /verify-session endpoint.';
      logger.info('Checkout created without webhook - manual verification required', {
        userId: req.user.id,
        sessionId: session.id,
        paymentId: payment.id
      });
    }
    
    res.json(response);
  } catch (error) {
    logger.error('Stripe checkout error', {
      error: error.message,
      userId: req.user.id,
      licenseType,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});

// Verify payment status from Stripe session
router.post('/verify-session', requireAuth, validateBody(verifySessionSchema), async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe is not configured' });
  
  const { sessionId } = req.body;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      const payment = await Payment.findOne({ 
        where: { stripeSessionId: sessionId, userId: req.user.id } 
      });
      
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.status === PAYMENT_STATUS.COMPLETED) {
        return res.json({ 
          status: 'paid',
          licenseKey: req.user.licenseKey,
          licenseType: req.user.licenseType,
          licenseExpiresAt: req.user.licenseExpiresAt
        });
      }

      // Update payment status
      payment.status = PAYMENT_STATUS.COMPLETED;
      payment.paidAt = new Date();
      payment.stripePaymentIntentId = session.payment_intent;
      await payment.save();

      // Assign license to user
      const licenseKey = generateLicenseKey('', 16);
      const expiryResult = resolveLicenseExpiry({ licenseType: payment.licenseType });
      const expiresAt = expiryResult.value;
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
    logger.error('Stripe session verification error', {
      error: error.message,
      userId: req.user.id,
      sessionId,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({ error: 'Failed to verify session', details: error.message });
  }
});

// Webhook endpoint for Stripe
// Note: Webhook is optional - payments can work without it using manual verification
router.post('/webhook', async (req, res) => {
  if (!stripe) {
    logger.warn('Stripe webhook received but Stripe is not configured');
    return res.status(500).json({ 
      error: 'Stripe is not configured',
      note: 'Set STRIPE_SECRET_KEY to enable webhook processing. Payments can still work via manual session verification.'
    });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.warn('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set', {
      ip: req.ip,
      note: 'Webhook processing disabled. Payments will work via manual verification (/verify-session endpoint).'
    });
    return res.status(500).json({ 
      error: 'Webhook secret not configured',
      note: 'Set STRIPE_WEBHOOK_SECRET to enable automatic webhook processing. Payments can still work via manual session verification.'
    });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed', {
      error: err.message,
      ip: req.ip
    });
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
        logger.error('Payment not found for session', {
          sessionId: session.id,
          ip: req.ip
        });
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.status === PAYMENT_STATUS.COMPLETED) {
        return res.json({ received: true });
      }

      // Update payment status
      payment.status = PAYMENT_STATUS.COMPLETED;
      payment.paidAt = new Date();
      payment.stripePaymentIntentId = session.payment_intent;
      payment.stripeCustomerId = session.customer;
      await payment.save();

      // Assign license to user
      const userId = parseInt(session.metadata?.userId || payment.userId);
      const user = await User.findByPk(userId);
      
      if (user) {
        const licenseKey = Math.random().toString(36).substr(2, 16).toUpperCase();
        const expiryResult = resolveLicenseExpiry({ licenseType: payment.licenseType });
        const expiresAt = expiryResult.value;
        user.licenseKey = licenseKey;
        user.licenseType = payment.licenseType;
        user.licenseExpiresAt = expiresAt;
        await user.save();
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Error processing webhook', {
        error: error.message,
        eventType: event.type,
        ip: req.ip,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      res.status(500).json({ error: 'Error processing webhook' });
    }
  } else {
    res.json({ received: true });
  }
});

// Get Stripe configuration status (public endpoint for frontend to check)
router.get('/config-status', async (req, res) => {
  const stripeConfigured = !!stripe;
  const webhookConfigured = !!process.env.STRIPE_WEBHOOK_SECRET;
  
  res.json({
    stripeConfigured,
    webhookConfigured,
    paymentEnabled: stripeConfigured,
    automaticProcessingEnabled: stripeConfigured && webhookConfigured,
    manualVerificationRequired: stripeConfigured && !webhookConfigured,
    message: stripeConfigured 
      ? (webhookConfigured 
          ? 'Stripe fully configured - automatic payment processing enabled'
          : 'Stripe configured but webhook missing - payments work via manual verification')
      : 'Stripe not configured - payments disabled'
  });
});

router.get('/admin/stats', requireAdmin, async (req, res) => {
  const payments = await Payment.findAll({ where: { status: PAYMENT_STATUS.COMPLETED } });
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
