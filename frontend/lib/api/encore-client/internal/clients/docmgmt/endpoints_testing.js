import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";
import { registerTestHandler } from "encore.dev/internal/codegen/appinit";

import * as docmgmt_service from "../../../../docmgmt/encore.service";

export async function getDocuments(params, opts) {
    const handler = (await import("../../../../docmgmt/documents")).getDocuments;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "getDocuments", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "getDocuments", params, opts);
}

export async function getDocument(params, opts) {
    const handler = (await import("../../../../docmgmt/documents")).getDocument;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "getDocument", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "getDocument", params, opts);
}

export async function updateDocument(params, opts) {
    const handler = (await import("../../../../docmgmt/documents")).updateDocument;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "updateDocument", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "updateDocument", params, opts);
}

export async function deleteDocument(params, opts) {
    const handler = (await import("../../../../docmgmt/documents")).deleteDocument;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "deleteDocument", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "deleteDocument", params, opts);
}

export async function getDocumentChunks(params, opts) {
    const handler = (await import("../../../../docmgmt/documents")).getDocumentChunks;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "getDocumentChunks", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "getDocumentChunks", params, opts);
}

export async function getDocumentStats(params, opts) {
    const handler = (await import("../../../../docmgmt/documents")).getDocumentStats;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "getDocumentStats", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "getDocumentStats", params, opts);
}

export async function updateProcessingStatus(params, opts) {
    const handler = (await import("../../../../docmgmt/documents")).updateProcessingStatus;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "updateProcessingStatus", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":false,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "updateProcessingStatus", params, opts);
}

export async function createCollection(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).createCollection;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "createCollection", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "createCollection", params, opts);
}

export async function getCollections(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).getCollections;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "getCollections", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "getCollections", params, opts);
}

export async function getCollection(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).getCollection;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "getCollection", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "getCollection", params, opts);
}

export async function updateCollection(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).updateCollection;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "updateCollection", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "updateCollection", params, opts);
}

export async function deleteCollection(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).deleteCollection;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "deleteCollection", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "deleteCollection", params, opts);
}

export async function addDocumentToCollection(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).addDocumentToCollection;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "addDocumentToCollection", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "addDocumentToCollection", params, opts);
}

export async function removeDocumentFromCollection(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).removeDocumentFromCollection;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "removeDocumentFromCollection", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "removeDocumentFromCollection", params, opts);
}

export async function getCollectionDocuments(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).getCollectionDocuments;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "getCollectionDocuments", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "getCollectionDocuments", params, opts);
}

export async function getPopularTags(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).getPopularTags;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "getPopularTags", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "getPopularTags", params, opts);
}

export async function addTagToDocument(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).addTagToDocument;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "addTagToDocument", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "addTagToDocument", params, opts);
}

export async function removeTagFromDocument(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).removeTagFromDocument;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "removeTagFromDocument", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "removeTagFromDocument", params, opts);
}

export async function getDocumentsByTag(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).getDocumentsByTag;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "getDocumentsByTag", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "getDocumentsByTag", params, opts);
}

export async function createSavedFilter(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).createSavedFilter;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "createSavedFilter", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "createSavedFilter", params, opts);
}

export async function getSavedFilters(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).getSavedFilters;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "getSavedFilters", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "getSavedFilters", params, opts);
}

export async function applySavedFilter(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).applySavedFilter;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "applySavedFilter", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "applySavedFilter", params, opts);
}

export async function getOrganizationRecommendations(params, opts) {
    const handler = (await import("../../../../docmgmt/organization")).getOrganizationRecommendations;
    registerTestHandler({
        apiRoute: { service: "docmgmt", name: "getOrganizationRecommendations", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: docmgmt_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("docmgmt", "getOrganizationRecommendations", params, opts);
}

