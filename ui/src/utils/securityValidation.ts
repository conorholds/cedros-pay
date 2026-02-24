/**
 * Security Validation Utilities
 *
 * Provides runtime security checks and recommendations for Cedros Pay deployments.
 * Helps developers identify potential security issues during development.
 */

/**
 * Security check result
 */
export interface SecurityCheckResult {
  passed: boolean;
  severity: 'info' | 'warning' | 'error';
  message: string;
  recommendation?: string;
}

/**
 * Security validation report
 */
export interface SecurityReport {
  checks: SecurityCheckResult[];
  overallStatus: 'secure' | 'warnings' | 'vulnerable';
  summary: string;
}

/**
 * Check if the page is served over HTTPS
 */
function checkHTTPS(): SecurityCheckResult {
  if (typeof window === 'undefined') {
    return {
      passed: true,
      severity: 'info',
      message: 'HTTPS check skipped (SSR environment)',
    };
  }

  const isHTTPS = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isHTTPS || isLocalhost) {
    return {
      passed: true,
      severity: 'info',
      message: 'HTTPS enforced',
    };
  }

  return {
    passed: false,
    severity: 'error',
    message: 'Page not served over HTTPS',
    recommendation: 'Enable HTTPS for all payment pages. Stripe.js requires HTTPS in production.',
  };
}

/**
 * Check if Content Security Policy is configured
 */
function checkCSP(): SecurityCheckResult {
  if (typeof document === 'undefined') {
    return {
      passed: true,
      severity: 'info',
      message: 'CSP check skipped (SSR environment)',
    };
  }

  // Check for CSP meta tag
  const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');

  // Check for CSP header (can't directly access, but we can check if scripts are blocked)
  const hasCSP = !!metaCSP;

  if (hasCSP) {
    return {
      passed: true,
      severity: 'info',
      message: 'Content Security Policy detected',
    };
  }

  return {
    passed: false,
    severity: 'warning',
    message: 'No Content Security Policy detected',
    recommendation: 'Configure CSP headers to protect against XSS and CDN compromise. Use generateCSP() helper from @cedros/pay-react.',
  };
}

/**
 * Check if running in development mode
 */
function checkDevelopmentMode(): SecurityCheckResult {
  const isDevelopment = process.env.NODE_ENV === 'development' ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost');

  if (!isDevelopment) {
    return {
      passed: true,
      severity: 'info',
      message: 'Running in production mode',
    };
  }

  return {
    passed: true,
    severity: 'info',
    message: 'Running in development mode (some security checks relaxed)',
  };
}

/**
 * Check Stripe.js loading configuration
 */
function checkStripeJSConfiguration(): SecurityCheckResult {
  // This is informational - we can't actually check if SRI is used
  // because we're using @stripe/stripe-js package which handles loading internally

  return {
    passed: true,
    severity: 'info',
    message: 'Stripe.js loaded via @stripe/stripe-js package (CSP recommended, not SRI)',
    recommendation: 'Ensure CSP script-src includes https://js.stripe.com',
  };
}

/**
 * Check for mixed content (HTTPS page loading HTTP resources)
 */
function checkMixedContent(): SecurityCheckResult {
  if (typeof window === 'undefined') {
    return {
      passed: true,
      severity: 'info',
      message: 'Mixed content check skipped (SSR environment)',
    };
  }

  // In modern browsers, mixed content is automatically blocked
  // This is more of an informational check
  const isHTTPS = window.location.protocol === 'https:';

  if (!isHTTPS) {
    return {
      passed: true,
      severity: 'info',
      message: 'Mixed content check skipped (HTTP page)',
    };
  }

  return {
    passed: true,
    severity: 'info',
    message: 'Mixed content protection active (HTTPS page)',
  };
}

/**
 * Run all security checks and generate a report
 *
 * @returns Security validation report with all checks
 *
 * @example
 * ```typescript
 * import { validateSecurity } from '@cedros/pay-react';
 *
 * const report = validateSecurity();
 * console.log(report.summary);
 *
 * if (report.overallStatus === 'vulnerable') {
 *   console.error('Security issues detected:');
 *   report.checks.forEach(check => {
 *     if (!check.passed) {
 *       console.error(`- ${check.message}`);
 *       if (check.recommendation) {
 *         console.error(`  Recommendation: ${check.recommendation}`);
 *       }
 *     }
 *   });
 * }
 * ```
 */
export function validateSecurity(): SecurityReport {
  const checks: SecurityCheckResult[] = [
    checkHTTPS(),
    checkCSP(),
    checkDevelopmentMode(),
    checkStripeJSConfiguration(),
    checkMixedContent(),
  ];

  // Determine overall status
  const hasErrors = checks.some((check) => check.severity === 'error' && !check.passed);
  const hasWarnings = checks.some((check) => check.severity === 'warning' && !check.passed);

  let overallStatus: 'secure' | 'warnings' | 'vulnerable';
  let summary: string;

  if (hasErrors) {
    overallStatus = 'vulnerable';
    summary = 'Security issues detected. Review errors and apply recommendations.';
  } else if (hasWarnings) {
    overallStatus = 'warnings';
    summary = 'Minor security warnings detected. Consider applying recommendations.';
  } else {
    overallStatus = 'secure';
    summary = 'All security checks passed.';
  }

  return {
    checks,
    overallStatus,
    summary,
  };
}

/**
 * Log security report to console (development only)
 *
 * @param report - Security report from validateSecurity()
 *
 * @example
 * ```typescript
 * import { validateSecurity, logSecurityReport } from '@cedros/pay-react';
 *
 * const report = validateSecurity();
 * logSecurityReport(report);
 * ```
 */
export function logSecurityReport(report: SecurityReport): void {
  if (process.env.NODE_ENV === 'production') {
    return; // Don't log in production
  }

  console.group('🔒 Cedros Pay Security Report');
  console.log(`Status: ${report.overallStatus.toUpperCase()}`);
  console.log(`Summary: ${report.summary}`);
  console.log('');

  report.checks.forEach((check) => {
    const icon = check.passed ? '✅' : check.severity === 'error' ? '❌' : '⚠️';
    console.log(`${icon} ${check.message}`);
    if (check.recommendation) {
      console.log(`   → ${check.recommendation}`);
    }
  });

  console.groupEnd();
}

/**
 * Security recommendations for production deployment
 */
export const SECURITY_RECOMMENDATIONS = {
  CSP: 'Use generateCSP() from @cedros/pay-react to generate Content Security Policy headers',
  HTTPS: 'Always serve payment pages over HTTPS in production',
  PACKAGE_UPDATES: 'Keep @stripe/stripe-js and @cedros/pay-react updated for security patches',
  AUDIT: 'Run npm audit regularly to check for known vulnerabilities',
  MONITORING: 'Monitor Stripe security advisories and apply updates promptly',
  NO_SRI: 'Do NOT use SRI hashes for Stripe.js - use CSP instead',
} as const;
