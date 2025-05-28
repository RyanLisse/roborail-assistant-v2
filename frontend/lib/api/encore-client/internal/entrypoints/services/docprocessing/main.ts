import { registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";
import { Worker, isMainThread } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { availableParallelism } from "node:os";

import { processDocument as processDocumentImpl0 } from "../../../../../docprocessing/processing";
import { getProcessingStatus as getProcessingStatusImpl1 } from "../../../../../docprocessing/processing";
import { reprocessDocument as reprocessDocumentImpl2 } from "../../../../../docprocessing/processing";
import * as docprocessing_service from "../../../../../docprocessing/encore.service";

const handlers: Handler[] = [
    {
        apiRoute: {
            service:           "docprocessing",
            name:              "processDocument",
            handler:           processDocumentImpl0,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docprocessing_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docprocessing",
            name:              "getProcessingStatus",
            handler:           getProcessingStatusImpl1,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docprocessing_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docprocessing",
            name:              "reprocessDocument",
            handler:           reprocessDocumentImpl2,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docprocessing_service.default.cfg.middlewares || [],
    },
];

registerHandlers(handlers);

await run(import.meta.url);
