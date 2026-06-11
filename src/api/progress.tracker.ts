import { EventEmitter, EventSubscription } from '../utils/event.emitter';

export type FileStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface FileProgress {
  fileId: string;
  fileName?: string;
  status: FileStatus;
  error?: string;
  attempts: number;
  startTime?: number;
  endTime?: number;
  html?: string;
}

export interface TaskProgress {
  taskId: string;
  total: number;
  completed: number;
  failed: number;
  currentFile?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  files: Map<string, FileProgress>;
}

export interface ProgressEvent {
  taskId: string;
  total: number;
  completed: number;
  failed: number;
  currentFile?: string;
  percentage: number;
}

export interface TaskCompleteEvent {
  taskId: string;
  total: number;
  completed: number;
  failed: number;
  durationMs: number;
  results: FileProgress[];
}

export class ProgressTracker {
  private tasks: Map<string, TaskProgress> = new Map();
  private events: EventEmitter<{
    'progress': ProgressEvent;
    'file-complete': { taskId: string; file: FileProgress };
    'file-failed': { taskId: string; file: FileProgress };
    'task-complete': TaskCompleteEvent;
    'task-failed': { taskId: string; error: string };
  }>;

  constructor() {
    this.events = new EventEmitter();
  }

  /**
   * Create a new batch task and return its taskId.
   */
  createTask(totalFiles: number, taskId?: string): string {
    const id = taskId || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const task: TaskProgress = {
      taskId: id,
      total: totalFiles,
      completed: 0,
      failed: 0,
      status: 'pending',
      startTime: Date.now(),
      files: new Map()
    };
    this.tasks.set(id, task);
    return id;
  }

  /**
   * Register a file in a task.
   */
  addFile(taskId: string, fileId: string, fileName?: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.files.set(fileId, {
      fileId,
      fileName,
      status: 'pending',
      attempts: 0
    });
  }

  /**
   * Mark a file as processing.
   */
  startFile(taskId: string, fileId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = 'processing';
    const file = task.files.get(fileId);
    if (file) {
      file.status = 'processing';
      file.startTime = Date.now();
    }
    this.emitProgress(task);
  }

  /**
   * Mark a file as completed (with optional result HTML).
   */
  completeFile(taskId: string, fileId: string, html?: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    const file = task.files.get(fileId);
    if (file) {
      file.status = 'completed';
      file.endTime = Date.now();
      file.html = html;
      task.completed++;
    }
    this.emitProgress(task);
    this.events.emit('file-complete', { taskId, file: file as FileProgress });
    this.checkTaskCompletion(task);
  }

  /**
   * Mark a file as failed (with error message).
   */
  failFile(taskId: string, fileId: string, error: string, attempts = 1): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    const file = task.files.get(fileId);
    if (file) {
      file.status = 'failed';
      file.endTime = Date.now();
      file.error = error;
      file.attempts = attempts;
      task.failed++;
    }
    this.emitProgress(task);
    this.events.emit('file-failed', { taskId, file: file as FileProgress });
    this.checkTaskCompletion(task);
  }

  /**
   * Update a file's attempt count (for retry tracking).
   */
  setFileAttempt(taskId: string, fileId: string, attempt: number): void {
    const task = this.tasks.get(taskId);
    const file = task?.files.get(fileId);
    if (file) file.attempts = attempt;
  }

  /**
   * Get current progress for a task.
   */
  getProgress(taskId: string): TaskProgress | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    return { ...task };
  }

  /**
   * Get summary progress (without full file map) for a task.
   */
  getSummary(taskId: string): ProgressEvent | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    return {
      taskId,
      total: task.total,
      completed: task.completed,
      failed: task.failed,
      currentFile: task.currentFile,
      percentage: task.total > 0 ? Math.round(((task.completed + task.failed) / task.total) * 100) : 0
    };
  }

  /**
   * Cancel a task.
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.status = 'cancelled';
    task.endTime = Date.now();
    return true;
  }

  /**
   * Remove completed/failed task from memory.
   */
  clearTask(taskId: string): void {
    this.tasks.delete(taskId);
  }

  /**
   * Subscribe to progress updates.
   */
  onProgress(callback: (event: ProgressEvent) => void): EventSubscription {
    return this.events.on('progress', callback);
  }

  /**
   * Subscribe to task completion.
   */
  onTaskComplete(callback: (event: TaskCompleteEvent) => void): EventSubscription {
    return this.events.on('task-complete', callback);
  }

  /**
   * Subscribe to file failure events.
   */
  onFileFailed(callback: (event: { taskId: string; file: FileProgress }) => void): EventSubscription {
    return this.events.on('file-failed', callback);
  }

  private emitProgress(task: TaskProgress): void {
    const summary = this.getSummary(task.taskId);
    if (summary) {
      this.events.emit('progress', summary);
    }
  }

  private checkTaskCompletion(task: TaskProgress): void {
    const done = task.completed + task.failed;
    if (done >= task.total) {
      task.status = task.failed > 0 && task.failed === task.total ? 'failed' : 'completed';
      task.endTime = Date.now();
      this.events.emit('task-complete', {
        taskId: task.taskId,
        total: task.total,
        completed: task.completed,
        failed: task.failed,
        durationMs: task.endTime - task.startTime,
        results: Array.from(task.files.values())
      });
    }
  }
}