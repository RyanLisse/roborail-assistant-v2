import { registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";
import { Worker, isMainThread } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { availableParallelism } from "node:os";

import { getDocuments as getDocumentsImpl0 } from "../../../../../docmgmt/documents";
import { getDocument as getDocumentImpl1 } from "../../../../../docmgmt/documents";
import { updateDocument as updateDocumentImpl2 } from "../../../../../docmgmt/documents";
import { deleteDocument as deleteDocumentImpl3 } from "../../../../../docmgmt/documents";
import { getDocumentChunks as getDocumentChunksImpl4 } from "../../../../../docmgmt/documents";
import { getDocumentStats as getDocumentStatsImpl5 } from "../../../../../docmgmt/documents";
import { updateProcessingStatus as updateProcessingStatusImpl6 } from "../../../../../docmgmt/documents";
import { createCollection as createCollectionImpl7 } from "../../../../../docmgmt/organization";
import { getCollections as getCollectionsImpl8 } from "../../../../../docmgmt/organization";
import { getCollection as getCollectionImpl9 } from "../../../../../docmgmt/organization";
import { updateCollection as updateCollectionImpl10 } from "../../../../../docmgmt/organization";
import { deleteCollection as deleteCollectionImpl11 } from "../../../../../docmgmt/organization";
import { addDocumentToCollection as addDocumentToCollectionImpl12 } from "../../../../../docmgmt/organization";
import { removeDocumentFromCollection as removeDocumentFromCollectionImpl13 } from "../../../../../docmgmt/organization";
import { getCollectionDocuments as getCollectionDocumentsImpl14 } from "../../../../../docmgmt/organization";
import { getPopularTags as getPopularTagsImpl15 } from "../../../../../docmgmt/organization";
import { addTagToDocument as addTagToDocumentImpl16 } from "../../../../../docmgmt/organization";
import { removeTagFromDocument as removeTagFromDocumentImpl17 } from "../../../../../docmgmt/organization";
import { getDocumentsByTag as getDocumentsByTagImpl18 } from "../../../../../docmgmt/organization";
import { createSavedFilter as createSavedFilterImpl19 } from "../../../../../docmgmt/organization";
import { getSavedFilters as getSavedFiltersImpl20 } from "../../../../../docmgmt/organization";
import { applySavedFilter as applySavedFilterImpl21 } from "../../../../../docmgmt/organization";
import { getOrganizationRecommendations as getOrganizationRecommendationsImpl22 } from "../../../../../docmgmt/organization";
import * as docmgmt_service from "../../../../../docmgmt/encore.service";

const handlers: Handler[] = [
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "getDocuments",
            handler:           getDocumentsImpl0,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "getDocument",
            handler:           getDocumentImpl1,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "updateDocument",
            handler:           updateDocumentImpl2,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "deleteDocument",
            handler:           deleteDocumentImpl3,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "getDocumentChunks",
            handler:           getDocumentChunksImpl4,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "getDocumentStats",
            handler:           getDocumentStatsImpl5,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "updateProcessingStatus",
            handler:           updateProcessingStatusImpl6,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":false,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "createCollection",
            handler:           createCollectionImpl7,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "getCollections",
            handler:           getCollectionsImpl8,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "getCollection",
            handler:           getCollectionImpl9,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "updateCollection",
            handler:           updateCollectionImpl10,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "deleteCollection",
            handler:           deleteCollectionImpl11,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "addDocumentToCollection",
            handler:           addDocumentToCollectionImpl12,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "removeDocumentFromCollection",
            handler:           removeDocumentFromCollectionImpl13,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "getCollectionDocuments",
            handler:           getCollectionDocumentsImpl14,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "getPopularTags",
            handler:           getPopularTagsImpl15,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "addTagToDocument",
            handler:           addTagToDocumentImpl16,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "removeTagFromDocument",
            handler:           removeTagFromDocumentImpl17,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "getDocumentsByTag",
            handler:           getDocumentsByTagImpl18,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "createSavedFilter",
            handler:           createSavedFilterImpl19,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "getSavedFilters",
            handler:           getSavedFiltersImpl20,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "applySavedFilter",
            handler:           applySavedFilterImpl21,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "getOrganizationRecommendations",
            handler:           getOrganizationRecommendationsImpl22,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
];

registerHandlers(handlers);

await run(import.meta.url);
