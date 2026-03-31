/**
 * Notification System
 * Email via Resend (https://resend.com). Set RESEND_API_KEY and EMAIL_ENABLED=true.
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import logger from './logger.js';

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
const DEFAULT_FROM = 'StreamAutomator <no-reply@streamautomator.com>';
const EMAIL_FROM = (process.env.EMAIL_FROM || DEFAULT_FROM).trim();
const RESEND_API_URL = 'https://api.resend.com/emails';

function baseFrontendUrl() {
  return (
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_FRONTEND_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://streamautomator.com' : 'http://localhost:3000')
  );
}

function brandEmailHtml(innerBodyHtml) {
  const appUrl = baseFrontendUrl();
  return `
    <html>
      <body style="margin:0;padding:0;background-color:#f4f4f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding:20px 24px;background:linear-gradient(135deg,#2563eb 0%,#7c3aed 100%);color:#ffffff;">
                    <p style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:18px;font-weight:700;">StreamAutomator</p>
                    <p style="margin:4px 0 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;opacity:0.95;">Streamer Scheduler</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#27272a;">
                    ${innerBodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px 24px;border-top:1px solid #e4e4e7;">
                    <p style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:12px;color:#71717a;">
                      <a href="${appUrl}" style="color:#6366f1;text-decoration:none;">streamautomator.com</a>
                      · You received this because of an action on your StreamAutomator account or a schedule you follow.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
}

/**
 * @param {string} to - Recipient email
 * @param {string} subject
 * @param {string} html - Full HTML or fragment (wrapped with brand layout)
 * @param {string} text - Plain text
 * @param {{ skipBrandWrap?: boolean }} [opts]
 */
async function sendEmail(to, subject, html, text, opts = {}) {
  if (!EMAIL_ENABLED) {
    logger.info('Email notification (disabled)', {
      to,
      subject,
      note: 'EMAIL_ENABLED is false - email not sent',
    });
    return { success: false, reason: 'Email disabled' };
  }

  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    logger.error('Email not sent: RESEND_API_KEY is missing while EMAIL_ENABLED=true');
    return { success: false, reason: 'Missing RESEND_API_KEY' };
  }

  const recipients = Array.isArray(to) ? to : [to];
  const payload = {
    from: EMAIL_FROM,
    to: recipients,
    subject,
    html: opts.skipBrandWrap ? html : brandEmailHtml(html),
    ...(text ? { text } : {}),
  };

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));
    const daily = res.headers.get('x-resend-daily-quota');
    const monthly = res.headers.get('x-resend-monthly-quota');
    if (daily != null || monthly != null) {
      logger.debug('Resend quota headers', { daily, monthly });
    }

    if (!res.ok) {
      logger.error('Resend API error', {
        status: res.status,
        message: body?.message || body?.name,
        to: recipients[0],
        subject,
      });
      return { success: false, reason: body?.message || `HTTP ${res.status}` };
    }

    logger.info('Email sent via Resend', { id: body?.id, to: recipients[0], subject });
    return { success: true, id: body?.id };
  } catch (err) {
    logger.error('Resend request failed', { error: err.message, to: recipients[0], subject });
    return { success: false, reason: err.message };
  }
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

  const subject = `StreamAutomator: your ${user.licenseType} license expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`;
  const settingsHref = `${baseFrontendUrl()}/settings`;

  const html = `
          <h2 style="margin:0 0 16px;color:#16a34a;font-size:20px;">License expiration reminder</h2>
          <p>Hello ${user.username},</p>
          <p>Your <strong>${user.licenseType}</strong> license will expire in <strong>${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}</strong>.</p>
          <p><strong>Expiration date:</strong> ${expiryDate}</p>
          ${daysUntilExpiry <= 3 
            ? '<p style="color:#dc2626;font-weight:600;">Your license expires soon — renew to avoid losing access.</p>'
            : '<p>Renew anytime to keep full access to StreamAutomator.</p>'
          }
          <div style="margin:28px 0;">
            <a href="${settingsHref}"
               style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;padding:12px 22px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">
              Renew in settings
            </a>
          </div>
          <p style="color:#71717a;font-size:13px;">Questions? Reply to this email or use in-app support.</p>
  `;

  const text = `
StreamAutomator — license expiration reminder

Hello ${user.username},

Your ${user.licenseType} license will expire in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}.

Expiration Date: ${expiryDate}

${daysUntilExpiry <= 3 
  ? 'Your license expires soon — renew to avoid losing access.'
  : 'Renew anytime to keep full access to StreamAutomator.'
}

Renew: ${settingsHref}

If you have any questions, please contact our support team.
  `;

  return await sendEmail(user.email, subject, html, text);
}

/**
 * Send license expired email
 * @param {Object} user - User object
 */
