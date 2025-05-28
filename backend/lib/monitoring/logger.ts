import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  type LogLevel,
  LogLevelSchema,
  type ServiceName,
  ServiceNameSchema,
  type StructuredLog,
  StructuredLogSchema,
} from "./types";

// Logger configuration schema
const LoggerConfigSchema = z.object({
  level: LogLevelSchema.default("info"),
  enableConsole: z.boolean().default(true),
  enableFile: z.boolean().default(false),
  filePath: z.string().optional(),
  includeTimestamp: z.boolean().default(true),
  includeTraceId: z.boolean().default(true),
  maxFieldLength: z.number().int().min(100).default(1000),
});

export type LoggerConfig = z.infer<typeof LoggerConfigSchema>;

// Log context for correlation
export interface LogContext {
  traceId?: string;
  spanId?: string;
  requestId?: string;
  userId?: string;
  conversationId?: string;
  [key: string]: any;
}

// Timer for performance tracking
export interface Timer {
  operation: string;
  startTime: number;
  end: (metadata?: Record<string, any>) => void;
}

// Span for distributed tracing
export interface Span {
  spanId: string;
  operation: string;
  startTime: number;
  events: Array<{ timestamp: number; message: string; metadata?: Record<string, any> }>;
  status?: "success" | "error" | "timeout";
  addEvent: (message: string, metadata?: Record<string, any>) => void;
  setStatus: (status: "success" | "error" | "timeout") => void;
  end: () => void;
}

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

export class Logger {
  private service: ServiceName;
  private config: LoggerConfig;
  private context: LogContext = {};
  private activeSpans: Map<string, Span> = new Map();
  private activeRequests: Map<string, { startTime: number; metadata: Record<string, any> }> =
    new Map();

  constructor(service: ServiceName, config: Partial<LoggerConfig> = {}) {
    // Validate service name
    ServiceNameSchema.parse(service);

    this.service = service;
    this.config = LoggerConfigSchema.parse(config);
  }

  /**
   * Get the service name
   */
  getService(): ServiceName {
    return this.service;
  }

  /**
   * Set logging context for correlation
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear logging context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Create a child logger with additional context
   */
  child(service: ServiceName, additionalContext: Record<string, any> = {}): Logger {
    const childLogger = new Logger(service, this.config);
    childLogger.setContext({ ...this.context });
    // Store additional context that will be included in metadata
    (childLogger as any).additionalMetadata = additionalContext;
    return childLogger;
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log("debug", message, metadata);
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log("info", message, metadata);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log("warn", message, metadata);
  }

