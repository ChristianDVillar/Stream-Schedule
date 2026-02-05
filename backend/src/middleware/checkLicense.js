import { User } from '../models/index.js';
import { LICENSE_TYPES } from '../constants/licenseTypes.js';
import { normalizeLicenseType, resolveLicenseExpiry } from '../utils/licenseUtils.js';
import { generateLicenseKey } from '../utils/cryptoUtils.js';
import logger from '../utils/logger.js';

/**
 * Assign trial to user once (idempotent: only if !hasUsedTrial). Updates DB and req.user.
 */
async function assignTrialIfEligible(req) {
  if (req.user.hasUsedTrial) return false;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || user.hasUsedTrial) return false;
    const expiryResult = resolveLicenseExpiry({ licenseType: normalizeLicenseType('trial') });
    user.licenseType = normalizeLicenseType('trial');
    user.licenseKey = generateLicenseKey('TRIAL', 12);
    user.licenseExpiresAt = expiryResult.error ? null : expiryResult.value;
    user.hasUsedTrial = true;
    await user.save();
    req.user = user.get({ plain: true });
    logger.info('Trial assigned on request', { userId: req.user.id });
    return true;
  } catch (err) {
    logger.warn('Could not assign trial in checkLicense', { userId: req.user?.id, error: err.message });
    return false;
  }
}

export default async function checkLicense(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user.isAdmin) {
      return next();
    }

    const licenseType = (req.user.licenseType || '').toLowerCase();
    const rawExpiry = req.user.licenseExpiresAt;
    const hasValidExpiry = rawExpiry != null && (() => {
      const expiresAt = new Date(rawExpiry);
      const valid = !Number.isNaN(expiresAt.getTime()) && expiresAt >= new Date();
      if (process.env.NODE_ENV === 'development' && licenseType === LICENSE_TYPES.TRIAL) {
        logger.debug('Trial licence check', {
          userId: req.user.id,
          licenseType,
          licenseExpiresAt: rawExpiry,
          valid,
        });
      }
      return valid;
    })();
    const trialNoExpirySet = licenseType === LICENSE_TYPES.TRIAL && (rawExpiry == null || rawExpiry === '');

    // Trial users: allow if expiry is in the future, or if trial with no expiry set (legacy)
    if (licenseType === LICENSE_TYPES.TRIAL && (hasValidExpiry || trialNoExpirySet)) {
      return next();
    }

    // No valid license key: try to assign trial once if user never used it
    if (!req.user.licenseKey || String(req.user.licenseKey).length < 10) {
      const assigned = await assignTrialIfEligible(req);
      if (assigned) return next();
      return res.status(403).json({
        error: 'Invalid or missing license',
        code: 'LICENSE_INVALID',
        message: 'You need a valid license to schedule content. Please go to Settings to activate a trial or purchase a license.'
      });
    }

    if (req.user.licenseExpiresAt) {
      const expiresAt = new Date(req.user.licenseExpiresAt);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
        return res.status(403).json({
          error: 'License expired',
          code: 'LICENSE_EXPIRED',
          message: 'Your license has expired. Please renew in Settings to continue scheduling content.'
        });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}