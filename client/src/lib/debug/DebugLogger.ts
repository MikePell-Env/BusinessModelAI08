/**
 * Centralized debug logging system for the BMC 3D application
 * Controls all console output with configurable levels
 */

export enum LogLevel {
  OFF = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  VERBOSE = 5
}

export class DebugLogger {
  private static instance: DebugLogger;
  private currentLevel: LogLevel;
  private enabledCategories: Set<string>;

  private constructor() {
    // Check environment for debug settings
    const isDevelopment = import.meta.env.MODE === 'development';
    this.currentLevel = isDevelopment ? LogLevel.WARN : LogLevel.OFF;
    this.enabledCategories = new Set(['error', 'critical']);
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  enableCategory(category: string): void {
    this.enabledCategories.add(category);
  }

  disableCategory(category: string): void {
    this.enabledCategories.delete(category);
  }

  log(category: string, message: string, ...args: any[]): void {
    if (this.currentLevel >= LogLevel.DEBUG && this.enabledCategories.has(category)) {
      console.log(`[${category}] ${message}`, ...args);
    }
  }

  info(category: string, message: string, ...args: any[]): void {
    if (this.currentLevel >= LogLevel.INFO) {
      console.info(`[${category}] ${message}`, ...args);
    }
  }

  warn(category: string, message: string, ...args: any[]): void {
    if (this.currentLevel >= LogLevel.WARN) {
      console.warn(`[${category}] ${message}`, ...args);
    }
  }

  error(category: string, message: string, ...args: any[]): void {
    if (this.currentLevel >= LogLevel.ERROR) {
      console.error(`[${category}] ${message}`, ...args);
    }
  }

  verbose(category: string, message: string, ...args: any[]): void {
    if (this.currentLevel >= LogLevel.VERBOSE) {
      console.log(`[${category}:verbose] ${message}`, ...args);
    }
  }

  // Special method for critical user-facing logs that should always show
  critical(message: string, ...args: any[]): void {
    console.log(`🎯 ${message}`, ...args);
  }
}

// Export singleton instance
export const debugLog = DebugLogger.getInstance();