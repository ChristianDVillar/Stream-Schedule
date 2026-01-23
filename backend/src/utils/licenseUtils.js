/**
 * Utility functions for license management
 * Shared across routes to avoid code duplication
 */

export function normalizeLicenseType(licenseType) {
  const allowed = ['none', 'temporary', 'monthly', 'quarterly', 'lifetime'];
  if (!licenseType) return 'temporary';
  return allowed.includes(licenseType) ? licenseType : 'temporary';
}

export function resolveLicenseExpiry({ expiresAt, durationDays, licenseType }) {
  if (licenseType === 'lifetime' || licenseType === 'none') {
    return { value: null };
  }
  if (expiresAt) {
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return { error: 'Invalid expiresAt' };
    }
    return { value: parsed };
  }
  let fallbackDays = 30;
  if (licenseType === 'monthly') fallbackDays = 30;
  if (licenseType === 'quarterly') fallbackDays = 90;
  const days = Number.isFinite(durationDays) ? Number(durationDays) : fallbackDays;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return { value: date };
}

export function buildLicenseSummary(user) {
  const type = user.licenseType || 'none';
  const expiresAt = user.licenseExpiresAt;
  if (type === 'lifetime' || type === 'none') {
    return { licenseType: type, daysLeft: null, alert: 'none' };
  }
  if (!expiresAt) {
    return { licenseType: type, daysLeft: null, alert: 'none' };
  }
  const now = new Date();
  const end = new Date(expiresAt);
  const diffMs = end - now;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  let alert = 'none';
  if (daysLeft <= 0) {
    alert = 'expired';
  } else if (daysLeft <= 3) {
    alert = '3_days';
  } else if (daysLeft <= 7) {
    alert = '7_days';
  }
  return { licenseType: type, daysLeft, alert };
}
