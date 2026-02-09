import express from 'express';
import Stripe from 'stripe';
import { Payment, User } from '../models/index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { resolveLicenseExpiry } from '../utils/licenseUtils.js';
import { LICENSE_TYPES } from '../constants/licenseTypes.js';
import { PAYMENT_STATUS } from '../constants/paymentStatus.js';
import { generateLicenseKey } from '../utils/cryptoUtils.js';
import { validateBody } from '../middleware/validate.js';
import { checkoutSchema, verifySessionSchema, subscribeSchema, createCheckoutSessionSchema } from '../validators/paymentSchemas.js';
import logger from '../utils/logger.js';
import { sendPaymentSuccessNotification, sendPaymentFailedNotification } from '../utils/notifications.js';

const router = express.Router();

const FRONTEND_URL_DEFAULT = 'http://localhost:3000';

function getFrontendUrl() {
  const url = process.env.FRONTEND_URL || FRONTEND_URL_DEFAULT;
  if (process.env.NODE_ENV === 'production' && url.includes('localhost')) {
    logger.warn('FRONTEND_URL is localhost in production. Set FRONTEND_URL in Render to your frontend URL (e.g. https://stream-schedule-v1.onrender.com) so Stripe redirects correctly.');
  }
  return url.replace(/\/$/, ''); // strip trailing slash
}

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
  // Temporary plan removed - was more expensive than monthly for same duration
  // If needed, use monthly plan instead
};

// requireAdmin is now imported from middleware/auth.js

// Create a Stripe checkout session by Price lookup_key (Stripe docs pattern: form POST with lookup_key)
router.post('/create-checkout-session', requireAuth, validateBody(createCheckoutSessionSchema), async (req, res) => {
  if (!stripe) {
    return res.status(500).json({
      error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.',
    });
  }
  const { lookup_key, success_url, cancel_url } = req.body;
  const baseUrl = getFrontendUrl();
  try {
    const prices = await stripe.prices.list({
      lookup_keys: [lookup_key],
      active: true,
      limit: 1,
    });
    if (!prices.data || prices.data.length === 0) {
      return res.status(400).json({
        error: `No active Stripe Price found for lookup_key: ${lookup_key}. Create a Price in the Stripe Dashboard and set its lookup key.`,
      });
    }
    const price = prices.data[0];
    const isSubscription = !!price.recurring;
    const stripeTaxEnabled = process.env.STRIPE_TAX_ENABLED !== 'false';
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [{ price: price.id, quantity: 1 }],
      mode: isSubscription ? 'subscription' : 'payment',
      ...(stripeTaxEnabled && { automatic_tax: { enabled: true } }),
      locale: 'en',
      success_url: success_url || `${baseUrl}/settings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${baseUrl}/settings?payment=cancelled`,
      customer_email: req.user.email,
      metadata: {
        userId: req.user.id.toString(),
        lookup_key,
      },
    };
    const session = await stripe.checkout.sessions.create(sessionConfig);
    logger.info('Checkout session created by lookup_key', {
      userId: req.user.id,
      lookup_key,
      sessionId: session.id,
      mode: sessionConfig.mode,
    });
    return res.json({
      sessionId: session.id,
      url: session.url,
      mode: sessionConfig.mode,
    });
  } catch (error) {
    logger.error('Stripe create-checkout-session error', {
      error: error.message,
      userId: req.user?.id,
      lookup_key,
    });
    return res.status(500).json({
      error: 'Failed to create checkout session',
      details: error.message,
    });
  }
});

