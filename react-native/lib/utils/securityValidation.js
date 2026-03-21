"use strict";
/**
 * Security Validation Utilities
 *
 * Provides runtime security checks and recommendations for Cedros Pay deployments.
 * Helps developers identify potential security issues during development.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECURITY_RECOMMENDATIONS = void 0;
exports.validateSecurity = validateSecurity;
exports.logSecurityReport = logSecurityReport;
/**
 * Check if SSL Pinning is configured for secure API communication
 * Note: This is a placeholder - actual SSL pinning is configured at the native layer
 */
function checkSecureConnection() {
    return {
        passed: true,
        severity: 'info',
        message: 'SSL/TLS connection security handled by React Native networking layer',
        recommendation: 'Ensure SSL pinning is configured at the native iOS/Android layer for production apps.',
    };
}
/**
 * Check React Native platform security considerations
 */
function checkPlatformSecurity() {
    return {
        passed: true,
        severity: 'info',
        message: 'Platform security managed by iOS/Android sandboxing',
        recommendation: 'Ensure iOS App Transport Security (ATS) and Android Network Security Config are properly configured.',
    };
}
function checkDevelopmentMode() {
    const isDevelopment = process.env.NODE_ENV === 'development' || (typeof __DEV__ !== 'undefined' && __DEV__);
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
function checkStripeJSConfiguration() {
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
 * Check for JavaScript debugging protections
 * In React Native, debug mode can expose sensitive data
 */
function checkDebugMode() {
    const isDebugMode = typeof __DEV__ !== 'undefined' && __DEV__;
    if (isDebugMode) {
        return {
            passed: false,
            severity: 'warning',
            message: 'Debug mode is enabled',
            recommendation: 'Disable debug mode for production builds. Never ship with React Native debugging enabled.',
        };
    }
    return {
        passed: true,
        severity: 'info',
        message: 'Debug mode disabled for production',
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
function validateSecurity() {
    const checks = [
        checkSecureConnection(),
        checkPlatformSecurity(),
        checkDevelopmentMode(),
        checkStripeJSConfiguration(),
        checkDebugMode(),
    ];
    // Determine overall status
    const hasErrors = checks.some((check) => check.severity === 'error' && !check.passed);
    const hasWarnings = checks.some((check) => check.severity === 'warning' && !check.passed);
    let overallStatus;
    let summary;
    if (hasErrors) {
        overallStatus = 'vulnerable';
        summary = 'Security issues detected. Review errors and apply recommendations.';
    }
    else if (hasWarnings) {
        overallStatus = 'warnings';
        summary = 'Minor security warnings detected. Consider applying recommendations.';
    }
    else {
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
function logSecurityReport(report) {
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
 * Security recommendations for React Native production deployment
 */
exports.SECURITY_RECOMMENDATIONS = {
    SSL_PINNING: 'Configure SSL pinning at the native iOS/Android layer for API security',
    ATS: 'Enable iOS App Transport Security (ATS) to enforce HTTPS connections',
    ANDROID_NETWORK_CONFIG: 'Use Android Network Security Config to control cleartext traffic and certificate trust',
    DEBUG_MODE: 'Never ship production apps with debug mode enabled - __DEV__ should be false',
    PACKAGE_UPDATES: 'Keep @stripe/stripe-react-native and @cedros/pay-react-native updated for security patches',
    AUDIT: 'Run npm audit regularly to check for known vulnerabilities',
    MONITORING: 'Monitor Stripe security advisories and apply updates promptly',
    SECURE_STORAGE: 'Use platform-specific secure storage (Keychain/KeyStore) for sensitive payment data',
};
//# sourceMappingURL=securityValidation.js.map