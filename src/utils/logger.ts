import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export type LogLevelName = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevelName;
  name: string;
  message: string;
  args?: any[];
  error?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  jsonFormat: boolean;
  filePath?: string;
  maxFileSizeBytes?: number;
  maxFiles?: number;
}

const LEVEL_NAMES: LogLevelName[] = ['debug', 'info', 'warn', 'error'];

export class Logger {
  protected name: string;
  private level: LogLevel = LogLevel.INFO;
  private jsonFormat: boolean = false;
  private filePath?: string;
  private maxFileSizeBytes: number = 10 * 1024 * 1024; // 10MB
  private maxFiles: number = 5;
  private logs: LogEntry[] = [];
  private stream?: fs.WriteStream;

  constructor(name: string, config: Partial<LoggerConfig> = {}) {
    this.name = name;
    if (config.level !== undefined) this.level = config.level;
    if (config.jsonFormat !== undefined) this.jsonFormat = config.jsonFormat;
    if (config.filePath) this.filePath = config.filePath;
    if (config.maxFileSizeBytes) this.maxFileSizeBytes = config.maxFileSizeBytes;
    if (config.maxFiles) this.maxFiles = config.maxFiles;

    if (this.filePath) {
      this.initStream();
    }
  }

  private initStream(): void {
    if (!this.filePath) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.stream = fs.createWriteStream(this.filePath, { flags: 'a' });
    } catch (err) {
      console.warn(`[Logger] Failed to open log file ${this.filePath}:`, err);
    }
  }

  private rotateIfNeeded(): void {
    if (!this.filePath || !this.stream) return;
    try {
      const stats = fs.statSync(this.filePath);
      if (stats.size >= this.maxFileSizeBytes) {
        this.stream.end();
        const rotatedPath = `${this.filePath}.${Date.now()}`;
        fs.renameSync(this.filePath, rotatedPath);
        // Prune oldest rotated files beyond maxFiles
        const dir = path.dirname(this.filePath);
        const base = path.basename(this.filePath);
        const files = fs.readdirSync(dir)
          .filter(f => f.startsWith(base))
          .sort();
        while (files.length > this.maxFiles) {
          fs.unlinkSync(path.join(dir, files.shift()!));
          files.shift();
        }
        this.stream = fs.createWriteStream(this.filePath, { flags: 'a' });
      }
    } catch {
      // Ignore rotation errors silently
    }
  }

  private buildEntry(level: LogLevelName, message: string, args?: any[], error?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      name: this.name,
      message,
      args: args?.length ? args : undefined,
      error: error ? String(error) : undefined,
    };
  }

  private write(entry: LogEntry): void {
    const entryLevel = LEVEL_NAMES.indexOf(entry.level);
    if (entryLevel < this.level) return;

    const line = this.jsonFormat
      ? JSON.stringify(entry) + '\n'
      : `[${entry.timestamp}] [${entry.name}] ${entry.level.toUpperCase()}: ${entry.message}` +
        (entry.args ? ' ' + JSON.stringify(entry.args) : '') +
        (entry.error ? ' ' + entry.error : '') + '\n';

    if (this.stream) {
      this.rotateIfNeeded();
      this.stream.write(line);
    }

    if (entryLevel === LogLevel.ERROR) {
      console.error(this.jsonFormat ? JSON.stringify(entry) : line.trimEnd());
    } else if (entryLevel === LogLevel.WARN) {
      console.warn(this.jsonFormat ? JSON.stringify(entry) : line.trimEnd());
    } else if (entryLevel === LogLevel.INFO) {
      console.log(this.jsonFormat ? JSON.stringify(entry) : line.trimEnd());
    } else {
      console.debug(this.jsonFormat ? JSON.stringify(entry) : line.trimEnd());
    }
  }

  debug(message: string, ...args: any[]): void {
    const entry = this.buildEntry('debug', message, args);
    this.logs.push(entry);
    this.write(entry);
  }

  info(message: string, ...args: any[]): void {
    const entry = this.buildEntry('info', message, args);
    this.logs.push(entry);
    this.write(entry);
  }

  warn(message: string, ...args: any[]): void {
    const entry = this.buildEntry('warn', message, args);
    this.logs.push(entry);
    this.write(entry);
  }

  error(message: string, error?: any, ...args: any[]): void {
    const entry = this.buildEntry('error', message, args, error);
    this.logs.push(entry);
    this.write(entry);
  }

  getName(): string {
    return this.name;
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setJsonFormat(enabled: boolean): void {
    this.jsonFormat = enabled;
  }

  close(): void {
    if (this.stream) {
      this.stream.end();
      this.stream = undefined;
    }
  }
}