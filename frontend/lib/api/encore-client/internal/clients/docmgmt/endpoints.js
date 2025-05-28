import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";

const TEST_ENDPOINTS = typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test"
    ? await import("./endpoints_testing.js")
    : null;

export async function getDocuments(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getDocuments(params, opts);
    }

    return apiCall("docmgmt", "getDocuments", params, opts);
}
export async function getDocument(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getDocument(params, opts);
    }

    return apiCall("docmgmt", "getDocument", params, opts);
}
export async function updateDocument(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.updateDocument(params, opts);
    }

    return apiCall("docmgmt", "updateDocument", params, opts);
}
export async function deleteDocument(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.deleteDocument(params, opts);
    }

    return apiCall("docmgmt", "deleteDocument", params, opts);
}
export async function getDocumentChunks(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getDocumentChunks(params, opts);
    }

    return apiCall("docmgmt", "getDocumentChunks", params, opts);
}
export async function getDocumentStats(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getDocumentStats(params, opts);
    }

    return apiCall("docmgmt", "getDocumentStats", params, opts);
}
export async function updateProcessingStatus(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.updateProcessingStatus(params, opts);
    }

    return apiCall("docmgmt", "updateProcessingStatus", params, opts);
}
export async function createCollection(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.createCollection(params, opts);
    }

    return apiCall("docmgmt", "createCollection", params, opts);
}
export async function getCollections(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getCollections(params, opts);
    }

    return apiCall("docmgmt", "getCollections", params, opts);
}
export async function getCollection(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getCollection(params, opts);
    }

    return apiCall("docmgmt", "getCollection", params, opts);
}
export async function updateCollection(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.updateCollection(params, opts);
    }

    return apiCall("docmgmt", "updateCollection", params, opts);
}
export async function deleteCollection(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.deleteCollection(params, opts);
    }

    return apiCall("docmgmt", "deleteCollection", params, opts);
}
export async function addDocumentToCollection(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.addDocumentToCollection(params, opts);
    }

    return apiCall("docmgmt", "addDocumentToCollection", params, opts);
}
export async function removeDocumentFromCollection(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.removeDocumentFromCollection(params, opts);
    }

    return apiCall("docmgmt", "removeDocumentFromCollection", params, opts);
}
export async function getCollectionDocuments(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getCollectionDocuments(params, opts);
    }

    return apiCall("docmgmt", "getCollectionDocuments", params, opts);
}
export async function getPopularTags(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getPopularTags(params, opts);
    }

    return apiCall("docmgmt", "getPopularTags", params, opts);
}
export async function addTagToDocument(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.addTagToDocument(params, opts);
    }

    return apiCall("docmgmt", "addTagToDocument", params, opts);
}
export async function removeTagFromDocument(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.removeTagFromDocument(params, opts);
    }

    return apiCall("docmgmt", "removeTagFromDocument", params, opts);
}
export async function getDocumentsByTag(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getDocumentsByTag(params, opts);
    }

    return apiCall("docmgmt", "getDocumentsByTag", params, opts);
}
export async function createSavedFilter(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.createSavedFilter(params, opts);
    }

    return apiCall("docmgmt", "createSavedFilter", params, opts);
}
export async function getSavedFilters(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getSavedFilters(params, opts);
    }

    return apiCall("docmgmt", "getSavedFilters", params, opts);
}
export async function applySavedFilter(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.applySavedFilter(params, opts);
    }

    return apiCall("docmgmt", "applySavedFilter", params, opts);
}
export async function getOrganizationRecommendations(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getOrganizationRecommendations(params, opts);
    }

    return apiCall("docmgmt", "getOrganizationRecommendations", params, opts);
}
