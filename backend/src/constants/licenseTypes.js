/**
 * License Type Constants
 * Centralized constants for license types to avoid magic strings
 */

export const LICENSE_TYPES = {
  NONE: 'none',
  TRIAL: 'trial',
  TEMPORARY: 'temporary',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  LIFETIME: 'lifetime'
};

export const LICENSE_TYPE_VALUES = Object.values(LICENSE_TYPES);

export const LICENSE_TYPE_LABELS = {
  [LICENSE_TYPES.NONE]: 'None',
  [LICENSE_TYPES.TRIAL]: 'Trial (7 days)',
  [LICENSE_TYPES.TEMPORARY]: 'Temporary (30 days)',
  [LICENSE_TYPES.MONTHLY]: 'Monthly',
  [LICENSE_TYPES.QUARTERLY]: 'Quarterly',
  [LICENSE_TYPES.LIFETIME]: 'Lifetime'
};
