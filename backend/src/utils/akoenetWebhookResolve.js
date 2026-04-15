/**
 * Resolves AkoeNet webhook URL and shared secret for outbound calls (discovery + POST webhooks).
 *
 * When the user saves the same webhook URL as the host default (AKOENET_SCHEDULER_WEBHOOK_URL),
 * SCHEDULER_WEBHOOK_SECRET from the environment must win over a stale per-user secret in the DB
 * (otherwise updating Render env does nothing until the user clears/re-saves the secret).
 */

function webhookUrlsEquivalent(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x || !y) return false;
  if (x === y) return true;
  try {
    const ua = new URL(x);
    const ub = new URL(y);
    const pa = ua.pathname.replace(/\/$/, '');
    const pb = ub.pathname.replace(/\/$/, '');
    return ua.origin === ub.origin && pa === pb;
  } catch {
    return false;
  }
}

export function resolveAkoenetWebhookAndSecret(user) {
  const userUrl = (user?.akoenetWebhookUrl || '').trim();
  const envUrl = (process.env.AKOENET_SCHEDULER_WEBHOOK_URL || '').trim();
  const url = userUrl || envUrl;

  const userSecret = (user?.akoenetWebhookSecret || '').trim();
  const envSecret = (process.env.SCHEDULER_WEBHOOK_SECRET || '').trim();

  const usingOnlyHostUrl = !userUrl && !!envUrl;
  const userUrlMatchesHost = !!(envUrl && userUrl && webhookUrlsEquivalent(userUrl, envUrl));

  let secret;
  if (usingOnlyHostUrl || userUrlMatchesHost) {
    secret = envSecret || userSecret;
  } else {
    secret = userSecret || envSecret;
  }

  return { url, secret };
}
