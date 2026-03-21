"use strict";
/**
 * Structured logging with configurable log levels
 *
 * Supports filtering logs by severity level to control verbosity.
 * Production deployments should use LogLevel.ERROR or LogLevel.WARN.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
exports.getLogger = getLogger;
exports.setLogger = setLogger;
exports.createLogger = createLogger;
/**
 * Log severity levels (lowest to highest)
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["SILENT"] = 4] = "SILENT";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Structured logger with level-based filtering
 */
class Logger {
    constructor(config) {
        this.config = config;
    }
    /**
     * Update the log level dynamically
     */
    setLevel(level) {
        this.config.level = level;
    }
    /**
     * Get the current log level
     */
    getLevel() {
        return this.config.level;
    }
    /**
     * Debug-level logging (most verbose)
     * Use for detailed debugging information
     */
    debug(...args) {
        if (this.config.level <= LogLevel.DEBUG) {
            this.log('DEBUG', console.log, args);
        }
    }
    /**
     * Info-level logging
     * Use for general informational messages
     */
    info(...args) {
        if (this.config.level <= LogLevel.INFO) {
            this.log('INFO', console.info, args);
        }
    }
    /**
     * Warning-level logging
     * Use for potentially problematic situations
     */
    warn(...args) {
        if (this.config.level <= LogLevel.WARN) {
            this.log('WARN', console.warn, args);
        }
    }
    /**
     * Error-level logging
     * Use for error conditions
     */
    error(...args) {
        if (this.config.level <= LogLevel.ERROR) {
            this.log('ERROR', console.error, args);
        }
    }
    /**
     * Internal log method with formatting
     */
    log(level, consoleFn, args) {
        const prefix = this.config.prefix ? `${this.config.prefix} ` : '';
        const timestamp = new Date().toISOString();
        consoleFn(`[${timestamp}] ${prefix}[${level}]`, ...args);
    }
}
exports.Logger = Logger;
/**
 * Default logger instance
 * Uses environment-based log level if not configured
 */
const getDefaultLogLevel = () => {
    // In development, show all logs
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        return LogLevel.DEBUG;
    }
    // In production, only show warnings and errors
    return LogLevel.WARN;
};
let defaultLogger = null;
/**
 * Get or create the default logger instance
 */
function getLogger() {
    if (!defaultLogger) {
        defaultLogger = new Logger({
            level: getDefaultLogLevel(),
            prefix: '[CedrosPay]',
        });
    }
    return defaultLogger;
}
/**
 * Set the global logger instance
 * Called by CedrosProvider to apply user configuration
 */
function setLogger(logger) {
    defaultLogger = logger;
}
/**
 * Create a new logger instance with custom configuration
 */
function createLogger(config) {
    return new Logger(config);
}
//# sourceMappingURL=logger.js.map