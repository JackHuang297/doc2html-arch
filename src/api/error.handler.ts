import { Logger } from '../utils/logger';

export interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string;
  recoverable: boolean;
  timestamp: number;
  attempt: number;
}

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export class ErrorHandler {
  private logger: Logger;
  private defaultOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 30000
  };

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('ErrorHandler');
  }

  /**
   * Wrap an async operation with retry logic.
   * Returns the result or throws after exhausting retries.
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.error(`Attempt ${attempt}/${opts.maxAttempts} failed`, lastError);

        if (attempt < opts.maxAttempts) {
          const delay = Math.min(
            opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
            opts.maxDelayMs
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Wrap an operation with retry, returning a result that indicates success/failure.
   * Does NOT throw — captures all errors.
   */
  async withRetrySafe<T>(
    operation: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<{ success: true; result: T } | { success: false; error: ErrorInfo; attempts: number }> {
    const opts = { ...this.defaultOptions, ...options };
    const errors: ErrorInfo[] = [];

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return { success: true, result };
      } catch (error) {
        const errorInfo = this.captureError(error as Error, attempt);
        errors.push(errorInfo);

        if (attempt < opts.maxAttempts) {
          const delay = Math.min(
            opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
            opts.maxDelayMs
          );
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: errors[errors.length - 1],
      attempts: errors.length
    };
  }

  /**
   * Capture an error into a structured ErrorInfo object.
   */
  captureError(error: Error, attempt = 1): ErrorInfo {
    return {
      message: error.message || String(error),
      stack: error.stack,
      code: (error as any).code,
      recoverable: this.isRecoverable(error),
      timestamp: Date.now(),
      attempt
    };
  }

  /**
   * Determine if an error is recoverable (worth retrying).
   */
  isRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();
    const unrecoverable = [
      'syntaxerror',
      'parseerror',
      'invalid token',
      'not found',
      'enoent',
      'eexist'
    ];
    const recoverable = [
      'timeout',
      'econnrefused',
      'econnreset',
      'network',
      'socket',
      'temporary',
      'etimedout',
      'connection refused'
    ];

    for (const pattern of unrecoverable) {
      if (message.includes(pattern)) return false;
    }
    for (const pattern of recoverable) {
      if (message.includes(pattern)) return true;
    }
    return true; // default to recoverable
  }

  /**
   * Format errors for display (for API responses).
   */
  formatError(error: ErrorInfo): string {
    return `[Attempt ${error.attempt}] ${error.message}${error.stack ? `\n  at ${error.stack.split('\n').slice(1, 3).join('\n  at ')}` : ''}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}