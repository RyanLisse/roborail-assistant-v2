import { registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";
import { Worker, isMainThread } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { availableParallelism } from "node:os";

import { createProcessingStatus as createProcessingStatusImpl0 } from "../../../../../upload/status";
import { updateProcessingStatus as updateProcessingStatusImpl1 } from "../../../../../upload/status";
import { getProcessingStatus as getProcessingStatusImpl2 } from "../../../../../upload/status";
import { queryProcessingStatuses as queryProcessingStatusesImpl3 } from "../../../../../upload/status";
import { retryProcessingFromStage as retryProcessingFromStageImpl4 } from "../../../../../upload/status";
import { cancelProcessing as cancelProcessingImpl5 } from "../../../../../upload/status";
import { getProcessingMetrics as getProcessingMetricsImpl6 } from "../../../../../upload/status";
import { uploadFile as uploadFileImpl7 } from "../../../../../upload/upload";
import { getUploadStatus as getUploadStatusImpl8 } from "../../../../../upload/upload";
import { downloadFile as downloadFileImpl9 } from "../../../../../upload/upload";
import { deleteFile as deleteFileImpl10 } from "../../../../../upload/upload";
import { fileExists as fileExistsImpl11 } from "../../../../../upload/upload";
import { getFileMetadata as getFileMetadataImpl12 } from "../../../../../upload/upload";
import * as upload_service from "../../../../../upload/encore.service";

const handlers: Handler[] = [
    {
        apiRoute: {
            service:           "upload",
            name:              "createProcessingStatus",
            handler:           createProcessingStatusImpl0,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "updateProcessingStatus",
            handler:           updateProcessingStatusImpl1,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "getProcessingStatus",
            handler:           getProcessingStatusImpl2,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "queryProcessingStatuses",
            handler:           queryProcessingStatusesImpl3,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "retryProcessingFromStage",
            handler:           retryProcessingFromStageImpl4,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "cancelProcessing",
            handler:           cancelProcessingImpl5,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "getProcessingMetrics",
            handler:           getProcessingMetricsImpl6,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "uploadFile",
            handler:           uploadFileImpl7,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "getUploadStatus",
            handler:           getUploadStatusImpl8,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "downloadFile",
            handler:           downloadFileImpl9,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "deleteFile",
            handler:           deleteFileImpl10,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "fileExists",
            handler:           fileExistsImpl11,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "getFileMetadata",
            handler:           getFileMetadataImpl12,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
];

registerHandlers(handlers);

await run(import.meta.url);
