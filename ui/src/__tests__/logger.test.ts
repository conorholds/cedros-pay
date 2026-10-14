import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LogLevel, createLogger, getLogger, setLogger } from '../utils/logger';

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.info.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('LogLevel enum', () => {
    it('should have correct numeric values', () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
      expect(LogLevel.SILENT).toBe(4);
    });
  });

  describe('Logger class', () => {
    it('should create logger with specified level', () => {
      const logger = new Logger({ level: LogLevel.INFO });
      expect(logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should allow updating log level', () => {
      const logger = new Logger({ level: LogLevel.DEBUG });
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);

      logger.setLevel(LogLevel.ERROR);
      expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });

    describe('DEBUG level', () => {
      it('should log all levels when set to DEBUG', () => {
        const logger = new Logger({ level: LogLevel.DEBUG });

        logger.debug('debug message');
        logger.info('info message');
        logger.warn('warn message');
        logger.error('error message');

        expect(consoleSpy.log).toHaveBeenCalled();
        expect(consoleSpy.info).toHaveBeenCalled();
        expect(consoleSpy.warn).toHaveBeenCalled();
        expect(consoleSpy.error).toHaveBeenCalled();
      });
    });

    describe('INFO level', () => {
      it('should not log debug when set to INFO', () => {
        const logger = new Logger({ level: LogLevel.INFO });

        logger.debug('debug message');
        logger.info('info message');
        logger.warn('warn message');
        logger.error('error message');

        expect(consoleSpy.log).not.toHaveBeenCalled();
        expect(consoleSpy.info).toHaveBeenCalled();
        expect(consoleSpy.warn).toHaveBeenCalled();
        expect(consoleSpy.error).toHaveBeenCalled();
      });
    });

    describe('WARN level', () => {
      it('should only log warn and error when set to WARN', () => {
        const logger = new Logger({ level: LogLevel.WARN });

        logger.debug('debug message');
        logger.info('info message');
        logger.warn('warn message');
        logger.error('error message');

        expect(consoleSpy.log).not.toHaveBeenCalled();
        expect(consoleSpy.info).not.toHaveBeenCalled();
        expect(consoleSpy.warn).toHaveBeenCalled();
        expect(consoleSpy.error).toHaveBeenCalled();
      });
    });

    describe('ERROR level', () => {
      it('should only log error when set to ERROR', () => {
        const logger = new Logger({ level: LogLevel.ERROR });

        logger.debug('debug message');
        logger.info('info message');
        logger.warn('warn message');
        logger.error('error message');

        expect(consoleSpy.log).not.toHaveBeenCalled();
        expect(consoleSpy.info).not.toHaveBeenCalled();
        expect(consoleSpy.warn).not.toHaveBeenCalled();
        expect(consoleSpy.error).toHaveBeenCalled();
      });
    });

    describe('SILENT level', () => {
      it('should not log anything when set to SILENT', () => {
        const logger = new Logger({ level: LogLevel.SILENT });

        logger.debug('debug message');
        logger.info('info message');
        logger.warn('warn message');
        logger.error('error message');

        expect(consoleSpy.log).not.toHaveBeenCalled();
        expect(consoleSpy.info).not.toHaveBeenCalled();
        expect(consoleSpy.warn).not.toHaveBeenCalled();
        expect(consoleSpy.error).not.toHaveBeenCalled();
      });
    });

    describe('Log formatting', () => {
      it('should include timestamp in log output', () => {
        const logger = new Logger({ level: LogLevel.DEBUG });

        logger.debug('test message');

        const logCall = consoleSpy.log.mock.calls[0];
        const firstArg = logCall[0] as string;
        expect(firstArg).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
      });

      it('should include log level in output', () => {
        const logger = new Logger({ level: LogLevel.DEBUG });

        logger.debug('test message');
        logger.info('test message');
        logger.warn('test message');
        logger.error('test message');

        expect(consoleSpy.log.mock.calls[0][0]).toContain('[DEBUG]');
        expect(consoleSpy.info.mock.calls[0][0]).toContain('[INFO]');
        expect(consoleSpy.warn.mock.calls[0][0]).toContain('[WARN]');
        expect(consoleSpy.error.mock.calls[0][0]).toContain('[ERROR]');
      });

      it('should include prefix when configured', () => {
        const logger = new Logger({
          level: LogLevel.DEBUG,
          prefix: '[CedrosPay]',
        });

        logger.debug('test message');

        const logCall = consoleSpy.log.mock.calls[0];
        const firstArg = logCall[0] as string;
        expect(firstArg).toContain('[CedrosPay]');
      });

      it('should not include prefix when not configured', () => {
        const logger = new Logger({ level: LogLevel.DEBUG });

        logger.debug('test message');

        const logCall = consoleSpy.log.mock.calls[0];
        const firstArg = logCall[0] as string;
        expect(firstArg).not.toContain('[CedrosPay]');
      });

      it('should pass through additional arguments', () => {
        const logger = new Logger({ level: LogLevel.DEBUG });
        const obj = { foo: 'bar' };
        const arr = [1, 2, 3];

        logger.debug('message', obj, arr);

        const logCall = consoleSpy.log.mock.calls[0];
        expect(logCall[1]).toBe('message');
        expect(logCall[2]).toBe(obj);
        expect(logCall[3]).toBe(arr);
      });
    });
  });

  describe('createLogger', () => {
    it('should create a new logger instance', () => {
      const logger = createLogger({ level: LogLevel.ERROR });

      expect(logger).toBeInstanceOf(Logger);
      expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });

    it('should create independent logger instances', () => {
      const logger1 = createLogger({ level: LogLevel.DEBUG });
      const logger2 = createLogger({ level: LogLevel.ERROR });

      expect(logger1.getLevel()).toBe(LogLevel.DEBUG);
      expect(logger2.getLevel()).toBe(LogLevel.ERROR);

      logger1.setLevel(LogLevel.INFO);
      expect(logger1.getLevel()).toBe(LogLevel.INFO);
      expect(logger2.getLevel()).toBe(LogLevel.ERROR);
    });
  });

  describe('getLogger and setLogger', () => {
    it('should return default logger instance', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();

      expect(logger1).toBe(logger2); // Same instance
    });

    it('should allow setting global logger', () => {
      const customLogger = createLogger({ level: LogLevel.SILENT });

      setLogger(customLogger);

      const logger = getLogger();
      expect(logger).toBe(customLogger);
      expect(logger.getLevel()).toBe(LogLevel.SILENT);
    });

    it('should use updated global logger', () => {
      const logger1 = getLogger();
      logger1.setLevel(LogLevel.ERROR);

      const logger2 = getLogger();
      expect(logger2.getLevel()).toBe(LogLevel.ERROR);
    });
  });
});
