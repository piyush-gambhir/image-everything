import { describe, expect, it } from 'vitest';
import { capitalize, slugify, titleCase } from '@/utils/string';

describe('String Utilities', () => {
  describe('capitalize', () => {
    it('should capitalize the first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('HELLO');
    });

    it('should handle empty strings', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('slugify', () => {
    it('should convert text to URL-safe slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Test  Multiple   Spaces')).toBe('test-multiple-spaces');
    });

    it('should handle special characters', () => {
      expect(slugify('Hello, World!')).toBe('hello-world');
      expect(slugify('café & résumé')).toBe('cafe-resume');
    });

    it('should trim leading and trailing hyphens', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
      expect(slugify('---test---')).toBe('test');
    });
  });

  describe('titleCase', () => {
    it('should convert to title case', () => {
      expect(titleCase('hello world')).toBe('Hello World');
      expect(titleCase('the quick brown fox')).toBe('The Quick Brown Fox');
    });

    it('should handle single words', () => {
      expect(titleCase('hello')).toBe('Hello');
    });

    it('should handle empty strings', () => {
      expect(titleCase('')).toBe('');
    });
  });
});
