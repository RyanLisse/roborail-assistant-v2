import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";

const TEST_ENDPOINTS = typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test"
    ? await import("./endpoints_testing.js")
    : null;

export async function createProcessingStatus(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.createProcessingStatus(params, opts);
    }

    return apiCall("upload", "createProcessingStatus", params, opts);
}
export async function updateProcessingStatus(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.updateProcessingStatus(params, opts);
    }

    return apiCall("upload", "updateProcessingStatus", params, opts);
}
export async function getProcessingStatus(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getProcessingStatus(params, opts);
    }

    return apiCall("upload", "getProcessingStatus", params, opts);
}
export async function queryProcessingStatuses(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.queryProcessingStatuses(params, opts);
    }

    return apiCall("upload", "queryProcessingStatuses", params, opts);
}
export async function retryProcessingFromStage(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.retryProcessingFromStage(params, opts);
    }

    return apiCall("upload", "retryProcessingFromStage", params, opts);
}
export async function cancelProcessing(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.cancelProcessing(params, opts);
    }

    return apiCall("upload", "cancelProcessing", params, opts);
}
export async function getProcessingMetrics(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getProcessingMetrics(params, opts);
    }

    return apiCall("upload", "getProcessingMetrics", params, opts);
}
export async function uploadFile(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.uploadFile(params, opts);
    }

    return apiCall("upload", "uploadFile", params, opts);
}
export async function getUploadStatus(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getUploadStatus(params, opts);
    }

    return apiCall("upload", "getUploadStatus", params, opts);
}
export async function downloadFile(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.downloadFile(params, opts);
    }

    return apiCall("upload", "downloadFile", params, opts);
}
export async function deleteFile(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.deleteFile(params, opts);
    }

    return apiCall("upload", "deleteFile", params, opts);
}
export async function fileExists(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.fileExists(params, opts);
    }

    return apiCall("upload", "fileExists", params, opts);
}
export async function getFileMetadata(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getFileMetadata(params, opts);
    }

    return apiCall("upload", "getFileMetadata", params, opts);
}