// Create a Stripe checkout session (by licenseType - app-defined plans)
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
    // Check for existing pending payment for this user and license type
    const existingPending = await Payment.findOne({
      where: {
        userId: req.user.id,
        licenseType,
        status: PAYMENT_STATUS.PENDING
      },
      order: [['createdAt', 'DESC']]
    });

    if (existingPending) {
      // Check if session is still valid (not expired)
      if (existingPending.stripeSessionId) {
        try {
          const existingSession = await stripe.checkout.sessions.retrieve(existingPending.stripeSessionId);
          if (existingSession.status === 'open') {
            // Return existing session
            logger.info('Returning existing checkout session', {
              userId: req.user.id,
              sessionId: existingSession.id,
              paymentId: existingPending.id
            });
            return res.json({
              sessionId: existingSession.id,
              url: existingSession.url,
              paymentId: existingPending.id,
              existing: true
            });
          }
        } catch (err) {
          // Session expired or invalid, continue to create new one
          logger.debug('Existing session invalid, creating new one', {
            userId: req.user.id,
            error: err.message
          });
        }
      }
    }

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
      ...(process.env.STRIPE_TAX_ENABLED !== 'false' && { automatic_tax: { enabled: true } }),
      locale: 'en', // Set checkout page language to English
      success_url: `${getFrontendUrl()}/settings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getFrontendUrl()}/settings?payment=cancelled`,
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

  // Handle different event types
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Handle subscription checkout
      if (session.mode === 'subscription' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const userId = parseInt(session.metadata?.userId);
        const licenseType = session.metadata?.licenseType;
        
        if (userId && licenseType) {
          const user = await User.findByPk(userId);
          if (user) {
            // Update user with subscription info
            user.stripeCustomerId = subscription.customer;
            user.stripeSubscriptionId = subscription.id;
            user.subscriptionStatus = subscription.status;
            
            // Assign license
            const licenseKey = generateLicenseKey('', 16);
            const expiryResult = resolveLicenseExpiry({ licenseType });
            const expiresAt = expiryResult.value;
            user.licenseKey = licenseKey;
            user.licenseType = licenseType;
            user.licenseExpiresAt = expiresAt;
            await user.save();
            
            // Create payment record for subscription
            const plan = PLANS[licenseType];
            if (plan) {
              await Payment.create({
                userId: user.id,
                licenseType,
                amount: plan.amount,
                currency: plan.currency,
                status: PAYMENT_STATUS.COMPLETED,
                provider: 'stripe',
                stripeCustomerId: subscription.customer,
                stripeSubscriptionId: subscription.id,
                isRecurring: true,
                paidAt: new Date()
              });
            }
            
            logger.info('Subscription created via webhook', {
              userId,
              subscriptionId: subscription.id,
              licenseType
            });
          }
        }
        
        return res.json({ received: true });
      }
      
      // Handle one-time payment checkout
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
        // Use consistent license key generation
        const licenseKey = generateLicenseKey('', 16);
        const expiryResult = resolveLicenseExpiry({ licenseType: payment.licenseType });
        const expiresAt = expiryResult.value;
        user.licenseKey = licenseKey;
        user.licenseType = payment.licenseType;
        user.licenseExpiresAt = expiresAt;
        await user.save();
        
        logger.info('License assigned via webhook', {
          userId,
          licenseType: payment.licenseType,
          expiresAt,
          paymentId: payment.id
        });
        
        // Send success notification
        try {
          await sendPaymentSuccessNotification(user, payment);
        } catch (error) {
          logger.error('Failed to send payment success notification', {
            userId,
            error: error.message
          });
        }
      }

      res.json({ received: true });
    }
    else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const user = await User.findOne({ where: { stripeSubscriptionId: subscription.id } });
      
      if (user) {
        user.subscriptionStatus = subscription.status;
        
        // If subscription is active, extend license
        if (subscription.status === 'active') {
          const licenseType = subscription.metadata?.licenseType || user.licenseType;
          const expiryResult = resolveLicenseExpiry({ licenseType });
          user.licenseExpiresAt = expiryResult.value;
        }
        
        await user.save();
        
        logger.info('Subscription updated', {
          userId: user.id,
          subscriptionId: subscription.id,
          status: subscription.status
        });
      }
      
      res.json({ received: true });
    }
    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const user = await User.findOne({ where: { stripeSubscriptionId: subscription.id } });
      
      if (user) {
        user.stripeSubscriptionId = null;
        user.subscriptionStatus = 'canceled';
        await user.save();
        
        logger.info('Subscription canceled', {
          userId: user.id,
          subscriptionId: subscription.id
        });
      }
      
      res.json({ received: true });
    }
    else if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      
      if (invoice.subscription) {
        const user = await User.findOne({ where: { stripeSubscriptionId: invoice.subscription } });
        
        if (user) {
          // Create payment record for recurring payment
          const licenseType = user.licenseType;
          const plan = PLANS[licenseType];
          
          if (plan) {
            await Payment.create({
              userId: user.id,
              licenseType,
              amount: plan.amount,
              currency: plan.currency,
              status: PAYMENT_STATUS.COMPLETED,
              provider: 'stripe',
              stripeCustomerId: invoice.customer,
              stripeSubscriptionId: invoice.subscription,
              isRecurring: true,
              paidAt: new Date()
            });
            
            // Extend license
            const expiryResult = resolveLicenseExpiry({ licenseType });
            user.licenseExpiresAt = expiryResult.value;
            await user.save();
            
            logger.info('Recurring payment processed', {
              userId: user.id,
              subscriptionId: invoice.subscription,
              invoiceId: invoice.id
            });
          }
        }
      }
      
      res.json({ received: true });
    }
    else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      
      if (invoice.subscription) {
        const user = await User.findOne({ where: { stripeSubscriptionId: invoice.subscription } });
        
        if (user) {
          user.subscriptionStatus = 'past_due';
          await user.save();
          
          logger.warn('Subscription payment failed', {
            userId: user.id,
            subscriptionId: invoice.subscription,
            invoiceId: invoice.id
          });
          
          // Send notification email to user
          try {
            await sendPaymentFailedNotification(user, invoice.subscription);
          } catch (error) {
            logger.error('Failed to send payment failed notification', {
              userId: user.id,
              error: error.message
            });
          }
        }
      }
      
      res.json({ received: true });
    }
    else if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      
      if (invoice.subscription) {
        const user = await User.findOne({ where: { stripeSubscriptionId: invoice.subscription } });
        
        if (user) {
          // Create payment record for recurring payment
          const licenseType = user.licenseType;
          const plan = PLANS[licenseType];
          
          if (plan) {
            const payment = await Payment.create({
              userId: user.id,
              licenseType,
              amount: plan.amount,
              currency: plan.currency,
              status: PAYMENT_STATUS.COMPLETED,
              provider: 'stripe',
              stripeCustomerId: invoice.customer,
              stripeSubscriptionId: invoice.subscription,
              isRecurring: true,
              paidAt: new Date()
            });
            
            // Extend license
            const expiryResult = resolveLicenseExpiry({ licenseType });
            user.licenseExpiresAt = expiryResult.value;
            await user.save();
            
            logger.info('Recurring payment processed', {
              userId: user.id,
              subscriptionId: invoice.subscription,
              invoiceId: invoice.id
            });
            
            // Send success notification
            try {
              await sendPaymentSuccessNotification(user, payment);
            } catch (error) {
              logger.error('Failed to send payment success notification', {
                userId: user.id,
                error: error.message
              });
            }
          }
        }
      }
      
      res.json({ received: true });
    }
    else if (event.type === 'charge.refunded') {
      // Handle refunds - revoke license
      const charge = event.data.object;
      
      const payment = await Payment.findOne({
        where: { stripePaymentIntentId: charge.payment_intent }
      });

      if (payment && payment.status === PAYMENT_STATUS.COMPLETED) {
        // Update payment status
        payment.status = PAYMENT_STATUS.REFUNDED;
        await payment.save();

        // Revoke license if still active
        const user = await User.findByPk(payment.userId);
        if (user && user.licenseType === payment.licenseType) {
          // Only revoke if this payment's license is still active
          const now = new Date();
          const expiresAt = user.licenseExpiresAt ? new Date(user.licenseExpiresAt) : null;
          
          if (!expiresAt || expiresAt > now) {
            // License is still active, revoke it
            user.licenseType = LICENSE_TYPES.NONE;
            user.licenseKey = null;
            user.licenseExpiresAt = null;
            await user.save();
            
            logger.info('License revoked due to refund', {
              userId: user.id,
              paymentId: payment.id,
              chargeId: charge.id
            });
          }
        }

        res.json({ received: true });
      } else {
        res.json({ received: true });
      }
    }
    else {
      // Acknowledge other events
      res.json({ received: true });
    }
  } catch (error) {
    logger.error('Error processing webhook', {
      error: error.message,
      eventType: event.type,
      ip: req.ip,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({ error: 'Error processing webhook' });
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

// Create subscription (recurring payment)
router.post('/subscribe', requireAuth, validateBody(subscribeSchema), async (req, res) => {
  if (!stripe) {
    logger.error('Stripe not configured for subscription', {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY
    });
    return res.status(500).json({ 
      error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.'
    });
  }

  const licenseType = req.body?.licenseType;
  if (!licenseType || !['monthly', 'quarterly'].includes(licenseType)) {
    return res.status(400).json({
      error: 'Invalid or missing license type for subscription',
      details: 'Send licenseType: "monthly" or "quarterly" in the request body.',
    });
  }
  logger.debug('Subscription request received', {
    userId: req.user?.id,
    licenseType,
    availablePlans: Object.keys(PLANS)
  });

  const plan = PLANS[licenseType];
  
  if (!plan) {
    logger.warn('Invalid license type for subscription', {
      userId: req.user?.id,
      licenseType,
      availableTypes: Object.keys(PLANS)
    });
    return res.status(400).json({ 
      error: 'Invalid license type for subscription. Only monthly and quarterly plans support subscriptions.',
      availableTypes: Object.keys(PLANS)
    });
  }
  
  if (licenseType === LICENSE_TYPES.LIFETIME) {
    return res.status(400).json({ 
      error: 'Invalid license type for subscription. Only monthly and quarterly plans support subscriptions.' 
    });
  }

  try {
    // Ensure we have the latest user data with subscription fields
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log user data for debugging
    logger.debug('User data for subscription', {
      userId: user.id,
      hasStripeCustomerId: !!user.stripeCustomerId,
      hasStripeSubscriptionId: !!user.stripeSubscriptionId,
      userKeys: Object.keys(user.toJSON ? user.toJSON() : user)
    });

    // Check if user already has an active subscription
    const existingSubscriptionId = user.stripeSubscriptionId;

    if (existingSubscriptionId) {
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(existingSubscriptionId);
        if (existingSubscription.status === 'active' || existingSubscription.status === 'trialing') {
          return res.status(400).json({
            error: 'You already have an active subscription',
            details: 'Cancel it in the Stripe Dashboard or in Settings (Manage subscription) before starting a new one.',
          });
        }
      } catch (err) {
        // Subscription doesn't exist or is invalid, continue
        logger.debug('Existing subscription invalid, creating new one', {
          userId: user.id,
          error: err.message
        });
      }
    }

    // Get or create Stripe customer (clear invalid IDs that no longer exist in Stripe)
    let customerId = user.stripeCustomerId;
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (err) {
        if (err.code === 'resource_missing' || (err.message && err.message.includes('No such customer'))) {
          logger.warn('Stripe customer no longer exists, clearing invalid ID', {
            userId: user.id,
            oldCustomerId: customerId
          });
          user.stripeCustomerId = null;
          if (user.stripeSubscriptionId) user.stripeSubscriptionId = null;
          await user.save();
          customerId = null;
        } else {
          throw err;
        }
      }
    }
    logger.debug('Stripe customer check', {
      userId: user.id,
      existingCustomerId: customerId
    });
    if (!customerId) {
      logger.debug('Creating new Stripe customer', {
        userId: user.id,
        email: user.email
      });
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id.toString(),
          username: user.username
        }
      });
      customerId = customer.id;
      logger.debug('Stripe customer created', { userId: user.id, customerId });
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Create Stripe Checkout Session for subscription
    logger.debug('Creating Stripe checkout session', {
      userId: user.id,
      licenseType,
      customerId,
      planAmount: plan.amount,
      planCurrency: plan.currency
    });
    
    // Build session config - only include customer_email if we don't have a customer ID
    // automatic_tax requires Stripe Tax to be enabled in Dashboard; disable via STRIPE_TAX_ENABLED=false if needed
    const stripeTaxEnabled = process.env.STRIPE_TAX_ENABLED !== 'false';
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: `Subscription - ${licenseType.charAt(0).toUpperCase() + licenseType.slice(1)}`,
              description: `Recurring ${plan.durationDays}-day license subscription`,
            },
            unit_amount: Math.round(plan.amount * 100),
            recurring: {
              interval: licenseType === LICENSE_TYPES.MONTHLY ? 'month' : 'month',
              interval_count: licenseType === LICENSE_TYPES.MONTHLY ? 1 : 3,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      ...(stripeTaxEnabled && { automatic_tax: { enabled: true } }),
      locale: 'en', // Set checkout page language to English
      success_url: `${getFrontendUrl()}/settings?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getFrontendUrl()}/settings?subscription=cancelled`,
      metadata: {
        userId: user.id.toString(),
        licenseType: licenseType,
      },
    };
    
    // Only include customer OR customer_email, not both
    if (customerId) {
      sessionConfig.customer = customerId;
    } else {
      sessionConfig.customer_email = user.email;
    }
    
    logger.debug('Stripe session config', {
      config: JSON.stringify(sessionConfig, null, 2)
    });
    
    const session = await stripe.checkout.sessions.create(sessionConfig);

    logger.info('Subscription checkout session created', {
      userId: user.id,
      licenseType,
      sessionId: session.id,
      customerId
    });

    res.json({
      sessionId: session.id,
      url: session.url,
      type: 'subscription'
    });
  } catch (error) {
    // Log full error details
    logger.error('Stripe subscription checkout error', {
      error: error.message,
      userId: req.user?.id,
      licenseType,
      ip: req.ip,
      stack: error.stack,
      errorName: error.name,
      errorCode: error.code,
      errorType: error.constructor?.name,
      errorResponse: error.response?.data,
      errorStatus: error.status,
      errorStatusText: error.statusText
    });
    
    // Provide more detailed error in development
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? {
          message: error.message,
          name: error.name,
          code: error.code,
          type: error.type,
          status: error.status,
          statusText: error.statusText,
          response: error.response?.data,
          stack: error.stack?.split('\n').slice(0, 10).join('\n') // First 10 lines of stack
        }
      : undefined;
    
    // Check for specific Stripe errors (return Stripe message so user can fix)
    if (error.type === 'StripeInvalidRequestError') {
      const stripeMsg = error.message || (error.raw?.message) || 'Invalid Stripe request';
      return res.status(400).json({
        error: 'Invalid Stripe request',
        details: stripeMsg,
      });
    }
    
    if (error.type === 'StripeAuthenticationError') {
      return res.status(500).json({ 
        error: 'Stripe authentication failed. Please check STRIPE_SECRET_KEY configuration.',
        details: errorDetails
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create subscription checkout session', 
      details: errorDetails
    });
  }
});

