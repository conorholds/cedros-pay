import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logDeprecation,
  deprecate,
  deprecateClass,
  deprecateExport,
  resetDeprecationWarnings,
  DeprecationLevel,
} from '../utils/deprecation';
import { getLogger } from '../utils/logger';

describe('Deprecation Utilities', () => {
  beforeEach(() => {
    // Reset deprecation state before each test
    resetDeprecationWarnings();

    // Clear all mocks and spy on logger methods
    vi.clearAllMocks();
    vi.spyOn(getLogger(), 'warn');
    vi.spyOn(getLogger(), 'error');
  });

  describe('logDeprecation', () => {
    it('should log a warning deprecation message', () => {
      logDeprecation({
        feature: 'oldFunction',
        reason: 'Better implementation available',
        replacement: 'newFunction',
        removalVersion: '3.0.0',
        level: DeprecationLevel.WARNING,
      });

      expect(getLogger().warn).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED - Remove in v3.0.0] oldFunction')
      );
      expect(getLogger().warn).toHaveBeenCalledWith(
        expect.stringContaining('Use instead: newFunction')
      );
    });

    it('should log notice level deprecations', () => {
      logDeprecation({
        feature: 'oldAPI',
        reason: 'API redesign',
        level: DeprecationLevel.NOTICE,
      });

      expect(getLogger().warn).toHaveBeenCalled();
    });

    it('should log critical deprecations as errors', () => {
      logDeprecation({
        feature: 'criticalAPI',
        reason: 'Security vulnerability',
        level: DeprecationLevel.CRITICAL,
      });

      expect(getLogger().error).toHaveBeenCalled();
    });

    it('should only log once per feature+level', () => {
      logDeprecation({
        feature: 'repeatedAPI',
        reason: 'Test',
        level: DeprecationLevel.WARNING,
      });

      logDeprecation({
        feature: 'repeatedAPI',
        reason: 'Test',
        level: DeprecationLevel.WARNING,
      });

      // Should only warn once
      expect(getLogger().warn).toHaveBeenCalledTimes(1);
    });

    it('should include migration guide if provided', () => {
      logDeprecation({
        feature: 'oldAPI',
        reason: 'Redesign',
        migrationGuide: 'https://docs.example.com/migration',
        level: DeprecationLevel.WARNING,
      });

      expect(getLogger().warn).toHaveBeenCalledWith(
        expect.stringContaining('Migration guide: https://docs.example.com/migration')
      );
    });
  });

  describe('deprecate (function wrapper)', () => {
    it('should wrap function and log deprecation on call', () => {
      const originalFn = vi.fn((x: number) => x * 2);

      const deprecatedFn = deprecate(originalFn, {
        feature: 'multiplyByTwo',
        reason: 'Use Math.pow instead',
        replacement: 'Math.pow(x, 2)',
        removalVersion: '3.0.0',
        level: DeprecationLevel.WARNING,
      });

      const result = deprecatedFn(5);

      expect(result).toBe(10);
      expect(originalFn).toHaveBeenCalledWith(5);
      expect(getLogger().warn).toHaveBeenCalled();
    });

    it('should preserve function behavior', async () => {
      const asyncFn = async (x: number): Promise<number> => {
        return x + 1;
      };

      const deprecated = deprecate(asyncFn, {
        feature: 'asyncFn',
        reason: 'Test',
        level: DeprecationLevel.WARNING,
      });

      await expect(deprecated(5)).resolves.toBe(6);
    });
  });

  describe('deprecateClass', () => {
    it('should wrap class and log deprecation on construction', () => {
      class TestClass {
        value: number;
        constructor(val: number) {
          this.value = val;
        }
      }

      const DeprecatedClass = deprecateClass(TestClass, {
        feature: 'TestClass',
        reason: 'Use new implementation',
        replacement: 'NewClass',
        removalVersion: '3.0.0',
        level: DeprecationLevel.CRITICAL,
      });

      const instance = new DeprecatedClass(42);

      expect(instance.value).toBe(42);
      expect(instance instanceof TestClass).toBe(true);
      expect(getLogger().error).toHaveBeenCalled();
    });

    it('should only log deprecation once for multiple instances', () => {
      class TestClass {
        constructor(public val: number) {}
      }

      const DeprecatedClass = deprecateClass(TestClass, {
        feature: 'TestClass',
        reason: 'Test',
        level: DeprecationLevel.WARNING,
      });

      new DeprecatedClass(1);
      new DeprecatedClass(2);

      // Should only warn once
      expect(getLogger().warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('deprecateExport', () => {
    it('should deprecate function exports', () => {
      // Use a regular function, not vi.fn() which has a prototype
      const fn = (x: number) => x + 1;

      const deprecatedFn = deprecateExport(fn, {
        feature: 'exportedFn',
        reason: 'Moved to new package',
        level: DeprecationLevel.NOTICE,
      });

      expect(deprecatedFn(5)).toBe(6);
      expect(getLogger().warn).toHaveBeenCalled();
    });

    it('should deprecate class exports', () => {
      class ExportedClass {
        constructor(public val: number) {}
      }

      const DeprecatedExport = deprecateExport(ExportedClass, {
        feature: 'ExportedClass',
        reason: 'Use interface instead',
        level: DeprecationLevel.WARNING,
      });

      const instance = new DeprecatedExport(42);
      expect(instance.val).toBe(42);
      expect(getLogger().warn).toHaveBeenCalled();
    });

    it('should deprecate object exports', () => {
      const obj = { foo: 'bar', nested: { value: 123 } };

      const deprecatedObj = deprecateExport(obj, {
        feature: 'configObject',
        reason: 'Use new config format',
        level: DeprecationLevel.WARNING,
      });

      // First access should warn
      expect(deprecatedObj.foo).toBe('bar');
      expect(getLogger().warn).toHaveBeenCalledTimes(1);

      // Subsequent access should not warn again
      expect(deprecatedObj.nested.value).toBe(123);
      expect(getLogger().warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetDeprecationWarnings', () => {
    it('should allow re-logging after reset', () => {
      logDeprecation({
        feature: 'testAPI',
        reason: 'Test',
        level: DeprecationLevel.WARNING,
      });

      expect(getLogger().warn).toHaveBeenCalledTimes(1);

      resetDeprecationWarnings();

      logDeprecation({
        feature: 'testAPI',
        reason: 'Test',
        level: DeprecationLevel.WARNING,
      });

      expect(getLogger().warn).toHaveBeenCalledTimes(2);
    });
  });
});
