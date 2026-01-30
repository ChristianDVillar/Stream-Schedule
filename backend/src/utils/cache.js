/**
 * Simple in-memory cache with TTL
 * Used for caching stats and other frequently accessed data
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

class Cache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds (default: 30)
   */
  set(key, value, ttlSeconds = 30) {
    // Delete existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const expiresAt = Date.now() + (ttlSeconds * 1000);
    
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    // Set timer to auto-delete after TTL
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
  }

  /**
   * Get cache stats (useful for monitoring)
   * @returns {object} - Cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const item of this.cache.values()) {
      if (now > item.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      timers: this.timers.size
    };
  }

  /**
   * Clean expired entries (manual cleanup)
   */
  cleanExpired() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
    
    return keysToDelete.length;
  }
}

// Export singleton instance
export const cache = new Cache();

// Clean expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cache.cleanExpired();
  }, 5 * 60 * 1000); // 5 minutes
}
