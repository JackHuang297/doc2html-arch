import { ErrorHandler } from './error.handler';

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = new ErrorHandler();
  });

  describe('withRetry()', () => {
    it('should return result on first success', async () => {
      const result = await handler.withRetry(() => Promise.resolve('ok'));
      expect(result).toBe('ok');
    });

    it('should retry on failure and eventually succeed', async () => {
      let attempts = 0;
      const result = await handler.withRetry(
        () => {
          attempts++;
          if (attempts < 3) throw new Error('Transient error');
          return Promise.resolve('success');
        },
        { maxAttempts: 3, initialDelayMs: 10 }
      );
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after exhausting retries', async () => {
      await expect(
        handler.withRetry(
          () => Promise.reject(new Error('Always fails')),
          { maxAttempts: 2, initialDelayMs: 5 }
        )
      ).rejects.toThrow('Always fails');
    });
  });

  describe('withRetrySafe()', () => {
    it('should return success result on first try', async () => {
      const result = await handler.withRetrySafe(() => Promise.resolve('ok'));
      expect(result).toMatchObject({ success: true, result: 'ok' });
    });

    it('should return failure info after retries exhausted', async () => {
      const result = await handler.withRetrySafe(
        () => Promise.reject(new Error('Permanent error')),
        { maxAttempts: 2, initialDelayMs: 5 }
      );
      expect(result).toMatchObject({
        success: false,
        attempts: 2
      });
      if (!result.success) {
        expect(result.error.message).toBe('Permanent error');
        expect(result.attempts).toBe(2);
      }
    });
  });

  describe('isRecoverable()', () => {
    it('should return true for timeout errors', () => {
      const err = new Error('Connection timed out');
      expect(handler.isRecoverable(err)).toBe(true);
    });

    it('should return true for connection refused', () => {
      const err = new Error('ECONNREFUSED');
      expect(handler.isRecoverable(err)).toBe(true);
    });

    it('should return false for syntax errors', () => {
      const err = new Error('SyntaxError: Unexpected token');
      expect(handler.isRecoverable(err)).toBe(false);
    });

    it('should return false for ENOENT', () => {
      const err = new Error('ENOENT: no such file');
      expect(handler.isRecoverable(err)).toBe(false);
    });

    it('should return true for unknown errors by default', () => {
      const err = new Error('Some unknown error');
      expect(handler.isRecoverable(err)).toBe(true);
    });
  });

  describe('captureError()', () => {
    it('should capture message and stack', () => {
      const err = new Error('Test error');
      const info = handler.captureError(err, 2);

      expect(info.message).toBe('Test error');
      expect(info.stack).toBeDefined();
      expect(info.attempt).toBe(2);
      expect(info.recoverable).toBe(true);
      expect(info.timestamp).toBeGreaterThan(0);
    });

    it('should capture error code', () => {
      const err = new Error('Oops');
      (err as any).code = 'CUSTOM_CODE';
      const info = handler.captureError(err);
      expect(info.code).toBe('CUSTOM_CODE');
    });
  });

  describe('formatError()', () => {
    it('should include attempt and message', () => {
      const err = new Error('Failed');
      const info = handler.captureError(err, 3);
      const formatted = handler.formatError(info);

      expect(formatted).toContain('[Attempt 3]');
      expect(formatted).toContain('Failed');
    });
  });
});