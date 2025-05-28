import { registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";
import { Worker, isMainThread } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { availableParallelism } from "node:os";

import { hybridSearch as hybridSearchImpl0 } from "../../../../../search/search";
import { vectorSearch as vectorSearchImpl1 } from "../../../../../search/search";
import { fullTextSearch as fullTextSearchImpl2 } from "../../../../../search/search";
import { enhancedSearch as enhancedSearchImpl3 } from "../../../../../search/search";
import * as search_service from "../../../../../search/encore.service";

const handlers: Handler[] = [
    {
        apiRoute: {
            service:           "search",
            name:              "hybridSearch",
            handler:           hybridSearchImpl0,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: search_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "search",
            name:              "vectorSearch",
            handler:           vectorSearchImpl1,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: search_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "search",
            name:              "fullTextSearch",
            handler:           fullTextSearchImpl2,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: search_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "search",
            name:              "enhancedSearch",
            handler:           enhancedSearchImpl3,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: search_service.default.cfg.middlewares || [],
    },
];

registerHandlers(handlers);

await run(import.meta.url);
