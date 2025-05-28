import { registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";
import { Worker, isMainThread } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { availableParallelism } from "node:os";

import { parseCitations as parseCitationsImpl0 } from "../../../../../llm/citations";
import { validateCitationsEndpoint as validateCitationsEndpointImpl1 } from "../../../../../llm/citations";
import { generateFollowUp as generateFollowUpImpl2 } from "../../../../../llm/citations";
import { formatCitations as formatCitationsImpl3 } from "../../../../../llm/citations";
import { extractCitedContent as extractCitedContentImpl4 } from "../../../../../llm/citations";
import { generate as generateImpl5 } from "../../../../../llm/llm";
import { generateRAG as generateRAGImpl6 } from "../../../../../llm/llm";
import { health as healthImpl7 } from "../../../../../llm/llm";
import { buildPrompt as buildPromptImpl8 } from "../../../../../llm/prompts";
import { listTemplates as listTemplatesImpl9 } from "../../../../../llm/prompts";
import { getTemplate as getTemplateImpl10 } from "../../../../../llm/prompts";
import { addTemplate as addTemplateImpl11 } from "../../../../../llm/prompts";
import { removeTemplate as removeTemplateImpl12 } from "../../../../../llm/prompts";
import { validateTemplateEndpoint as validateTemplateEndpointImpl13 } from "../../../../../llm/prompts";
import * as llm_service from "../../../../../llm/encore.service";

const handlers: Handler[] = [
    {
        apiRoute: {
            service:           "llm",
            name:              "parseCitations",
            handler:           parseCitationsImpl0,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "validateCitationsEndpoint",
            handler:           validateCitationsEndpointImpl1,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "generateFollowUp",
            handler:           generateFollowUpImpl2,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "formatCitations",
            handler:           formatCitationsImpl3,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "extractCitedContent",
            handler:           extractCitedContentImpl4,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "generate",
            handler:           generateImpl5,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "generateRAG",
            handler:           generateRAGImpl6,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "health",
            handler:           healthImpl7,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "buildPrompt",
            handler:           buildPromptImpl8,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "listTemplates",
            handler:           listTemplatesImpl9,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "getTemplate",
            handler:           getTemplateImpl10,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "addTemplate",
            handler:           addTemplateImpl11,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "removeTemplate",
            handler:           removeTemplateImpl12,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "validateTemplateEndpoint",
            handler:           validateTemplateEndpointImpl13,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
];

registerHandlers(handlers);

await run(import.meta.url);
