import { EventEmitter } from './event.emitter';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('on() / off()', () => {
    it('should call listener on emit', () => {
      const fn = jest.fn();
      emitter.on('test', fn);
      emitter.emit('test', 'data');

      expect(fn).toHaveBeenCalledWith('data');
    });

    it('should call multiple listeners', () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      emitter.on('test', fn1);
      emitter.on('test', fn2);
      emitter.emit('test', 'data');

      expect(fn1).toHaveBeenCalledWith('data');
      expect(fn2).toHaveBeenCalledWith('data');
    });

    it('should unsubscribe via returned function', () => {
      const fn = jest.fn();
      const sub = emitter.on('test', fn);
      sub.unsubscribe();
      emitter.emit('test', 'data');

      expect(fn).not.toHaveBeenCalled();
    });

    it('should unsubscribe via off()', () => {
      const fn = jest.fn();
      emitter.on('test', fn);
      emitter.off('test', fn);
      emitter.emit('test', 'data');

      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('once()', () => {
    it('should only fire once', () => {
      const fn = jest.fn();
      emitter.once('test', fn);
      emitter.emit('test', 'a');
      emitter.emit('test', 'b');

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('a');
    });

    it('should return unsubscribe function', () => {
      const fn = jest.fn();
      const sub = emitter.once('test', fn);
      sub.unsubscribe();
      emitter.emit('test', 'data');

      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount()', () => {
    it('should return correct count', () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();

      expect(emitter.listenerCount('test')).toBe(0);
      emitter.on('test', fn1);
      expect(emitter.listenerCount('test')).toBe(1);
      emitter.on('test', fn2);
      expect(emitter.listenerCount('test')).toBe(2);
    });
  });

  describe('removeAllListeners()', () => {
    it('should remove all listeners for specific event', () => {
      const fn = jest.fn();
      emitter.on('test', fn);
      emitter.removeAllListeners('test');
      emitter.emit('test', 'data');

      expect(fn).not.toHaveBeenCalled();
    });

    it('should remove all listeners for all events', () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      emitter.on('a', fn1);
      emitter.on('b', fn2);
      emitter.removeAllListeners();
      emitter.emit('a', {});
      emitter.emit('b', {});

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should not propagate errors to other listeners', () => {
      const badFn = jest.fn().mockImplementation(() => { throw new Error('oops'); });
      const goodFn = jest.fn();

      emitter.on('test', badFn);
      emitter.on('test', goodFn);
      emitter.emit('test', 'data');

      expect(goodFn).toHaveBeenCalled(); // goodFn still called despite badFn throwing
    });
  });
});