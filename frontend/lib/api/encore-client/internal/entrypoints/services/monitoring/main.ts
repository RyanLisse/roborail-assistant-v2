import { registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";
import { Worker, isMainThread } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { availableParallelism } from "node:os";

import { getMetrics as getMetricsImpl0 } from "../../../../../lib/monitoring/encore.service";
import { healthCheck as healthCheckImpl1 } from "../../../../../lib/monitoring/encore.service";
import { recordPerformance as recordPerformanceImpl2 } from "../../../../../lib/monitoring/encore.service";
import { resetMetrics as resetMetricsImpl3 } from "../../../../../lib/monitoring/encore.service";
import { getCacheStats as getCacheStatsImpl4 } from "../../../../../lib/monitoring/encore.service";
import { getSystemOverview as getSystemOverviewImpl5 } from "../../../../../lib/monitoring/encore.service";
import * as monitoring_service from "../../../../../lib/monitoring/encore.service";

const handlers: Handler[] = [
    {
        apiRoute: {
            service:           "monitoring",
            name:              "getMetrics",
            handler:           getMetricsImpl0,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: monitoring_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "monitoring",
            name:              "healthCheck",
            handler:           healthCheckImpl1,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: monitoring_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "monitoring",
            name:              "recordPerformance",
            handler:           recordPerformanceImpl2,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: monitoring_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "monitoring",
            name:              "resetMetrics",
            handler:           resetMetricsImpl3,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: monitoring_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "monitoring",
            name:              "getCacheStats",
            handler:           getCacheStatsImpl4,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: monitoring_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "monitoring",
            name:              "getSystemOverview",
            handler:           getSystemOverviewImpl5,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: monitoring_service.default.cfg.middlewares || [],
    },
];

registerHandlers(handlers);

await run(import.meta.url);
