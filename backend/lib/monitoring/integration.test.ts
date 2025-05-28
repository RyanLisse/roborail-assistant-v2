import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Encore API decorator
vi.mock("encore.dev/api", () => ({
  api: (config: any, handler: any) => handler,
}));

describe("Monitoring Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Metrics Collection in Services", () => {
    it("should collect embedding metrics", async () => {
      const { MetricHelpers, metrics } = await import("./metrics");

      // Reset metrics
      metrics.reset();

      // Simulate embedding request
      MetricHelpers.trackEmbeddingRequest("embed-english-v4.0", "search_document", 10);
      MetricHelpers.trackEmbeddingDuration(250, "embed-english-v4.0", 10);

      const metricsData = metrics.getMetrics();

      expect(metricsData.counters["embedding_requests_total"]).toBe(1);
      expect(metricsData.histograms["embedding_processing_time_ms"].count).toBe(1);
      expect(metricsData.histograms["embedding_processing_time_ms"].sum).toBe(250);
    });

    it("should collect search metrics", async () => {
      const { MetricHelpers, metrics } = await import("./metrics");

      metrics.reset();

      // Simulate search requests
      MetricHelpers.trackSearchRequest("hybrid", true);
      MetricHelpers.trackSearchDuration(1200, "hybrid", true);
      MetricHelpers.trackCacheHit("search", "L1");

      const metricsData = metrics.getMetrics();

      expect(metricsData.counters["search_requests_total"]).toBe(1);
      expect(metricsData.counters["cache_hits_total"]).toBe(1);
      expect(metricsData.histograms["search_duration_ms"].count).toBe(1);
    });

    it("should track cache performance", async () => {
      const { MetricHelpers, metrics } = await import("./metrics");

      metrics.reset();

      // Simulate cache operations
      MetricHelpers.trackCacheHit("embedding", "L1");
      MetricHelpers.trackCacheHit("embedding", "L1");
      MetricHelpers.trackCacheMiss("embedding", "L1");
      MetricHelpers.setCacheHitRate(0.67, "embedding", "L1");

      const metricsData = metrics.getMetrics();

      expect(metricsData.counters["cache_hits_total"]).toBe(2);
      expect(metricsData.counters["cache_misses_total"]).toBe(1);
      expect(metricsData.gauges["cache_hit_rate"]).toBe(0.67);
    });

    it("should track business metrics", async () => {
      const { MetricHelpers, metrics } = await import("./metrics");

      metrics.reset();

      // Simulate business operations
      MetricHelpers.trackRAGQuality(0.92, "factual", 5);
      MetricHelpers.trackDocumentProcessed("application/pdf", "success");
      MetricHelpers.trackDocumentChunks(45, "application/pdf");

      const metricsData = metrics.getMetrics();

      expect(metricsData.histograms["rag_relevance_score"].count).toBe(1);
      expect(metricsData.counters["documents_processed_total"]).toBe(1);
      expect(metricsData.histograms["document_chunk_count"].count).toBe(1);
    });
  });

  describe("Error Tracking", () => {
    it("should record and track errors", async () => {
      const { recordError, metrics } = await import("./metrics");

      metrics.reset();

      // Record various errors
      recordError("upload", "INVALID_INPUT", "Empty file provided");
      recordError("search", "SEARCH_FAILED", "Database connection error");
      recordError("llm", "API_ERROR", "Rate limit exceeded");

      const metricsData = metrics.getMetrics();

      expect(metricsData.counters["errors_total"]).toBe(3);
    });
  });

  describe("Health Monitoring", () => {
    it("should track service health", async () => {
      const { recordHealthMetric, metrics } = await import("./metrics");

      metrics.reset();

      // Record health status for services
      recordHealthMetric("chat", true);
      recordHealthMetric("search", true);
      recordHealthMetric("upload", false);

      const metricsData = metrics.getMetrics();

      expect(metricsData.counters["health_checks_total"]).toBe(3);
      expect(metricsData.gauges["service_health"]).toBeDefined();
    });
  });

  describe("Metrics Export", () => {
    it("should export metrics in multiple formats", async () => {
      const { MetricHelpers, metrics } = await import("./metrics");

      metrics.reset();

      // Add some test data
      MetricHelpers.trackEmbeddingRequest("test-model", "test-input", 1);
      metrics.setGauge("test_gauge", 42);
      metrics.recordHistogram("test_histogram", 100);

      // Test JSON export
      const jsonExport = metrics.toJSON();
      expect(jsonExport).toHaveProperty("counters");
      expect(jsonExport).toHaveProperty("gauges");
      expect(jsonExport).toHaveProperty("histograms");
      expect(jsonExport).toHaveProperty("timestamp");

      // Test Prometheus export
      const prometheusExport = metrics.toPrometheusFormat();
      expect(prometheusExport).toContain("# HELP");
      expect(prometheusExport).toContain("# TYPE");
      expect(prometheusExport).toContain("test_gauge 42");
    });
  });

  describe("Performance Monitoring", () => {
    it("should track operation performance", async () => {
      const { metrics } = await import("./metrics");

      metrics.reset();

      // Simulate operation tracking
      const startTime = Date.now();

      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 10));

      const duration = Date.now() - startTime;

      metrics.recordHistogram("test_operation_duration_ms", duration, {
        operation: "test",
        success: "true",
      });

      metrics.incrementCounter("test_operations_total", {
        operation: "test",
        status: "success",
      });

      const metricsData = metrics.getMetrics();

      expect(metricsData.histograms["test_operation_duration_ms"].count).toBe(1);
      expect(metricsData.counters["test_operations_total"]).toBe(1);
      expect(metricsData.histograms["test_operation_duration_ms"].sum).toBeGreaterThan(0);
    });
  });
});
