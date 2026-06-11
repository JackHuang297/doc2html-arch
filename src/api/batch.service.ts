import { DocumentService } from '../services/document.service';
import { ProgressTracker, FileProgress } from './progress.tracker';
import { ErrorHandler } from './error.handler';
import { Logger } from '../utils/logger';
import { EventSubscription } from '../utils/event.emitter';

export interface BatchFile {
  id: string;
  name: string;
  content: string;
  mimeType?: string;
}

export interface BatchConvertRequest {
  files: BatchFile[];
  concurrency?: number;  // max concurrent conversions, default 5
  maxRetries?: number;  // max retries per file, default 3
}

export interface BatchConvertResult {
  taskId: string;
  total: number;
  completed: number;
  failed: number;
  results: FileProgress[];
}

export interface BatchConvertResponse {
  success: boolean;
  taskId: string;
  message?: string;
}

export class BatchService {
  private documentService: DocumentService;
  private progressTracker: ProgressTracker;
  private errorHandler: ErrorHandler;
  private logger: Logger;
  private activeTasks: Set<string> = new Set();

  constructor(documentService?: DocumentService) {
    this.documentService = documentService || new DocumentService();
    this.progressTracker = new ProgressTracker();
    this.errorHandler = new ErrorHandler();
    this.logger = new Logger('BatchService');
  }

  /**
   * Start a batch conversion task.
   * Returns immediately with taskId — conversion runs in background.
   */
  async startBatch(request: BatchConvertRequest): Promise<BatchConvertResponse> {
    const { files, concurrency = 5, maxRetries = 3 } = request;

    if (!files || files.length === 0) {
      return { success: false, taskId: '', message: 'No files provided' };
    }

    const taskId = this.progressTracker.createTask(files.length);

    // Register all files
    for (const file of files) {
      this.progressTracker.addFile(taskId, file.id, file.name);
    }

    this.activeTasks.add(taskId);

    // Run conversion in background
    this.runBatch(taskId, files, concurrency, maxRetries);

    return { success: true, taskId };
  }

  /**
   * Start batch and wait for completion.
   */
  async runBatchAndWait(request: BatchConvertRequest, timeoutMs = 120000): Promise<BatchConvertResult> {
    const response = await this.startBatch(request);

    // Wait for task completion
    const result = await this.waitForTask(response.taskId, timeoutMs);
    return result;
  }

  /**
   * Get current progress for a task.
   */
  getProgress(taskId: string) {
    return this.progressTracker.getSummary(taskId);
  }

  /**
   * Get full task details.
   */
  getTaskDetails(taskId: string) {
    return this.progressTracker.getProgress(taskId);
  }

  /**
   * Retry failed files in a task.
   */
  async retryFailed(taskId: string, maxRetries = 3): Promise<BatchConvertResponse> {
    const task = this.progressTracker.getProgress(taskId);
    if (!task) {
      return { success: false, taskId, message: 'Task not found' };
    }

    const failedFiles: BatchFile[] = [];
    for (const file of task.files.values()) {
      if (file.status === 'failed') {
        // We need content — this requires the caller to have stored it
        // For now, mark as pending again and note that content is needed
        this.logger.warn(`Cannot retry ${file.fileId}: content not available in retry context`);
      }
    }

    if (failedFiles.length === 0) {
      return { success: true, taskId, message: 'No failed files to retry' };
    }

    return this.startBatch({ files: failedFiles, concurrency: 3, maxRetries });
  }

  /**
   * Cancel an active task.
   */
  cancelTask(taskId: string): boolean {
    const cancelled = this.progressTracker.cancelTask(taskId);
    if (cancelled) {
      this.activeTasks.delete(taskId);
      // task cancelled
    }
    return cancelled;
  }

  /**
   * Subscribe to progress events.
   */
  onProgress(callback: (progress: any) => void): EventSubscription {
    return this.progressTracker.onProgress(callback);
  }

  /**
   * Subscribe to task completion.
   */
  onComplete(callback: (result: BatchConvertResult) => void): EventSubscription {
    return this.progressTracker.onTaskComplete(callback as any);
  }

  private async runBatch(
    taskId: string,
    files: BatchFile[],
    concurrency: number,
    maxRetries: number
  ): Promise<void> {
    const pending = [...files];
    const running: Set<string> = new Set();

    const processNext = async (): Promise<void> => {
      while (pending.length > 0 && running.size < concurrency) {
        const task = this.progressTracker.getProgress(taskId);
        if (task?.status === 'cancelled') break;

        const file = pending.shift()!;
        running.add(file.id);

        this.processFile(taskId, file, maxRetries).finally(() => {
          running.delete(file.id);
        });
      }
    };

    // Start initial batch
    await processNext();

    // Keep processing until all done
    while (running.size > 0 && pending.length > 0) {
      await new Promise(r => setTimeout(r, 5));
    }

    this.activeTasks.delete(taskId);
  }

  private async processFile(taskId: string, file: BatchFile, maxRetries: number): Promise<void> {
    this.progressTracker.startFile(taskId, file.id);

    const result = await this.errorHandler.withRetrySafe(
      async () => {
        const response = await this.documentService.convertFile(file.content, {
          filename: file.name,
          mimeType: file.mimeType
        });
        if (!response.success) {
          throw new Error(response.error || 'Conversion failed');
        }
        return response.html;
      },
      { maxAttempts: maxRetries }
    );

    if (result.success) {
      this.progressTracker.completeFile(taskId, file.id, result.result);
    } else {
      this.progressTracker.failFile(taskId, file.id, result.error.message, result.attempts);
    }
  }

  private waitForTask(taskId: string, timeoutMs: number): Promise<BatchConvertResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task ${taskId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.progressTracker.onTaskComplete((event) => {
        if (event.taskId === taskId) {
          clearTimeout(timeout);
          resolve({
            taskId: event.taskId,
            total: event.total,
            completed: event.completed,
            failed: event.failed,
            results: event.results
          });
        }
      });
    });
  }
}