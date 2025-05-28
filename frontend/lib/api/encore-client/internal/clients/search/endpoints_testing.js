import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";
import { registerTestHandler } from "encore.dev/internal/codegen/appinit";

import * as search_service from "../../../../search/encore.service";

export async function hybridSearch(params, opts) {
    const handler = (await import("../../../../search/search")).hybridSearch;
    registerTestHandler({
        apiRoute: { service: "search", name: "hybridSearch", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: search_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("search", "hybridSearch", params, opts);
}

export async function vectorSearch(params, opts) {
    const handler = (await import("../../../../search/search")).vectorSearch;
    registerTestHandler({
        apiRoute: { service: "search", name: "vectorSearch", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: search_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("search", "vectorSearch", params, opts);
}

export async function fullTextSearch(params, opts) {
    const handler = (await import("../../../../search/search")).fullTextSearch;
    registerTestHandler({
        apiRoute: { service: "search", name: "fullTextSearch", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: search_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("search", "fullTextSearch", params, opts);
}

export async function enhancedSearch(params, opts) {
    const handler = (await import("../../../../search/search")).enhancedSearch;
    registerTestHandler({
        apiRoute: { service: "search", name: "enhancedSearch", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: search_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("search", "enhancedSearch", params, opts);
}

