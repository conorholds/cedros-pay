import { describe, it, expect } from 'vitest';
import { parseCsv, toCsv, addToCsv, removeFromCsv } from './csvHelpers';

describe('csvHelpers', () => {
  describe('parseCsv', () => {
    it('parses comma-separated string into array', () => {
      expect(parseCsv('a, b, c')).toEqual(['a', 'b', 'c']);
    });

    it('trims whitespace from values', () => {
      expect(parseCsv('  x  ,  y  ,  z  ')).toEqual(['x', 'y', 'z']);
    });

    it('filters out empty values', () => {
      expect(parseCsv('a, , b, , c')).toEqual(['a', 'b', 'c']);
    });

    it('returns empty array for empty string', () => {
      expect(parseCsv('')).toEqual([]);
    });

    it('returns empty array for null', () => {
      expect(parseCsv(null)).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      expect(parseCsv(undefined)).toEqual([]);
    });

    it('handles single value', () => {
      expect(parseCsv('single')).toEqual(['single']);
    });

    it('handles values with commas in content gracefully', () => {
      // Note: This is simple CSV parsing, not handling quoted values
      expect(parseCsv('a, b, c, d')).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('toCsv', () => {
    it('joins array into comma-separated string', () => {
      expect(toCsv(['a', 'b', 'c'])).toBe('a, b, c');
    });

    it('returns empty string for empty array', () => {
      expect(toCsv([])).toBe('');
    });

    it('handles single value', () => {
      expect(toCsv(['single'])).toBe('single');
    });
  });

  describe('addToCsv', () => {
    it('adds value to CSV string', () => {
      expect(addToCsv('a, b', 'c')).toBe('a, b, c');
    });

    it('does not add duplicate value', () => {
      expect(addToCsv('a, b', 'a')).toBe('a, b');
    });

    it('trims value before adding', () => {
      expect(addToCsv('a, b', '  c  ')).toBe('a, b, c');
    });

    it('handles null/undefined input', () => {
      expect(addToCsv(null, 'a')).toBe('a');
      expect(addToCsv(undefined, 'b')).toBe('b');
    });

    it('handles empty string input', () => {
      expect(addToCsv('', 'a')).toBe('a');
    });
  });

  describe('removeFromCsv', () => {
    it('removes value from CSV string', () => {
      expect(removeFromCsv('a, b, c', 'b')).toBe('a, c');
    });

    it('returns unchanged if value not found', () => {
      expect(removeFromCsv('a, b', 'c')).toBe('a, b');
    });

    it('trims value before removing', () => {
      expect(removeFromCsv('a, b, c', '  b  ')).toBe('a, c');
    });

    it('handles null/undefined input', () => {
      expect(removeFromCsv(null, 'a')).toBe('');
      expect(removeFromCsv(undefined, 'b')).toBe('');
    });

    it('handles empty string input', () => {
      expect(removeFromCsv('', 'a')).toBe('');
    });
  });
});
