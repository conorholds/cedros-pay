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
export declare function validateSecurity(): SecurityReport;
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
export declare function logSecurityReport(report: SecurityReport): void;
/**
 * Security recommendations for React Native production deployment
 */
export declare const SECURITY_RECOMMENDATIONS: {
    readonly SSL_PINNING: "Configure SSL pinning at the native iOS/Android layer for API security";
    readonly ATS: "Enable iOS App Transport Security (ATS) to enforce HTTPS connections";
    readonly ANDROID_NETWORK_CONFIG: "Use Android Network Security Config to control cleartext traffic and certificate trust";
    readonly DEBUG_MODE: "Never ship production apps with debug mode enabled - __DEV__ should be false";
    readonly PACKAGE_UPDATES: "Keep @stripe/stripe-react-native and @cedros/pay-react-native updated for security patches";
    readonly AUDIT: "Run npm audit regularly to check for known vulnerabilities";
    readonly MONITORING: "Monitor Stripe security advisories and apply updates promptly";
    readonly SECURE_STORAGE: "Use platform-specific secure storage (Keychain/KeyStore) for sensitive payment data";
};
//# sourceMappingURL=securityValidation.d.ts.map