export async function sendLicenseExpiredNotification(user) {
  const subject = 'StreamAutomator: your license has expired';
  const settingsHref = `${baseFrontendUrl()}/settings`;

  const html = `
          <h2 style="margin:0 0 16px;color:#dc2626;font-size:20px;">License expired</h2>
          <p>Hello ${user.username},</p>
          <p>Your <strong>${user.licenseType}</strong> license has expired.</p>
          <p style="color:#dc2626;font-weight:600;">Your account may have limited access until you renew.</p>
          <div style="margin:28px 0;">
            <a href="${settingsHref}"
               style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;padding:12px 22px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">
              Renew in settings
            </a>
          </div>
          <p style="color:#71717a;font-size:13px;">Renew on streamautomator.com to restore full features.</p>
  `;

  const text = `
StreamAutomator — license expired

Hello ${user.username},

Your ${user.licenseType} license has expired.

Your account may have limited access until you renew.

Renew: ${settingsHref}

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
  const subject = 'StreamAutomator: payment failed for your subscription';
  const settingsHref = `${baseFrontendUrl()}/settings`;

  const html = `
          <h2 style="margin:0 0 16px;color:#dc2626;font-size:20px;">Payment failed</h2>
          <p>Hello ${user.username},</p>
          <p>We could not charge your saved payment method for StreamAutomator.</p>
          <p style="color:#dc2626;font-weight:600;">Update your billing details to keep your subscription active.</p>
          <div style="margin:28px 0;">
            <a href="${settingsHref}"
               style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;padding:12px 22px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">
              Update payment method
            </a>
          </div>
          <p style="color:#71717a;font-size:12px;">Subscription reference: ${subscriptionId}</p>
  `;

  const text = `
StreamAutomator — payment failed

Hello ${user.username},

We could not charge your saved payment method.

Update billing: ${settingsHref}

Subscription reference: ${subscriptionId}

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
  const subject = 'StreamAutomator: payment received — thank you';
  const settingsHref = `${baseFrontendUrl()}/settings`;

  const html = `
          <h2 style="margin:0 0 16px;color:#16a34a;font-size:20px;">Payment successful</h2>
          <p>Hello ${user.username},</p>
          <p>Thanks for supporting <strong>StreamAutomator</strong>.</p>
          <p><strong>Plan:</strong> ${payment.licenseType}<br><strong>Amount:</strong> ${payment.currency} ${payment.amount}</p>
          ${payment.isRecurring 
            ? '<p>Your subscription is active for the next billing period.</p>'
            : '<p>Your license is now active.</p>'
          }
          <div style="margin:28px 0;">
            <a href="${settingsHref}"
               style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;padding:12px 22px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">
              Open settings
            </a>
          </div>
  `;

  const text = `
StreamAutomator — payment successful

Hello ${user.username},

Thanks for your payment.

License Type: ${payment.licenseType}
Amount: ${payment.currency} ${payment.amount}

${payment.isRecurring 
  ? 'Your subscription is active for the next billing period.'
  : 'Your license is now active.'
}

Settings: ${settingsHref}

If you have any questions, please contact our support team.
  `;

  return await sendEmail(user.email, subject, html, text);
}

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {string} tempPassword - Temporary password generated
 */
export async function sendPasswordResetEmail(user, tempPassword) {
  const subject = 'StreamAutomator: administrator password reset';
  const loginHref = `${baseFrontendUrl()}/login`;

  const html = `
          <h2 style="margin:0 0 16px;color:#2563eb;font-size:20px;">Password reset by an admin</h2>
          <p>Hello ${user.username},</p>
          <p>An administrator generated a new temporary password for your StreamAutomator account.</p>
          <p style="background:#f4f4f5;padding:16px;border-radius:8px;border-left:4px solid #2563eb;margin:20px 0;">
            <strong>Temporary password</strong><br>
            <code style="font-size:17px;font-weight:700;color:#18181b;word-break:break-all;">${tempPassword}</code>
          </p>
          <p style="color:#dc2626;font-weight:600;">Sign in and change this password immediately in Settings → Profile.</p>
          <div style="margin:28px 0;">
            <a href="${loginHref}"
               style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;padding:12px 22px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">
              Log in
            </a>
          </div>
          <p style="color:#71717a;font-size:13px;">If you did not expect this email, contact support right away.</p>
  `;

  const text = `
StreamAutomator — administrator password reset

Hello ${user.username},

Temporary password: ${tempPassword}

Sign in and change it immediately: ${loginHref}

If you did not request this password reset, please contact our support team immediately.
  `;

  return await sendEmail(user.email, subject, html, text);
}

/**
 * Send stream reminder email (viewer subscribed via "Notify me" on public page).
 * @param {string} to - Subscriber email
 * @param {string} streamTitle - Title of the stream
 * @param {Date|string} scheduledFor - When the stream starts
 * @param {string} streamerUsername - Streamer username
 */
export async function sendStreamReminderEmail(to, streamTitle, scheduledFor, streamerUsername) {
  const timeStr = typeof scheduledFor === 'string' ? new Date(scheduledFor).toLocaleString() : scheduledFor.toLocaleString();
  const subject = `StreamAutomator: ${streamerUsername} goes live in ~1 hour — ${streamTitle}`;
  const streamUrl = `${baseFrontendUrl()}/streamer/${encodeURIComponent(streamerUsername)}`;
  const html = `
          <h2 style="margin:0 0 16px;color:#7c3aed;font-size:20px;">Stream starting soon</h2>
          <p>You asked us to remind you before <strong>${streamerUsername}</strong> goes live on StreamAutomator.</p>
          <p style="font-size:17px;font-weight:600;margin:12px 0;">${streamTitle}</p>
          <p><strong>Scheduled:</strong> ${timeStr}</p>
          <div style="margin:28px 0;">
            <a href="${streamUrl}"
               style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;padding:12px 22px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">
              View public schedule
            </a>
          </div>
          <p style="color:#71717a;font-size:13px;">You subscribed via “Notify me” on the streamer’s public page.</p>
  `;
  const text = `StreamAutomator reminder: ${streamerUsername} — ${streamTitle} at ${timeStr}. Schedule: ${streamUrl}`;
  return await sendEmail(to, subject, html, text);
}
