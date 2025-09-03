export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.prefix = options.prefix ?? '';
  }

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    if (level <= this.level) {
      const timestamp = new Date().toISOString();
      const prefixStr = this.prefix ? `[${this.prefix}]` : '';

      switch (level) {
        case LogLevel.ERROR:
          console.error(`${timestamp} ${prefixStr}[ERROR] ${message}`, ...args);
          break;
        case LogLevel.WARN:
          console.warn(`${timestamp} ${prefixStr}[WARN] ${message}`, ...args);
          break;
        case LogLevel.INFO:
          console.info(`${timestamp} ${prefixStr}[INFO] ${message}`, ...args);
          break;
        case LogLevel.DEBUG:
          console.debug(`${timestamp} ${prefixStr}[DEBUG] ${message}`, ...args);
          break;
      }
    }
  }

  error(message: string, ...args: unknown[]) {
    this.log(LogLevel.ERROR, message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.log(LogLevel.WARN, message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.log(LogLevel.INFO, message, ...args);
  }

  debug(message: string, ...args: unknown[]) {
    this.log(LogLevel.DEBUG, message, ...args);
  }
}

// Default logger instance
export const logger = new Logger({
  level: LogLevel.INFO,
  prefix: 'API',
});

// Service-specific loggers
export const serviceLogger = new Logger({
  level: LogLevel.INFO,
  prefix: 'Service',
});

export const authLogger = new Logger({
  level: LogLevel.INFO,
  prefix: 'Auth',
});
