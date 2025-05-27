import { z } from 'zod';

// Type definitions for metrics
export interface MetricLabels {
  [key: string]: string;
}

export interface CounterMetric {
  value: number;
  labels?: MetricLabels;
}

export interface GaugeMetric {
  value: number;
  labels?: MetricLabels;
}

export interface HistogramMetric {
  count: number;
  sum: number;
  values: number[];
  labels?: MetricLabels;
}

export interface MetricsSnapshot {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, HistogramMetric>;
  timestamp: number;
}

// Validation schemas
const MetricNameSchema = z.string()
  .regex(/^[a-zA-Z_][a-zA-Z0-9_:.]*$/, 'Metric name must start with letter or underscore and contain only alphanumeric characters, underscores, colons, or dots');

const LabelsSchema = z.record(z.string(), z.string())
  .refine(
    (labels) => Object.keys(labels).every(key => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)),
    'Label names must start with letter or underscore and contain only alphanumeric characters or underscores'
  );

// Main metrics collector class
export class MetricsCollector {
  private counters: Map<string, CounterMetric> = new Map();
  private gauges: Map<string, GaugeMetric> = new Map();
  private histograms: Map<string, HistogramMetric> = new Map();

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: MetricLabels, value: number = 1): void {
    validateMetricName(name);
    if (labels) validateLabels(labels);

    const key = this.generateKey(name, labels);
    const existing = this.counters.get(key);
    
    if (existing) {
      existing.value += value;
    } else {
      this.counters.set(key, { value, labels });
    }
  }

  /**
   * Set a gauge metric value
   */
  setGauge(name: string, value: number, labels?: MetricLabels): void {
    validateMetricName(name);
    if (labels) validateLabels(labels);

    const key = this.generateKey(name, labels);
    this.gauges.set(key, { value, labels });
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    validateMetricName(name);
    if (labels) validateLabels(labels);

    const key = this.generateKey(name, labels);
    const existing = this.histograms.get(key);
    
    if (existing) {
      existing.count++;
      existing.sum += value;
      existing.values.push(value);
    } else {
      this.histograms.set(key, {
        count: 1,
        sum: value,
        values: [value],
        labels
      });
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): MetricsSnapshot {
    const counters: Record<string, number> = {};
    const gauges: Record<string, number> = {};
    const histograms: Record<string, HistogramMetric> = {};

    // Aggregate counters by name (sum across all label combinations)
    for (const [key, metric] of this.counters) {
      const name = this.extractName(key);
      counters[name] = (counters[name] || 0) + metric.value;
    }

    // Get latest gauge values
    for (const [key, metric] of this.gauges) {
      const name = this.extractName(key);
      gauges[name] = metric.value; // Last value set wins
    }

    // Aggregate histogram data by name (combine across all label combinations)
    for (const [key, metric] of this.histograms) {
      const name = this.extractName(key);
      if (histograms[name]) {
        // Combine with existing histogram data
        histograms[name].count += metric.count;
        histograms[name].sum += metric.sum;
        histograms[name].values.push(...metric.values);
      } else {
        histograms[name] = {
          count: metric.count,
          sum: metric.sum,
          values: [...metric.values],
          labels: metric.labels
        };
      }
    }

    return {
      counters,
      gauges,
      histograms,
      timestamp: Date.now()
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  toPrometheusFormat(): string {
    const lines: string[] = [];
    
    // Export counters
    for (const [key, metric] of this.counters) {
      const name = this.extractName(key);
      if (!lines.find(line => line.includes(`# HELP ${name}`))) {
        lines.push(`# HELP ${name} Total count of ${name.replace(/_/g, ' ')}`);
        lines.push(`# TYPE ${name} counter`);
      }
      const labelsStr = metric.labels ? this.formatLabels(metric.labels) : '';
      lines.push(`${name}${labelsStr} ${metric.value}`);
    }

    // Export gauges
    for (const [key, metric] of this.gauges) {
      const name = this.extractName(key);
      if (!lines.find(line => line.includes(`# HELP ${name}`))) {
        lines.push(`# HELP ${name} Current value of ${name.replace(/_/g, ' ')}`);
        lines.push(`# TYPE ${name} gauge`);
      }
      const labelsStr = metric.labels ? this.formatLabels(metric.labels) : '';
      lines.push(`${name}${labelsStr} ${metric.value}`);
    }

    // Export histograms
    for (const [key, metric] of this.histograms) {
      const name = this.extractName(key);
      if (!lines.find(line => line.includes(`# HELP ${name}`))) {
        lines.push(`# HELP ${name} Histogram of ${name.replace(/_/g, ' ')}`);
        lines.push(`# TYPE ${name} histogram`);
      }
      const labelsStr = metric.labels ? this.formatLabels(metric.labels) : '';
      lines.push(`${name}_count${labelsStr} ${metric.count}`);
      lines.push(`${name}_sum${labelsStr} ${metric.sum}`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Export metrics as JSON
   */
  toJSON(): MetricsSnapshot {
    return this.getMetrics();
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  /**
   * Generate internal key for metric storage
   */
  private generateKey(name: string, labels?: MetricLabels): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const sortedLabels = Object.keys(labels)
      .sort()
      .map(key => `${key}="${labels[key]}"`)
      .join(',');
    
    return `${name}{${sortedLabels}}`;
  }

  /**
   * Extract metric name from internal key
   */
  private extractName(key: string): string {
    const braceIndex = key.indexOf('{');
    return braceIndex === -1 ? key : key.substring(0, braceIndex);
  }

  /**
   * Format labels for Prometheus output
   */
  private formatLabels(labels: MetricLabels): string {
    const labelPairs = Object.keys(labels)
      .sort()
      .map(key => `${key}="${labels[key]}"`)
      .join(',');
    
    return `{${labelPairs}}`;
  }
}

// Validation functions
export function validateMetricName(name: string): void {
  try {
    MetricNameSchema.parse(name);
  } catch (error) {
    throw new Error(`Invalid metric name: ${name}`);
  }
}

export function validateLabels(labels: MetricLabels): void {
  try {
    LabelsSchema.parse(labels);
  } catch (error) {
    throw new Error(`Invalid labels: ${JSON.stringify(labels)}`);
  }
}

// Global metrics collector instance
export const metrics = new MetricsCollector();

// Predefined metric helpers for common patterns
export const MetricHelpers = {
  // Embedding metrics
  trackEmbeddingRequest: (model: string, inputType: string, batchSize: number) => {
    metrics.incrementCounter('embedding_requests_total', { model, input_type: inputType });
    metrics.setGauge('embedding_batch_size', batchSize, { model });
  },

  trackEmbeddingDuration: (durationMs: number, model: string, batchSize: number) => {
    metrics.recordHistogram('embedding_processing_time_ms', durationMs, {
      model,
      batch_size: batchSize.toString()
    });
  },

  // Search metrics
  trackSearchRequest: (type: 'vector' | 'fulltext' | 'hybrid', reranking: boolean) => {
    metrics.incrementCounter('search_requests_total', {
      type,
      reranking: reranking.toString()
    });
  },

  trackSearchDuration: (durationMs: number, type: string, reranking: boolean) => {
    metrics.recordHistogram('search_duration_ms', durationMs, {
      type,
      reranking: reranking.toString()
    });
  },

  // Cache metrics
  trackCacheHit: (cacheType: string, level: string) => {
    metrics.incrementCounter('cache_hits_total', { cache_type: cacheType, level });
  },

  trackCacheMiss: (cacheType: string, level: string) => {
    metrics.incrementCounter('cache_misses_total', { cache_type: cacheType, level });
  },

  setCacheHitRate: (rate: number, cacheType: string, level: string) => {
    metrics.setGauge('cache_hit_rate', rate, { cache_type: cacheType, level });
  },

  // RAG metrics
  trackRAGQuality: (relevanceScore: number, queryType: string, documentsFound: number) => {
    metrics.recordHistogram('rag_relevance_score', relevanceScore, {
      query_type: queryType,
      documents_found: documentsFound.toString()
    });
  },

  // Document processing metrics
  trackDocumentProcessed: (contentType: string, status: 'success' | 'error') => {
    metrics.incrementCounter('documents_processed_total', { content_type: contentType, status });
  },

  trackDocumentChunks: (chunkCount: number, contentType: string) => {
    metrics.recordHistogram('document_chunk_count', chunkCount, { content_type: contentType });
  },

  // LLM metrics
  trackLLMRequest: (model: string, responseMode: string) => {
    metrics.incrementCounter('llm_requests_total', { model, response_mode: responseMode });
  },

  trackLLMDuration: (durationMs: number, model: string, tokensUsed: number) => {
    metrics.recordHistogram('llm_response_time_ms', durationMs, { model });
    metrics.recordHistogram('llm_tokens_used', tokensUsed, { model });
  },
};

// Health check metrics
export function recordHealthMetric(service: string, healthy: boolean): void {
  metrics.setGauge('service_health', healthy ? 1 : 0, { service });
  metrics.incrementCounter('health_checks_total', { service, status: healthy ? 'healthy' : 'unhealthy' });
}

// Error tracking
export function recordError(service: string, errorType: string, message?: string): void {
  metrics.incrementCounter('errors_total', { 
    service, 
    error_type: errorType,
    ...(message && { error_message: message.substring(0, 100) })
  });
}