// Get subscription status
router.get('/subscription', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }

  try {
    // Get latest user data to ensure we have subscription fields
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscriptionId = user.stripeSubscriptionId;

    if (!subscriptionId) {
      return res.json({
        hasSubscription: false,
        subscription: null
      });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    res.json({
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
      }
    });
  } catch (error) {
    // Subscription might not exist anymore
    if (error.code === 'resource_missing') {
      // Clear subscription ID from user
      const userToUpdate = await User.findByPk(req.user.id);
      if (userToUpdate) {
        userToUpdate.stripeSubscriptionId = null;
        userToUpdate.subscriptionStatus = null;
        await userToUpdate.save();
      }
      
      return res.json({
        hasSubscription: false,
        subscription: null
      });
    }
    
    logger.error('Error retrieving subscription', {
      error: error.message,
      errorCode: error.code,
      userId: req.user?.id,
      subscriptionId: user?.stripeSubscriptionId
    });
    
    res.status(500).json({ 
      error: 'Failed to retrieve subscription', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Cancel subscription
router.post('/subscription/cancel', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }

  try {
    // Get latest user data
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscriptionId = user.stripeSubscriptionId;

    if (!subscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    // Update user subscription status
    user.subscriptionStatus = subscription.status;
    await user.save();

    logger.info('Subscription cancellation scheduled', {
      userId: req.user.id,
      subscriptionId: subscription.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });

    res.json({
      message: 'Subscription will be canceled at the end of the current billing period',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
      }
    });
  } catch (error) {
    logger.error('Error canceling subscription', {
      error: error.message,
      userId: req.user.id,
      subscriptionId: req.user.stripeSubscriptionId
    });
    res.status(500).json({ error: 'Failed to cancel subscription', details: error.message });
  }
});

// Get user payment history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({
      payments: payments.map(p => ({
        id: p.id,
        licenseType: p.licenseType,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        isRecurring: p.isRecurring,
        paidAt: p.paidAt,
        createdAt: p.createdAt
      }))
    });
  } catch (error) {
    logger.error('Error fetching payment history', {
      error: error.message,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

router.get('/admin/stats', requireAdmin, async (req, res) => {
  const payments = await Payment.findAll({ where: { status: PAYMENT_STATUS.COMPLETED } });
  const totals = {};
  let totalPaid = 0;
  let recurringRevenue = 0;

  payments.forEach(payment => {
    const date = payment.paidAt || payment.createdAt;
    if (!date) return;
    const monthKey = new Date(date).toISOString().slice(0, 7);
    const amount = Number(payment.amount) || 0;
    totalPaid += amount;
    if (payment.isRecurring) {
      recurringRevenue += amount;
    }
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
    recurringRevenue,
    oneTimeRevenue: totalPaid - recurringRevenue,
    currentMonthAmount,
    monthlyTotals
  });
});

export default router;
