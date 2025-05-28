import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";

const TEST_ENDPOINTS = typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test"
    ? await import("./endpoints_testing.js")
    : null;

export async function hybridSearch(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.hybridSearch(params, opts);
    }

    return apiCall("search", "hybridSearch", params, opts);
}
export async function vectorSearch(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.vectorSearch(params, opts);
    }

    return apiCall("search", "vectorSearch", params, opts);
}
export async function fullTextSearch(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.fullTextSearch(params, opts);
    }

    return apiCall("search", "fullTextSearch", params, opts);
}
export async function enhancedSearch(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.enhancedSearch(params, opts);
    }

    return apiCall("search", "enhancedSearch", params, opts);
}
