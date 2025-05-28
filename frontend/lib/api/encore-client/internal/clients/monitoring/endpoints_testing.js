import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";
import { registerTestHandler } from "encore.dev/internal/codegen/appinit";

import * as monitoring_service from "../../../../lib/monitoring/encore.service";

export async function getMetrics(params, opts) {
    const handler = (await import("../../../../lib/monitoring/encore.service")).getMetrics;
    registerTestHandler({
        apiRoute: { service: "monitoring", name: "getMetrics", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: monitoring_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("monitoring", "getMetrics", params, opts);
}

export async function healthCheck(params, opts) {
    const handler = (await import("../../../../lib/monitoring/encore.service")).healthCheck;
    registerTestHandler({
        apiRoute: { service: "monitoring", name: "healthCheck", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: monitoring_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("monitoring", "healthCheck", params, opts);
}

export async function recordPerformance(params, opts) {
    const handler = (await import("../../../../lib/monitoring/encore.service")).recordPerformance;
    registerTestHandler({
        apiRoute: { service: "monitoring", name: "recordPerformance", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: monitoring_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("monitoring", "recordPerformance", params, opts);
}

export async function resetMetrics(params, opts) {
    const handler = (await import("../../../../lib/monitoring/encore.service")).resetMetrics;
    registerTestHandler({
        apiRoute: { service: "monitoring", name: "resetMetrics", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: monitoring_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("monitoring", "resetMetrics", params, opts);
}

export async function getCacheStats(params, opts) {
    const handler = (await import("../../../../lib/monitoring/encore.service")).getCacheStats;
    registerTestHandler({
        apiRoute: { service: "monitoring", name: "getCacheStats", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: monitoring_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("monitoring", "getCacheStats", params, opts);
}

export async function getSystemOverview(params, opts) {
    const handler = (await import("../../../../lib/monitoring/encore.service")).getSystemOverview;
    registerTestHandler({
        apiRoute: { service: "monitoring", name: "getSystemOverview", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: monitoring_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("monitoring", "getSystemOverview", params, opts);
}

