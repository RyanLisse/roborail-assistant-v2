import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";

const TEST_ENDPOINTS = typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test"
    ? await import("./endpoints_testing.js")
    : null;

export async function getMetrics(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getMetrics(params, opts);
    }

    return apiCall("monitoring", "getMetrics", params, opts);
}
export async function healthCheck(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.healthCheck(params, opts);
    }

    return apiCall("monitoring", "healthCheck", params, opts);
}
export async function recordPerformance(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.recordPerformance(params, opts);
    }

    return apiCall("monitoring", "recordPerformance", params, opts);
}
export async function resetMetrics(opts) {
    const params = undefined;
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.resetMetrics(params, opts);
    }

    return apiCall("monitoring", "resetMetrics", params, opts);
}
export async function getCacheStats(opts) {
    const params = undefined;
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getCacheStats(params, opts);
    }

    return apiCall("monitoring", "getCacheStats", params, opts);
}
export async function getSystemOverview(opts) {
    const params = undefined;
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getSystemOverview(params, opts);
    }

    return apiCall("monitoring", "getSystemOverview", params, opts);
}
