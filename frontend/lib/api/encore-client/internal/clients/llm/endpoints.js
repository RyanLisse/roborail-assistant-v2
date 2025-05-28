import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";

const TEST_ENDPOINTS = typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test"
    ? await import("./endpoints_testing.js")
    : null;

export async function parseCitations(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.parseCitations(params, opts);
    }

    return apiCall("llm", "parseCitations", params, opts);
}
export async function validateCitationsEndpoint(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.validateCitationsEndpoint(params, opts);
    }

    return apiCall("llm", "validateCitationsEndpoint", params, opts);
}
export async function generateFollowUp(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.generateFollowUp(params, opts);
    }

    return apiCall("llm", "generateFollowUp", params, opts);
}
export async function formatCitations(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.formatCitations(params, opts);
    }

    return apiCall("llm", "formatCitations", params, opts);
}
export async function extractCitedContent(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.extractCitedContent(params, opts);
    }

    return apiCall("llm", "extractCitedContent", params, opts);
}
export async function generate(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.generate(params, opts);
    }

    return apiCall("llm", "generate", params, opts);
}
export async function generateRAG(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.generateRAG(params, opts);
    }

    return apiCall("llm", "generateRAG", params, opts);
}
export async function health(opts) {
    const params = undefined;
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.health(params, opts);
    }

    return apiCall("llm", "health", params, opts);
}
export async function buildPrompt(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.buildPrompt(params, opts);
    }

    return apiCall("llm", "buildPrompt", params, opts);
}
export async function listTemplates(opts) {
    const params = undefined;
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.listTemplates(params, opts);
    }

    return apiCall("llm", "listTemplates", params, opts);
}
export async function getTemplate(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getTemplate(params, opts);
    }

    return apiCall("llm", "getTemplate", params, opts);
}
export async function addTemplate(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.addTemplate(params, opts);
    }

    return apiCall("llm", "addTemplate", params, opts);
}
export async function removeTemplate(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.removeTemplate(params, opts);
    }

    return apiCall("llm", "removeTemplate", params, opts);
}
export async function validateTemplateEndpoint(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.validateTemplateEndpoint(params, opts);
    }

    return apiCall("llm", "validateTemplateEndpoint", params, opts);
}
