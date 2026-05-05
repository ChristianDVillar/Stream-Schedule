/**
 * Utility functions for license management
 * Shared across routes to avoid code duplication
 */

import { LICENSE_TYPES, LICENSE_TYPE_VALUES } from '../constants/licenseTypes.js';

export function normalizeLicenseType(licenseType) {
  if (!licenseType) return LICENSE_TYPES.TEMPORARY;
  return LICENSE_TYPE_VALUES.includes(licenseType) ? licenseType : LICENSE_TYPES.TEMPORARY;
}

export function resolveLicenseExpiry({ expiresAt, durationDays, licenseType }) {
  if (licenseType === LICENSE_TYPES.LIFETIME || licenseType === LICENSE_TYPES.NONE) {
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
  if (licenseType === LICENSE_TYPES.TRIAL) fallbackDays = 7;
  if (licenseType === LICENSE_TYPES.MONTHLY) fallbackDays = 30;
  if (licenseType === LICENSE_TYPES.QUARTERLY) fallbackDays = 90;
  const days = Number.isFinite(durationDays) ? Number(durationDays) : fallbackDays;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return { value: date };
}

export function buildLicenseSummary(user) {
  const type = user.licenseType || LICENSE_TYPES.NONE;
  const expiresAt = user.licenseExpiresAt;
  if (type === LICENSE_TYPES.LIFETIME || type === LICENSE_TYPES.NONE) {
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
