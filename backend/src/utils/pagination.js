/**
 * Pagination utilities
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { APP_CONFIG } from '../constants/app.js';

/**
 * Parse and validate pagination parameters from request
 * @param {object} query - Request query object
 * @returns {{page: number, limit: number, offset: number}}
 */
export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(
    APP_CONFIG.PAGINATION.MAX_LIMIT,
    Math.max(
      APP_CONFIG.PAGINATION.MIN_LIMIT,
      parseInt(query.limit) || APP_CONFIG.PAGINATION.DEFAULT_LIMIT
    )
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Format paginated response
 * @param {Array} data - Array of results
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Paginated response
 */
export function formatPaginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  };
}
