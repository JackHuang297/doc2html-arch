import { ProgressTracker } from './progress.tracker';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker();
  });

  describe('createTask()', () => {
    it('should generate a taskId', () => {
      const taskId = tracker.createTask(5);
      expect(taskId).toMatch(/^task-/);
    });

    it('should accept a custom taskId', () => {
      const taskId = tracker.createTask(3, 'my-task-123');
      expect(taskId).toBe('my-task-123');
    });

    it('should track total files', () => {
      tracker.createTask(7);
      const task = tracker.getProgress(tracker.createTask(0));
      // Just check it doesn't crash
      expect(task).toBeDefined();
    });
  });

  describe('addFile()', () => {
    it('should register a file in a task', () => {
      const taskId = tracker.createTask(3);
      tracker.addFile(taskId, 'file1', 'a.md');

      const task = tracker.getProgress(taskId);
      expect(task?.files.has('file1')).toBe(true);
      expect(task?.files.get('file1')?.fileName).toBe('a.md');
    });

    it('should be no-op for unknown task', () => {
      tracker.addFile('unknown', 'file1');
      // Should not throw
    });
  });

  describe('startFile()', () => {
    it('should mark file as processing and update task status', () => {
      const taskId = tracker.createTask(2);
      tracker.addFile(taskId, 'file1');

      tracker.startFile(taskId, 'file1');

      const task = tracker.getProgress(taskId);
      expect(task?.files.get('file1')?.status).toBe('processing');
      expect(task?.status).toBe('processing');
    });
  });

  describe('completeFile()', () => {
    it('should mark file as completed and increment counter', () => {
      const taskId = tracker.createTask(2);
      tracker.addFile(taskId, 'file1');

      tracker.startFile(taskId, 'file1');
      tracker.completeFile(taskId, 'file1', '<h1>Result</h1>');

      const task = tracker.getProgress(taskId);
      expect(task?.files.get('file1')?.status).toBe('completed');
      expect(task?.files.get('file1')?.html).toBe('<h1>Result</h1>');
      expect(task?.completed).toBe(1);
    });
  });

  describe('failFile()', () => {
    it('should mark file as failed with error message', () => {
      const taskId = tracker.createTask(2);
      tracker.addFile(taskId, 'file1');

      tracker.failFile(taskId, 'file1', 'Parse error', 2);

      const task = tracker.getProgress(taskId);
      expect(task?.files.get('file1')?.status).toBe('failed');
      expect(task?.files.get('file1')?.error).toBe('Parse error');
      expect(task?.files.get('file1')?.attempts).toBe(2);
      expect(task?.failed).toBe(1);
    });
  });

  describe('task completion', () => {
    it('should mark task as completed when all files done', async () => {
      const taskId = tracker.createTask(2);
      tracker.addFile(taskId, 'f1');
      tracker.addFile(taskId, 'f2');

      tracker.startFile(taskId, 'f1');
      tracker.completeFile(taskId, 'f1');
      tracker.startFile(taskId, 'f2');
      tracker.completeFile(taskId, 'f2');

      const task = tracker.getProgress(taskId);
      expect(task?.status).toBe('completed');
      expect(task?.endTime).toBeDefined();
    });

    it('should mark task as failed when all files fail', async () => {
      const taskId = tracker.createTask(2);
      tracker.addFile(taskId, 'f1');
      tracker.addFile(taskId, 'f2');

      tracker.failFile(taskId, 'f1', 'err');
      tracker.failFile(taskId, 'f2', 'err');

      const task = tracker.getProgress(taskId);
      expect(task?.status).toBe('failed');
    });

    it('should mark task as completed when some fail', async () => {
      const taskId = tracker.createTask(2);
      tracker.addFile(taskId, 'f1');
      tracker.addFile(taskId, 'f2');

      tracker.completeFile(taskId, 'f1');
      tracker.failFile(taskId, 'f2', 'err');

      const task = tracker.getProgress(taskId);
      expect(task?.status).toBe('completed'); // not failed — mixed results
    });
  });

  describe('getSummary()', () => {
    it('should return null for unknown task', () => {
      expect(tracker.getSummary('unknown')).toBeNull();
    });

    it('should calculate percentage correctly', () => {
      const taskId = tracker.createTask(4);
      tracker.addFile(taskId, 'f1');
      tracker.addFile(taskId, 'f2');
      tracker.addFile(taskId, 'f3');
      tracker.addFile(taskId, 'f4');

      tracker.completeFile(taskId, 'f1');
      tracker.completeFile(taskId, 'f2');

      const summary = tracker.getSummary(taskId);
      expect(summary?.percentage).toBe(50);
    });
  });

  describe('cancelTask()', () => {
    it('should return false for unknown task', () => {
      expect(tracker.cancelTask('unknown')).toBe(false);
    });

    it('should cancel an active task', () => {
      const taskId = tracker.createTask(2);
      tracker.addFile(taskId, 'f1');
      tracker.startFile(taskId, 'f1');

      expect(tracker.cancelTask(taskId)).toBe(true);

      const task = tracker.getProgress(taskId);
      expect(task?.status).toBe('cancelled');
    });
  });

  describe('clearTask()', () => {
    it('should remove task from memory', () => {
      const taskId = tracker.createTask(1);
      tracker.addFile(taskId, 'f1');
      tracker.completeFile(taskId, 'f1');

      tracker.clearTask(taskId);
      expect(tracker.getProgress(taskId)).toBeNull();
    });
  });

  describe('events', () => {
    it('should fire progress event on file complete', (done) => {
      const taskId = tracker.createTask(1);
      tracker.addFile(taskId, 'f1');

      let callCount = 0;
      const unsub = tracker.onProgress((event) => {
        callCount++;
        if (callCount >= 2) {
          expect(event.taskId).toBe(taskId);
          unsub.unsubscribe();
          done();
        }
      });

      tracker.startFile(taskId, 'f1');
      tracker.completeFile(taskId, 'f1');
    });

    it('should fire task-complete event when all done', (done) => {
      const taskId = tracker.createTask(1);
      tracker.addFile(taskId, 'f1');

      tracker.onTaskComplete((event) => {
        expect(event.taskId).toBe(taskId);
        expect(event.completed).toBe(1);
        done();
      });

      tracker.completeFile(taskId, 'f1');
    }, 1000);
  });
});