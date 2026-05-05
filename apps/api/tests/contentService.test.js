/**
 * Content Service Tests
 * Basic unit tests for content service
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { contentService } from '../src/services/contentService.js';

describe('ContentService', () => {
  beforeEach(() => {
    // Reset mocks if needed
  });

  describe('buildOccurrences', () => {
    it('should return single date when recurrence is disabled', () => {
      const baseDate = new Date('2026-02-10T10:00:00Z');
      const occurrences = contentService.buildOccurrences(baseDate, { enabled: false });
      
      expect(occurrences).toHaveLength(1);
      expect(occurrences[0]).toEqual(baseDate);
    });

    it('should build daily occurrences', () => {
      const baseDate = new Date('2026-02-10T10:00:00Z');
      const occurrences = contentService.buildOccurrences(baseDate, {
        enabled: true,
        frequency: 'daily',
        count: 3,
      });
      
      expect(occurrences).toHaveLength(3);
      expect(occurrences[0].getDate()).toBe(10);
      expect(occurrences[1].getDate()).toBe(11);
      expect(occurrences[2].getDate()).toBe(12);
    });

    it('should build weekly occurrences', () => {
      const baseDate = new Date('2026-02-10T10:00:00Z');
      const occurrences = contentService.buildOccurrences(baseDate, {
        enabled: true,
        frequency: 'weekly',
        count: 2,
      });
      
      expect(occurrences).toHaveLength(2);
      const daysDiff = (occurrences[1] - occurrences[0]) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBe(7);
    });

    it('should limit occurrences to 50', () => {
      const baseDate = new Date('2026-02-10T10:00:00Z');
      const occurrences = contentService.buildOccurrences(baseDate, {
        enabled: true,
        frequency: 'daily',
        count: 100, // More than max
      });
      
      expect(occurrences.length).toBeLessThanOrEqual(50);
    });
  });
});
