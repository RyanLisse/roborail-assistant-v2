import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";
import { registerTestHandler } from "encore.dev/internal/codegen/appinit";

import * as docprocessing_service from "../../../../docprocessing/encore.service";

export async function processDocument(params, opts) {
    const handler = (await import("../../../../docprocessing/processing")).processDocument;
    registerTestHandler({
        apiRoute: { service: "docprocessing", name: "processDocument", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docprocessing_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docprocessing", "processDocument", params, opts);
}

export async function getProcessingStatus(params, opts) {
    const handler = (await import("../../../../docprocessing/processing")).getProcessingStatus;
    registerTestHandler({
        apiRoute: { service: "docprocessing", name: "getProcessingStatus", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docprocessing_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docprocessing", "getProcessingStatus", params, opts);
}

export async function reprocessDocument(params, opts) {
    const handler = (await import("../../../../docprocessing/processing")).reprocessDocument;
    registerTestHandler({
        apiRoute: { service: "docprocessing", name: "reprocessDocument", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docprocessing_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docprocessing", "reprocessDocument", params, opts);
}

