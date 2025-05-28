import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";
import { registerTestHandler } from "encore.dev/internal/codegen/appinit";

import * as llm_service from "../../../../llm/encore.service";

export async function parseCitations(params, opts) {
    const handler = (await import("../../../../llm/citations")).parseCitations;
    registerTestHandler({
        apiRoute: { service: "llm", name: "parseCitations", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "parseCitations", params, opts);
}

export async function validateCitationsEndpoint(params, opts) {
    const handler = (await import("../../../../llm/citations")).validateCitationsEndpoint;
    registerTestHandler({
        apiRoute: { service: "llm", name: "validateCitationsEndpoint", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "validateCitationsEndpoint", params, opts);
}

export async function generateFollowUp(params, opts) {
    const handler = (await import("../../../../llm/citations")).generateFollowUp;
    registerTestHandler({
        apiRoute: { service: "llm", name: "generateFollowUp", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "generateFollowUp", params, opts);
}

export async function formatCitations(params, opts) {
    const handler = (await import("../../../../llm/citations")).formatCitations;
    registerTestHandler({
        apiRoute: { service: "llm", name: "formatCitations", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "formatCitations", params, opts);
}

export async function extractCitedContent(params, opts) {
    const handler = (await import("../../../../llm/citations")).extractCitedContent;
    registerTestHandler({
        apiRoute: { service: "llm", name: "extractCitedContent", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "extractCitedContent", params, opts);
}

export async function generate(params, opts) {
    const handler = (await import("../../../../llm/llm")).generate;
    registerTestHandler({
        apiRoute: { service: "llm", name: "generate", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "generate", params, opts);
}

export async function generateRAG(params, opts) {
    const handler = (await import("../../../../llm/llm")).generateRAG;
    registerTestHandler({
        apiRoute: { service: "llm", name: "generateRAG", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "generateRAG", params, opts);
}

export async function health(params, opts) {
    const handler = (await import("../../../../llm/llm")).health;
    registerTestHandler({
        apiRoute: { service: "llm", name: "health", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "health", params, opts);
}

export async function buildPrompt(params, opts) {
    const handler = (await import("../../../../llm/prompts")).buildPrompt;
    registerTestHandler({
        apiRoute: { service: "llm", name: "buildPrompt", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "buildPrompt", params, opts);
}

export async function listTemplates(params, opts) {
    const handler = (await import("../../../../llm/prompts")).listTemplates;
    registerTestHandler({
        apiRoute: { service: "llm", name: "listTemplates", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "listTemplates", params, opts);
}

export async function getTemplate(params, opts) {
    const handler = (await import("../../../../llm/prompts")).getTemplate;
    registerTestHandler({
        apiRoute: { service: "llm", name: "getTemplate", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "getTemplate", params, opts);
}

export async function addTemplate(params, opts) {
    const handler = (await import("../../../../llm/prompts")).addTemplate;
    registerTestHandler({
        apiRoute: { service: "llm", name: "addTemplate", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "addTemplate", params, opts);
}

export async function removeTemplate(params, opts) {
    const handler = (await import("../../../../llm/prompts")).removeTemplate;
    registerTestHandler({
        apiRoute: { service: "llm", name: "removeTemplate", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "removeTemplate", params, opts);
}

export async function validateTemplateEndpoint(params, opts) {
    const handler = (await import("../../../../llm/prompts")).validateTemplateEndpoint;
    registerTestHandler({
        apiRoute: { service: "llm", name: "validateTemplateEndpoint", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: llm_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("llm", "validateTemplateEndpoint", params, opts);
}

