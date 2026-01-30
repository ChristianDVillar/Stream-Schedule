/**
 * Notification System
 * Handles email notifications for license expiration and payment events
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from './logger.js';

// Email service configuration
// For now, we'll use console logging. In production, integrate with SendGrid, AWS SES, etc.
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@streamer-scheduler.com';

/**
 * Send email notification (placeholder - integrate with real email service)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text content
 */
async function sendEmail(to, subject, html, text) {
  if (!EMAIL_ENABLED) {
    logger.info('Email notification (disabled)', {
      to,
      subject,
      note: 'EMAIL_ENABLED is false - email not sent'
    });
    return { success: false, reason: 'Email disabled' };
  }

  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // For now, just log
  logger.info('Email notification', {
    to,
    subject,
    from: EMAIL_FROM,
    htmlLength: html.length,
    textLength: text.length
  });

  // In production, replace this with actual email sending:
  // await emailService.send({ to, from: EMAIL_FROM, subject, html, text });

  return { success: true };
}

/**
 * Send license expiration warning email
 * @param {Object} user - User object
 * @param {number} daysUntilExpiry - Days until license expires
 */
export async function sendLicenseExpirationWarning(user, daysUntilExpiry) {
  const expiryDate = user.licenseExpiresAt 
    ? new Date(user.licenseExpiresAt).toLocaleDateString()
    : 'Unknown';

  const subject = `Your ${user.licenseType} license expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`;
  
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4CAF50;">License Expiration Reminder</h2>
          <p>Hello ${user.username},</p>
          <p>Your <strong>${user.licenseType}</strong> license will expire in <strong>${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}</strong>.</p>
          <p><strong>Expiration Date:</strong> ${expiryDate}</p>
          ${daysUntilExpiry <= 3 
            ? '<p style="color: #f44336; font-weight: bold;">⚠️ Your license expires soon! Renew now to avoid service interruption.</p>'
            : '<p>Don\'t forget to renew your license to continue enjoying all features.</p>'
          }
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Renew License
            </a>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
License Expiration Reminder

Hello ${user.username},

Your ${user.licenseType} license will expire in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}.

Expiration Date: ${expiryDate}

${daysUntilExpiry <= 3 
  ? '⚠️ Your license expires soon! Renew now to avoid service interruption.'
  : "Don't forget to renew your license to continue enjoying all features."
}

Renew your license: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings

If you have any questions, please contact our support team.
  `;

  return await sendEmail(user.email, subject, html, text);
}

/**
 * Send license expired email
 * @param {Object} user - User object
 */
export async function sendLicenseExpiredNotification(user) {
  const subject = 'Your license has expired';
  
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f44336;">License Expired</h2>
          <p>Hello ${user.username},</p>
          <p>Your <strong>${user.licenseType}</strong> license has expired.</p>
          <p style="color: #f44336; font-weight: bold;">⚠️ Your access has been limited. Renew now to restore full access.</p>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Renew License
            </a>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
License Expired

Hello ${user.username},

Your ${user.licenseType} license has expired.

⚠️ Your access has been limited. Renew now to restore full access.

Renew your license: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings

If you have any questions, please contact our support team.
  `;

  return await sendEmail(user.email, subject, html, text);
}

/**
 * Send payment failed notification
 * @param {Object} user - User object
 * @param {string} subscriptionId - Stripe subscription ID
 */
export async function sendPaymentFailedNotification(user, subscriptionId) {
  const subject = 'Payment failed for your subscription';
  
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f44336;">Payment Failed</h2>
          <p>Hello ${user.username},</p>
          <p>We were unable to process your subscription payment.</p>
          <p style="color: #f44336; font-weight: bold;">⚠️ Please update your payment method to avoid service interruption.</p>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Update Payment Method
            </a>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Subscription ID: ${subscriptionId}<br>
            If you have any questions, please contact our support team.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Payment Failed

Hello ${user.username},

We were unable to process your subscription payment.

⚠️ Please update your payment method to avoid service interruption.

Update payment method: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings

Subscription ID: ${subscriptionId}

If you have any questions, please contact our support team.
  `;

  return await sendEmail(user.email, subject, html, text);
}

/**
 * Send payment success notification
 * @param {Object} user - User object
 * @param {Object} payment - Payment object
 */
export async function sendPaymentSuccessNotification(user, payment) {
  const subject = 'Payment successful - Thank you!';
  
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4CAF50;">Payment Successful</h2>
          <p>Hello ${user.username},</p>
          <p>Thank you for your payment!</p>
          <p><strong>License Type:</strong> ${payment.licenseType}</p>
          <p><strong>Amount:</strong> ${payment.currency} ${payment.amount}</p>
          ${payment.isRecurring 
            ? '<p>Your subscription has been renewed successfully.</p>'
            : '<p>Your license has been activated.</p>'
          }
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View License Details
            </a>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Payment Successful

Hello ${user.username},

Thank you for your payment!

License Type: ${payment.licenseType}
Amount: ${payment.currency} ${payment.amount}

${payment.isRecurring 
  ? 'Your subscription has been renewed successfully.'
  : 'Your license has been activated.'
}

View license details: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings

If you have any questions, please contact our support team.
  `;

  return await sendEmail(user.email, subject, html, text);
}
