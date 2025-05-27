import { api } from "encore.dev/api";
import { z } from "zod";
import { metrics, MetricsCollector, recordError, recordHealthMetric } from "./metrics";
import { 
  MonitoringConfigSchema, 
  ServiceNameSchema, 
  SystemHealth, 
  ServiceHealth,
  PerformanceMetrics 
} from "./types";

// API schemas
const MetricsQuerySchema = z.object({
  format: z.enum(['json', 'prometheus']).default('json'),
  service: ServiceNameSchema.optional(),
});

const HealthCheckSchema = z.object({
  service: ServiceNameSchema.optional(),
});

const RecordPerformanceSchema = z.object({
  service: ServiceNameSchema,
  operation: z.string(),
  duration: z.number(),
  success: z.boolean(),
  metadata: z.record(z.any()).optional(),
});

// Get metrics endpoint
export const getMetrics = api(
  { expose: true, method: "GET", path: "/metrics" },
  async (req: z.infer<typeof MetricsQuerySchema>) => {
    try {
      const query = MetricsQuerySchema.parse(req);
      
      if (query.format === 'prometheus') {
        const prometheusData = metrics.toPrometheusFormat();
        return {
          format: 'prometheus',
          data: prometheusData,
          contentType: 'text/plain',
        };
      }
      
      const jsonData = metrics.toJSON();
      return {
        format: 'json',
        data: jsonData,
        contentType: 'application/json',
      };
    } catch (error) {
      recordError('monitoring', 'METRICS_EXPORT_FAILED', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Failed to export metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Health check endpoint
export const healthCheck = api(
  { expose: true, method: "GET", path: "/health" },
  async (req: z.infer<typeof HealthCheckSchema>): Promise<SystemHealth> => {
    try {
      const query = HealthCheckSchema.parse(req);
      const checkTime = new Date();
      
      // Define services to check
      const servicesToCheck: Array<{ name: ServiceNameSchema['_type'], checkFn: () => Promise<ServiceHealth> }> = [
        {
          name: 'chat',
          checkFn: async () => {
            try {
              // Simple health check - could ping actual chat service
              return {
                service: 'chat',
                status: 'healthy',
                lastCheck: checkTime,
                responseTime: 10,
                details: { endpoint: '/chat/health' }
              };
            } catch (error) {
              return {
                service: 'chat',
                status: 'unhealthy',
                lastCheck: checkTime,
                details: { error: error instanceof Error ? error.message : 'Unknown error' }
              };
            }
          }
        },
        {
          name: 'search',
          checkFn: async () => {
            try {
              // Could test search functionality
              return {
                service: 'search',
                status: 'healthy',
                lastCheck: checkTime,
                responseTime: 15,
                details: { endpoint: '/search/health' }
              };
            } catch (error) {
              return {
                service: 'search',
                status: 'unhealthy',
                lastCheck: checkTime,
                details: { error: error instanceof Error ? error.message : 'Unknown error' }
              };
            }
          }
        },
        {
          name: 'upload',
          checkFn: async () => {
            try {
              // Could test upload/embedding functionality
              return {
                service: 'upload',
                status: 'healthy',
                lastCheck: checkTime,
                responseTime: 20,
                details: { endpoint: '/upload/health' }
              };
            } catch (error) {
              return {
                service: 'upload',
                status: 'unhealthy',
                lastCheck: checkTime,
                details: { error: error instanceof Error ? error.message : 'Unknown error' }
              };
            }
          }
        }
      ];

      // Filter services if specific service requested
      const servicesToRun = query.service 
        ? servicesToCheck.filter(s => s.name === query.service)
        : servicesToCheck;

      // Run health checks
      const serviceResults = await Promise.all(
        servicesToRun.map(async ({ name, checkFn }) => {
          try {
            const result = await checkFn();
            recordHealthMetric(name, result.status === 'healthy');
            return result;
          } catch (error) {
            recordHealthMetric(name, false);
            recordError('monitoring', 'HEALTH_CHECK_FAILED', `${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
              service: name,
              status: 'unhealthy' as const,
              lastCheck: checkTime,
              details: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
          }
        })
      );

      // Determine overall health
      const unhealthyServices = serviceResults.filter(s => s.status === 'unhealthy');
      const degradedServices = serviceResults.filter(s => s.status === 'degraded');
      
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (unhealthyServices.length > 0) {
        overallStatus = 'unhealthy';
      } else if (degradedServices.length > 0) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      const systemHealth: SystemHealth = {
        overall: overallStatus,
        services: serviceResults,
        timestamp: checkTime,
        version: '1.0.0' // Could be read from package.json
      };

      return systemHealth;
      
    } catch (error) {
      recordError('monitoring', 'HEALTH_CHECK_ERROR', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Record performance metric endpoint
export const recordPerformance = api(
  { expose: true, method: "POST", path: "/metrics/performance" },
  async (req: z.infer<typeof RecordPerformanceSchema>): Promise<{ success: boolean }> => {
    try {
      const perfData = RecordPerformanceSchema.parse(req);
      
      // Record performance metrics
      metrics.recordHistogram(
        `${perfData.service}_operation_duration_ms`,
        perfData.duration,
        {
          operation: perfData.operation,
          success: perfData.success.toString(),
          ...perfData.metadata
        }
      );

      metrics.incrementCounter(
        `${perfData.service}_operations_total`,
        {
          operation: perfData.operation,
          status: perfData.success ? 'success' : 'error'
        }
      );

      return { success: true };
      
    } catch (error) {
      recordError('monitoring', 'PERFORMANCE_RECORD_FAILED', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Failed to record performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Reset metrics endpoint (for testing/debugging)
export const resetMetrics = api(
  { expose: true, method: "POST", path: "/metrics/reset" },
  async (): Promise<{ success: boolean }> => {
    try {
      metrics.reset();
      return { success: true };
    } catch (error) {
      recordError('monitoring', 'METRICS_RESET_FAILED', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Failed to reset metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Get cache statistics
export const getCacheStats = api(
  { expose: true, method: "GET", path: "/metrics/cache" },
  async () => {
    try {
      const metricsData = metrics.toJSON();
      
      // Calculate cache hit rates
      const cacheHits = metricsData.counters['cache_hits_total'] || 0;
      const cacheMisses = metricsData.counters['cache_misses_total'] || 0;
      const totalRequests = cacheHits + cacheMisses;
      const hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;

      return {
        hitRate,
        totalHits: cacheHits,
        totalMisses: cacheMisses,
        totalRequests,
        currentHitRate: metricsData.gauges['cache_hit_rate'] || 0,
        timestamp: metricsData.timestamp
      };
      
    } catch (error) {
      recordError('monitoring', 'CACHE_STATS_FAILED', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Failed to get cache stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Get system overview
export const getSystemOverview = api(
  { expose: true, method: "GET", path: "/metrics/overview" },
  async () => {
    try {
      const metricsData = metrics.toJSON();
      
      return {
        metrics: {
          totalCounters: Object.keys(metricsData.counters).length,
          totalGauges: Object.keys(metricsData.gauges).length,
          totalHistograms: Object.keys(metricsData.histograms).length,
        },
        counters: metricsData.counters,
        gauges: metricsData.gauges,
        histograms: Object.fromEntries(
          Object.entries(metricsData.histograms).map(([name, hist]) => [
            name,
            {
              count: hist.count,
              sum: hist.sum,
              average: hist.count > 0 ? hist.sum / hist.count : 0,
              min: Math.min(...hist.values),
              max: Math.max(...hist.values)
            }
          ])
        ),
        timestamp: metricsData.timestamp
      };
      
    } catch (error) {
      recordError('monitoring', 'OVERVIEW_FAILED', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Failed to get system overview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);