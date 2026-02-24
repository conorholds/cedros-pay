import { describe, it, expect } from 'vitest';
import { parseCsv } from './csvHelpers';

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
});
