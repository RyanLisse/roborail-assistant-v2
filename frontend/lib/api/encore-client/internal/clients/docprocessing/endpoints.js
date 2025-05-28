import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";

const TEST_ENDPOINTS = typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test"
    ? await import("./endpoints_testing.js")
    : null;

export async function processDocument(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.processDocument(params, opts);
    }

    return apiCall("docprocessing", "processDocument", params, opts);
}
export async function getProcessingStatus(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getProcessingStatus(params, opts);
    }

    return apiCall("docprocessing", "getProcessingStatus", params, opts);
}
export async function reprocessDocument(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.reprocessDocument(params, opts);
    }

    return apiCall("docprocessing", "reprocessDocument", params, opts);
}