  /**
   * Log error message
   */
  error(message: string, metadata?: Record<string, any>, error?: Error): void {
    const errorInfo = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error.cause && { cause: String(error.cause) }),
        }
      : undefined;

    this.log("error", message, metadata, errorInfo);
  }

  /**
   * Log fatal message
   */
  fatal(message: string, metadata?: Record<string, any>, error?: Error): void {
    const errorInfo = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error.cause && { cause: String(error.cause) }),
        }
      : undefined;

    this.log("fatal", message, metadata, errorInfo);
  }

  /**
   * Start a performance timer
   */
  startTimer(operation: string): Timer {
    const startTime = Date.now();

    return {
      operation,
      startTime,
      end: (metadata?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        this.info(`Operation completed: ${operation}`, {
          operation,
          duration,
          ...metadata,
        });
      },
    };
  }

  /**
   * Start a distributed tracing span
   */
  startSpan(operation: string, metadata?: Record<string, any>): Span {
    const spanId = uuidv4();
    const startTime = Date.now();

    const span: Span = {
      spanId,
      operation,
      startTime,
      events: [],
      addEvent: (message: string, eventMetadata?: Record<string, any>) => {
        span.events.push({
          timestamp: Date.now(),
          message,
          metadata: eventMetadata,
        });
      },
      setStatus: (status: "success" | "error" | "timeout") => {
        span.status = status;
      },
      end: () => {
        const duration = Date.now() - startTime;
        this.info(`Span completed: ${operation}`, {
          spanId,
          operation,
          duration,
          status: span.status || "success",
          events: span.events,
          ...metadata,
        });
        this.activeSpans.delete(spanId);
      },
    };

    this.activeSpans.set(spanId, span);

    // Log span start
    this.debug(`Span started: ${operation}`, {
      spanId,
      operation,
      ...metadata,
    });

    return span;
  }

  /**
   * Start request tracking
   */
  startRequest(requestId: string, endpoint: string, metadata?: Record<string, any>): void {
    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      metadata: { endpoint, ...metadata },
    });

    this.info(`Request started: ${endpoint}`, {
      requestId,
      endpoint,
      ...metadata,
    });
  }

  /**
   * End request tracking
   */
  endRequest(requestId: string, result: Record<string, any>): void {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      this.warn(`Request not found for completion: ${requestId}`);
      return;
    }

    const duration = Date.now() - request.startTime;
    this.info(`Request completed`, {
      requestId,
      duration,
      ...request.metadata,
      ...result,
    });

    this.activeRequests.delete(requestId);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Record<string, any>
  ): void {
    // Check if we should log at this level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return;
    }

    // Build structured log entry
    const logEntry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message: this.truncateString(message, this.config.maxFieldLength),
      ...(this.context.traceId && { traceId: this.context.traceId }),
      ...(this.context.spanId && { spanId: this.context.spanId }),
      ...(this.context.requestId && { requestId: this.context.requestId }),
      ...(this.context.userId && { userId: this.context.userId }),
      ...((metadata || (this as any).additionalMetadata) && {
        metadata: this.sanitizeMetadata({
          ...(metadata || {}),
          ...((this as any).additionalMetadata || {}),
        }),
      }),
      ...(error && { error }),
    };

    // Validate the log entry
    try {
      StructuredLogSchema.parse(logEntry);
    } catch (validationError) {
      console.error("Invalid log entry:", validationError);
      return;
    }

    // Output the log
    if (this.config.enableConsole) {
      this.outputToConsole(level, logEntry);
    }

    if (this.config.enableFile && this.config.filePath) {
      this.outputToFile(logEntry);
    }
  }

  /**
   * Output log to console
   */
  private outputToConsole(level: LogLevel, logEntry: StructuredLog): void {
    const serialized = JSON.stringify(logEntry);

    switch (level) {
      case "debug":
        console.log(serialized);
        break;
      case "info":
        console.info(serialized);
        break;
      case "warn":
        console.warn(serialized);
        break;
      case "error":
      case "fatal":
        console.error(serialized);
        break;
    }
  }

  /**
   * Output log to file (placeholder - would need file system integration)
   */
  private outputToFile(logEntry: StructuredLog): void {
    // In a real implementation, this would write to a file
    // For now, we'll just acknowledge it would happen
    // fs.appendFileSync(this.config.filePath!, JSON.stringify(logEntry) + '\n');
  }

  /**
   * Sanitize metadata to ensure it's JSON serializable
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      try {
        // Ensure key is valid
        const cleanKey = this.sanitizeKey(key);

        // Handle different value types
        if (value === null || value === undefined) {
          sanitized[cleanKey] = value;
        } else if (typeof value === "string") {
          sanitized[cleanKey] = this.truncateString(value, this.config.maxFieldLength);
        } else if (typeof value === "number" || typeof value === "boolean") {
          sanitized[cleanKey] = value;
        } else if (value instanceof Date) {
          sanitized[cleanKey] = value.toISOString();
        } else if (Array.isArray(value)) {
          sanitized[cleanKey] = value.slice(0, 10); // Limit array size
        } else if (typeof value === "object") {
          // For objects, try to serialize and truncate if needed
          try {
            const serialized = JSON.stringify(value);
            sanitized[cleanKey] =
              serialized.length > this.config.maxFieldLength
                ? JSON.parse(serialized.substring(0, this.config.maxFieldLength))
                : value;
          } catch {
            sanitized[cleanKey] = "[Object - not serializable]";
          }
        } else {
          sanitized[cleanKey] = String(value);
        }
      } catch {
        // Skip fields that can't be sanitized
        continue;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize metadata keys
   */
  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 100);
  }

  /**
   * Truncate strings to prevent log bloat
   */
  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return `${str.substring(0, maxLength - 3)}...`;
  }
}

// Global logger factory
export function createLogger(service: ServiceName, config?: Partial<LoggerConfig>): Logger {
  return new Logger(service, config);
}

// Default loggers for each service
export const loggers = {
  chat: createLogger("chat"),
  upload: createLogger("upload"),
  docprocessing: createLogger("docprocessing"),
  search: createLogger("search"),
  docmgmt: createLogger("docmgmt"),
  llm: createLogger("llm"),
};

// Error reporter for centralized error tracking
export class ErrorReporter {
  private logger: Logger;

  constructor(service: ServiceName) {
    this.logger = createLogger(service);
  }

  /**
   * Report an error with context
   */
  reportError(
    error: Error,
    context: {
      operation: string;
      userId?: string;
      requestId?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    this.logger.error(
      `Error in ${context.operation}`,
      {
        operation: context.operation,
        userId: context.userId,
        requestId: context.requestId,
        ...context.metadata,
      },
      error
    );
  }

  /**
   * Report a warning
   */
  reportWarning(
    message: string,
    context: {
      operation: string;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    this.logger.warn(message, {
      operation: context.operation,
      userId: context.userId,
      ...context.metadata,
    });
  }
}

// Export singleton error reporters
export const errorReporters = {
  chat: new ErrorReporter("chat"),
  upload: new ErrorReporter("upload"),
  docprocessing: new ErrorReporter("docprocessing"),
  search: new ErrorReporter("search"),
  docmgmt: new ErrorReporter("docmgmt"),
  llm: new ErrorReporter("llm"),
};
