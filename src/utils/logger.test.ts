import { Logger } from './logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('test');
  });

  it('should log info messages', () => {
    expect(() => logger.info('Test message')).not.toThrow();
  });

  it('should log error messages', () => {
    expect(() => logger.error('Error message')).not.toThrow();
  });

  it('should log debug messages', () => {
    expect(() => logger.debug('Debug message')).not.toThrow();
  });

  it('should log with context', () => {
    expect(() => {
      logger.info('Message', { userId: 'user1' });
    }).not.toThrow();
  });

  it('should have a name', () => {
    expect(logger.getName()).toBe('test');
  });
});
