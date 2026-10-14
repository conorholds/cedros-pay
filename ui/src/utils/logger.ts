/**
 * Structured logging with configurable log levels
 *
 * Supports filtering logs by severity level to control verbosity.
 * Production deployments should use LogLevel.ERROR or LogLevel.WARN.
 */

/**
 * Log severity levels (lowest to highest)
 */
export enum LogLevel {
  DEBUG = 0,   // Detailed debug information
  INFO = 1,    // Informational messages
  WARN = 2,    // Warning messages
  ERROR = 3,   // Error messages
  SILENT = 4,  // No logging
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  prefix?: string; // Optional prefix for all logs (e.g., '[CedrosPay]')
}

/**
 * Structured logger with level-based filtering
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  /**
   * Update the log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Debug-level logging (most verbose)
   * Use for detailed debugging information
   */
  debug(...args: unknown[]): void {
    if (this.config.level <= LogLevel.DEBUG) {
      this.log('DEBUG', console.log, args);
    }
  }

  /**
   * Info-level logging
   * Use for general informational messages
   */
  info(...args: unknown[]): void {
    if (this.config.level <= LogLevel.INFO) {
      this.log('INFO', console.info, args);
    }
  }

  /**
   * Warning-level logging
   * Use for potentially problematic situations
   */
  warn(...args: unknown[]): void {
    if (this.config.level <= LogLevel.WARN) {
      this.log('WARN', console.warn, args);
    }
  }

  /**
   * Error-level logging
   * Use for error conditions
   */
  error(...args: unknown[]): void {
    if (this.config.level <= LogLevel.ERROR) {
      this.log('ERROR', console.error, args);
    }
  }

  /**
   * Internal log method with formatting
   */
  private log(level: string, consoleFn: (...args: unknown[]) => void, args: unknown[]): void {
    const prefix = this.config.prefix ? `${this.config.prefix} ` : '';
    const timestamp = new Date().toISOString();
    consoleFn(`[${timestamp}] ${prefix}[${level}]`, ...args);
  }
}

/**
 * Default logger instance
 * Uses environment-based log level if not configured
 */
const getDefaultLogLevel = (): LogLevel => {
  // In development, show all logs
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return LogLevel.DEBUG;
  }

  // In production, only show warnings and errors
  return LogLevel.WARN;
};

let defaultLogger: Logger | null = null;

/**
 * Get or create the default logger instance
 */
export function getLogger(): Logger {
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
export function setLogger(logger: Logger): void {
  defaultLogger = logger;
}

/**
 * Create a new logger instance with custom configuration
 */
export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}
