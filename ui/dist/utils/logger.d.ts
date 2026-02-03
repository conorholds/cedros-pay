/**
 * Structured logging with configurable log levels
 *
 * Supports filtering logs by severity level to control verbosity.
 * Production deployments should use LogLevel.ERROR or LogLevel.WARN.
 */
/**
 * Log severity levels (lowest to highest)
 */
export declare enum LogLevel {
    DEBUG = 0,// Detailed debug information
    INFO = 1,// Informational messages
    WARN = 2,// Warning messages
    ERROR = 3,// Error messages
    SILENT = 4
}
/**
 * Logger configuration
 */
export interface LoggerConfig {
    level: LogLevel;
    prefix?: string;
}
/**
 * Structured logger with level-based filtering
 */
export declare class Logger {
    private config;
    constructor(config: LoggerConfig);
    /**
     * Update the log level dynamically
     */
    setLevel(level: LogLevel): void;
    /**
     * Get the current log level
     */
    getLevel(): LogLevel;
    /**
     * Debug-level logging (most verbose)
     * Use for detailed debugging information
     */
    debug(...args: unknown[]): void;
    /**
     * Info-level logging
     * Use for general informational messages
     */
    info(...args: unknown[]): void;
    /**
     * Warning-level logging
     * Use for potentially problematic situations
     */
    warn(...args: unknown[]): void;
    /**
     * Error-level logging
     * Use for error conditions
     */
    error(...args: unknown[]): void;
    /**
     * Internal log method with formatting
     */
    private log;
}
/**
 * Get or create the default logger instance
 */
export declare function getLogger(): Logger;
/**
 * Set the global logger instance
 * Called by CedrosProvider to apply user configuration
 */
export declare function setLogger(logger: Logger): void;
/**
 * Create a new logger instance with custom configuration
 */
export declare function createLogger(config: LoggerConfig): Logger;
//# sourceMappingURL=logger.d.ts.map