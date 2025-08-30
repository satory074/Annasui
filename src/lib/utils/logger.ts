/**
 * Production-safe logging utility
 * Only logs in development environment or when explicitly enabled
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true';

  private shouldLog(level: LogLevel): boolean {
    if (level === 'error' || level === 'warn') {
      // Always log errors and warnings
      return true;
    }
    // Log info and debug only in development or when debug is enabled
    return this.isDevelopment || this.isDebugEnabled;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  // Utility methods for common logging patterns
  apiCall(endpoint: string, data?: unknown): void {
    this.debug(`API Call: ${endpoint}`, data);
  }

  userAction(action: string, data?: unknown): void {
    this.debug(`User Action: ${action}`, data);
  }

  performance(label: string, startTime?: number): void {
    if (startTime) {
      const duration = performance.now() - startTime;
      this.debug(`Performance: ${label} took ${duration.toFixed(2)}ms`);
    } else {
      this.debug(`Performance: ${label} started`);
    }
  }
}

export const logger = new Logger();