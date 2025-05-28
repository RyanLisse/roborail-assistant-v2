import { z } from "zod";

// Validation schemas for monitoring data
export const LogLevelSchema = z.enum(["debug", "info", "warn", "error", "fatal"]);
export const ServiceNameSchema = z.enum([
  "chat",
  "upload",
  "docprocessing",
  "search",
  "docmgmt",
  "llm",
]);

export const StructuredLogSchema = z.object({
  timestamp: z.string().datetime(),
  level: LogLevelSchema,
  service: ServiceNameSchema,
  message: z.string(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  userId: z.string().optional(),
  requestId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  error: z
    .object({
      name: z.string(),
      message: z.string(),
      stack: z.string().optional(),
    })
    .optional(),
});

export const MetricTypeSchema = z.enum(["counter", "gauge", "histogram"]);

export const MonitoringConfigSchema = z.object({
  metricsEnabled: z.boolean().default(true),
  loggingEnabled: z.boolean().default(true),
  logLevel: LogLevelSchema.default("info"),
  metricsPort: z.number().int().min(1024).max(65535).default(9090),
  exportInterval: z.number().int().min(1000).default(30000), // 30 seconds
  healthCheckInterval: z.number().int().min(1000).default(30000),
  enableTracing: z.boolean().default(false),
});

// TypeScript types - explicit definitions instead of z.infer to avoid import issues
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type ServiceName = "chat" | "upload" | "docprocessing" | "search" | "docmgmt" | "llm";
export type MetricType = "counter" | "gauge" | "histogram";

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  service: ServiceName;
  message: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface MonitoringConfig {
  logLevel: LogLevel;
  enableMetrics: boolean;
  enableTracing: boolean;
}

// Additional monitoring types
export interface ServiceHealth {
  service: ServiceName;
  status: "healthy" | "degraded" | "unhealthy";
  lastCheck: Date;
  responseTime?: number;
  details?: Record<string, any>;
}

export interface SystemHealth {
  overall: "healthy" | "degraded" | "unhealthy";
  services: ServiceHealth[];
  timestamp: Date;
  version: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: "greater_than" | "less_than" | "equals" | "not_equals";
  threshold: number;
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
}

export interface Alert {
  id: string;
  rule: AlertRule;
  triggeredAt: Date;
  resolvedAt?: Date;
  value: number;
  message: string;
  metadata?: Record<string, any>;
}

// Error context for structured error reporting
export interface ErrorContext {
  service: ServiceName;
  operation: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
  metadata?: Record<string, any>;
}

// Performance monitoring
export interface PerformanceMetrics {
  service: ServiceName;
  operation: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Business metrics
export interface BusinessMetrics {
  documentsUploaded: number;
  documentsProcessed: number;
  searchQueries: number;
  chatMessages: number;
  uniqueUsers: number;
  cacheHitRate: number;
  averageResponseTime: number;
  errorRate: number;
}

// Dashboard configuration
export interface DashboardConfig {
  title: string;
  refreshInterval: number;
  panels: DashboardPanel[];
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: "metric" | "log" | "chart" | "table";
  query: string;
  size: "small" | "medium" | "large";
  position: { x: number; y: number };
}

// Trace context for distributed tracing
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  service: ServiceName;
  startTime: Date;
  endTime?: Date;
  tags?: Record<string, string>;
  logs?: Array<{
    timestamp: Date;
    level: LogLevel;
    message: string;
    fields?: Record<string, any>;
  }>;
}
