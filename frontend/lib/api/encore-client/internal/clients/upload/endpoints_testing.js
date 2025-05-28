import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";
import { registerTestHandler } from "encore.dev/internal/codegen/appinit";

import * as upload_service from "../../../../upload/encore.service";

export async function createProcessingStatus(params, opts) {
    const handler = (await import("../../../../upload/status")).createProcessingStatus;
    registerTestHandler({
        apiRoute: { service: "upload", name: "createProcessingStatus", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "createProcessingStatus", params, opts);
}

export async function updateProcessingStatus(params, opts) {
    const handler = (await import("../../../../upload/status")).updateProcessingStatus;
    registerTestHandler({
        apiRoute: { service: "upload", name: "updateProcessingStatus", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "updateProcessingStatus", params, opts);
}

export async function getProcessingStatus(params, opts) {
    const handler = (await import("../../../../upload/status")).getProcessingStatus;
    registerTestHandler({
        apiRoute: { service: "upload", name: "getProcessingStatus", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "getProcessingStatus", params, opts);
}

export async function queryProcessingStatuses(params, opts) {
    const handler = (await import("../../../../upload/status")).queryProcessingStatuses;
    registerTestHandler({
        apiRoute: { service: "upload", name: "queryProcessingStatuses", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "queryProcessingStatuses", params, opts);
}

export async function retryProcessingFromStage(params, opts) {
    const handler = (await import("../../../../upload/status")).retryProcessingFromStage;
    registerTestHandler({
        apiRoute: { service: "upload", name: "retryProcessingFromStage", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "retryProcessingFromStage", params, opts);
}

export async function cancelProcessing(params, opts) {
    const handler = (await import("../../../../upload/status")).cancelProcessing;
    registerTestHandler({
        apiRoute: { service: "upload", name: "cancelProcessing", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "cancelProcessing", params, opts);
}

export async function getProcessingMetrics(params, opts) {
    const handler = (await import("../../../../upload/status")).getProcessingMetrics;
    registerTestHandler({
        apiRoute: { service: "upload", name: "getProcessingMetrics", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "getProcessingMetrics", params, opts);
}

export async function uploadFile(params, opts) {
    const handler = (await import("../../../../upload/upload")).uploadFile;
    registerTestHandler({
        apiRoute: { service: "upload", name: "uploadFile", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "uploadFile", params, opts);
}

export async function getUploadStatus(params, opts) {
    const handler = (await import("../../../../upload/upload")).getUploadStatus;
    registerTestHandler({
        apiRoute: { service: "upload", name: "getUploadStatus", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "getUploadStatus", params, opts);
}

export async function downloadFile(params, opts) {
    const handler = (await import("../../../../upload/upload")).downloadFile;
    registerTestHandler({
        apiRoute: { service: "upload", name: "downloadFile", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "downloadFile", params, opts);
}

export async function deleteFile(params, opts) {
    const handler = (await import("../../../../upload/upload")).deleteFile;
    registerTestHandler({
        apiRoute: { service: "upload", name: "deleteFile", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "deleteFile", params, opts);
}

export async function fileExists(params, opts) {
    const handler = (await import("../../../../upload/upload")).fileExists;
    registerTestHandler({
        apiRoute: { service: "upload", name: "fileExists", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "fileExists", params, opts);
}

export async function getFileMetadata(params, opts) {
    const handler = (await import("../../../../upload/upload")).getFileMetadata;
    registerTestHandler({
        apiRoute: { service: "upload", name: "getFileMetadata", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: upload_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("upload", "getFileMetadata", params, opts);
}

