import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateSecurity,
  logSecurityReport,
  SECURITY_RECOMMENDATIONS,
  type SecurityReport,
} from '../utils/securityValidation';

describe('securityValidation', () => {
  describe('validateSecurity', () => {
    beforeEach(() => {
      // Reset NODE_ENV
      vi.stubEnv('NODE_ENV', 'test');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should return a security report with checks', () => {
      const report = validateSecurity();

      expect(report).toHaveProperty('checks');
      expect(report).toHaveProperty('overallStatus');
      expect(report).toHaveProperty('summary');
      expect(Array.isArray(report.checks)).toBe(true);
      expect(report.checks.length).toBeGreaterThan(0);
    });

    it('should check HTTPS (skipped in SSR)', () => {
      const report = validateSecurity();
      const httpsCheck = report.checks.find((c) => c.message.includes('HTTPS'));

      expect(httpsCheck).toBeDefined();
      expect(httpsCheck?.severity).toBe('info');
    });

    it('should check CSP configuration', () => {
      const report = validateSecurity();
      const cspCheck = report.checks.find((c) => c.message.includes('Content Security Policy'));

      expect(cspCheck).toBeDefined();
    });

    it('should check development mode', () => {
      const report = validateSecurity();
      const devCheck = report.checks.find((c) => c.message.includes('development'));

      expect(devCheck).toBeDefined();
    });

    it('should check Stripe.js configuration', () => {
      const report = validateSecurity();
      const stripeCheck = report.checks.find((c) => c.message.includes('Stripe.js'));

      expect(stripeCheck).toBeDefined();
      expect(stripeCheck?.passed).toBe(true);
      expect(stripeCheck?.message).toContain('CSP recommended, not SRI');
    });

    it('should check mixed content', () => {
      const report = validateSecurity();
      const mixedContentCheck = report.checks.find((c) => c.message.includes('Mixed content'));

      expect(mixedContentCheck).toBeDefined();
    });

    it('should return overall status as secure when all checks pass', () => {
      const report = validateSecurity();

      // In test environment, most checks should pass
      const hasErrors = report.checks.some((c) => c.severity === 'error' && !c.passed);
      if (!hasErrors) {
        expect(['secure', 'warnings']).toContain(report.overallStatus);
      }
    });

    it('should include recommendations for failed checks', () => {
      const report = validateSecurity();

      report.checks.forEach((check) => {
        if (!check.passed && (check.severity === 'warning' || check.severity === 'error')) {
          expect(check.recommendation).toBeDefined();
          expect(typeof check.recommendation).toBe('string');
          expect(check.recommendation!.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('logSecurityReport', () => {
    let consoleGroupSpy: ReturnType<typeof vi.spyOn>;
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleGroupEndSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
      vi.stubEnv('NODE_ENV', 'development');
    });

    afterEach(() => {
      consoleGroupSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
      vi.unstubAllEnvs();
    });

    it('should log security report in development', () => {
      const report: SecurityReport = {
        checks: [
          {
            passed: true,
            severity: 'info',
            message: 'HTTPS enforced',
          },
        ],
        overallStatus: 'secure',
        summary: 'All checks passed',
      };

      logSecurityReport(report);

      expect(consoleGroupSpy).toHaveBeenCalledWith(expect.stringContaining('Security Report'));
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    it('should not log in production', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const report: SecurityReport = {
        checks: [],
        overallStatus: 'secure',
        summary: 'All checks passed',
      };

      logSecurityReport(report);

      expect(consoleGroupSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log recommendations for failed checks', () => {
      const report: SecurityReport = {
        checks: [
          {
            passed: false,
            severity: 'warning',
            message: 'No CSP detected',
            recommendation: 'Configure CSP headers',
          },
        ],
        overallStatus: 'warnings',
        summary: 'Warnings detected',
      };

      logSecurityReport(report);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No CSP detected'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Configure CSP headers'));
    });

    it('should use different icons for different severities', () => {
      const report: SecurityReport = {
        checks: [
          { passed: true, severity: 'info', message: 'Passed check' },
          { passed: false, severity: 'warning', message: 'Warning check' },
          { passed: false, severity: 'error', message: 'Error check' },
        ],
        overallStatus: 'vulnerable',
        summary: 'Issues detected',
      };

      logSecurityReport(report);

      // Check that different icons are used
      const calls = consoleLogSpy.mock.calls;
      const hasPassedIcon = calls.some((call: string[]) => String(call[0]).includes('✅'));
      const hasWarningIcon = calls.some((call: string[]) => String(call[0]).includes('⚠️'));
      const hasErrorIcon = calls.some((call: string[]) => String(call[0]).includes('❌'));

      expect(hasPassedIcon).toBe(true);
      expect(hasWarningIcon).toBe(true);
      expect(hasErrorIcon).toBe(true);
    });
  });

  describe('SECURITY_RECOMMENDATIONS', () => {
    it('should export security recommendations', () => {
      expect(SECURITY_RECOMMENDATIONS).toBeDefined();
      expect(typeof SECURITY_RECOMMENDATIONS).toBe('object');
    });

    it('should include CSP recommendation', () => {
      expect(SECURITY_RECOMMENDATIONS.CSP).toBeDefined();
      expect(SECURITY_RECOMMENDATIONS.CSP).toContain('generateCSP');
    });

    it('should include HTTPS recommendation', () => {
      expect(SECURITY_RECOMMENDATIONS.HTTPS).toBeDefined();
      expect(SECURITY_RECOMMENDATIONS.HTTPS).toContain('HTTPS');
    });

    it('should include package updates recommendation', () => {
      expect(SECURITY_RECOMMENDATIONS.PACKAGE_UPDATES).toBeDefined();
      expect(SECURITY_RECOMMENDATIONS.PACKAGE_UPDATES).toContain('@stripe/stripe-js');
    });

    it('should include audit recommendation', () => {
      expect(SECURITY_RECOMMENDATIONS.AUDIT).toBeDefined();
      expect(SECURITY_RECOMMENDATIONS.AUDIT).toContain('npm audit');
    });

    it('should include monitoring recommendation', () => {
      expect(SECURITY_RECOMMENDATIONS.MONITORING).toBeDefined();
      expect(SECURITY_RECOMMENDATIONS.MONITORING).toContain('security advisories');
    });

    it('should explicitly recommend against SRI for Stripe.js', () => {
      expect(SECURITY_RECOMMENDATIONS.NO_SRI).toBeDefined();
      expect(SECURITY_RECOMMENDATIONS.NO_SRI).toContain('Do NOT use SRI');
      expect(SECURITY_RECOMMENDATIONS.NO_SRI).toContain('Stripe.js');
      expect(SECURITY_RECOMMENDATIONS.NO_SRI).toContain('CSP');
    });

    it('should have all recommendations as strings', () => {
      Object.values(SECURITY_RECOMMENDATIONS).forEach((rec) => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });
  });

  describe('integration', () => {
    it('should be usable in a typical workflow', () => {
      // Simulate typical usage
      const report = validateSecurity();

      // Check that report is usable
      expect(report.overallStatus).toMatch(/secure|warnings|vulnerable/);

      // Check that checks can be filtered
      const failedChecks = report.checks.filter((c) => !c.passed);
      expect(Array.isArray(failedChecks)).toBe(true);

      // Check that recommendations can be accessed
      const recommendations = report.checks
        .filter((c) => c.recommendation)
        .map((c) => c.recommendation);
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });
});
