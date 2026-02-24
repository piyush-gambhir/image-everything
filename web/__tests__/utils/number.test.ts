import { describe, expect, it } from 'vitest';
import { between, clamp, roundTo } from '@/utils/number';

describe('Number Utilities', () => {
  describe('clamp', () => {
    it('should clamp value between min and max', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('roundTo', () => {
    it('should round to specified decimal places', () => {
      expect(roundTo(3.14159, 2)).toBe(3.14);
      expect(roundTo(3.14159, 3)).toBe(3.142);
      expect(roundTo(3.14159, 0)).toBe(3);
    });

    it('should handle integers', () => {
      expect(roundTo(5, 2)).toBe(5);
    });
  });

  describe('between', () => {
    it('should check if value is between min and max', () => {
      expect(between(5, 0, 10)).toBe(true);
      expect(between(0, 0, 10)).toBe(true);
      expect(between(10, 0, 10)).toBe(true);
    });

    it('should return false for out of range values', () => {
      expect(between(-1, 0, 10)).toBe(false);
      expect(between(11, 0, 10)).toBe(false);
    });
  });
});
