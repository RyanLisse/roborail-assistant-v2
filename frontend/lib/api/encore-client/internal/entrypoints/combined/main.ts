import { registerGateways, registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";

import { sendMessage as chat_sendMessageImpl0 } from "../../../../chat/chat";
import { getConversationBasic as chat_getConversationBasicImpl1 } from "../../../../chat/chat";
import { listConversationsBasic as chat_listConversationsBasicImpl2 } from "../../../../chat/chat";
import { deleteConversationBasic as chat_deleteConversationBasicImpl3 } from "../../../../chat/chat";
import { getMessages as chat_getMessagesImpl4 } from "../../../../chat/chat";
import { streamMessage as chat_streamMessageImpl5 } from "../../../../chat/chat";
import { chatHealth as chat_chatHealthImpl6 } from "../../../../chat/chat";
import { createConversation as chat_createConversationImpl7 } from "../../../../chat/conversation-management";
import { getConversation as chat_getConversationImpl8 } from "../../../../chat/conversation-management";
import { listConversations as chat_listConversationsImpl9 } from "../../../../chat/conversation-management";
import { addMessage as chat_addMessageImpl10 } from "../../../../chat/conversation-management";
import { saveConversationDraft as chat_saveConversationDraftImpl11 } from "../../../../chat/conversation-management";
import { updateConversationTitle as chat_updateConversationTitleImpl12 } from "../../../../chat/conversation-management";
import { deleteConversation as chat_deleteConversationImpl13 } from "../../../../chat/conversation-management";
import { getConversationHistory as chat_getConversationHistoryImpl14 } from "../../../../chat/conversation-management";
import { getPrunedHistory as chat_getPrunedHistoryImpl15 } from "../../../../chat/conversation-management";
import { analyzeConversation as chat_analyzeConversationImpl16 } from "../../../../chat/conversation-management";
import { manageConversationRAGContext as chat_manageConversationRAGContextImpl17 } from "../../../../chat/conversation-management";
import { saveDraft as chat_saveDraftImpl18 } from "../../../../chat/draft-autosave";
import { getDraft as chat_getDraftImpl19 } from "../../../../chat/draft-autosave";
import { deleteDraft as chat_deleteDraftImpl20 } from "../../../../chat/draft-autosave";
import { listDrafts as chat_listDraftsImpl21 } from "../../../../chat/draft-autosave";
import { bulkDraftOperation as chat_bulkDraftOperationImpl22 } from "../../../../chat/draft-autosave";
import { autoSaveDraft as chat_autoSaveDraftImpl23 } from "../../../../chat/draft-autosave";
import { restoreDraft as chat_restoreDraftImpl24 } from "../../../../chat/draft-autosave";
import { draftHealth as chat_draftHealthImpl25 } from "../../../../chat/draft-autosave";
import { processRAGQuery as chat_processRAGQueryImpl26 } from "../../../../chat/rag-orchestration";
import { ragHealth as chat_ragHealthImpl27 } from "../../../../chat/rag-orchestration";
import { getDocuments as docmgmt_getDocumentsImpl28 } from "../../../../docmgmt/documents";
import { getDocument as docmgmt_getDocumentImpl29 } from "../../../../docmgmt/documents";
import { updateDocument as docmgmt_updateDocumentImpl30 } from "../../../../docmgmt/documents";
import { deleteDocument as docmgmt_deleteDocumentImpl31 } from "../../../../docmgmt/documents";
import { getDocumentChunks as docmgmt_getDocumentChunksImpl32 } from "../../../../docmgmt/documents";
import { getDocumentStats as docmgmt_getDocumentStatsImpl33 } from "../../../../docmgmt/documents";
import { updateProcessingStatus as docmgmt_updateProcessingStatusImpl34 } from "../../../../docmgmt/documents";
import { createCollection as docmgmt_createCollectionImpl35 } from "../../../../docmgmt/organization";
import { getCollections as docmgmt_getCollectionsImpl36 } from "../../../../docmgmt/organization";
import { getCollection as docmgmt_getCollectionImpl37 } from "../../../../docmgmt/organization";
import { updateCollection as docmgmt_updateCollectionImpl38 } from "../../../../docmgmt/organization";
import { deleteCollection as docmgmt_deleteCollectionImpl39 } from "../../../../docmgmt/organization";
import { addDocumentToCollection as docmgmt_addDocumentToCollectionImpl40 } from "../../../../docmgmt/organization";
import { removeDocumentFromCollection as docmgmt_removeDocumentFromCollectionImpl41 } from "../../../../docmgmt/organization";
import { getCollectionDocuments as docmgmt_getCollectionDocumentsImpl42 } from "../../../../docmgmt/organization";
import { getPopularTags as docmgmt_getPopularTagsImpl43 } from "../../../../docmgmt/organization";
import { addTagToDocument as docmgmt_addTagToDocumentImpl44 } from "../../../../docmgmt/organization";
import { removeTagFromDocument as docmgmt_removeTagFromDocumentImpl45 } from "../../../../docmgmt/organization";
import { getDocumentsByTag as docmgmt_getDocumentsByTagImpl46 } from "../../../../docmgmt/organization";
import { createSavedFilter as docmgmt_createSavedFilterImpl47 } from "../../../../docmgmt/organization";
import { getSavedFilters as docmgmt_getSavedFiltersImpl48 } from "../../../../docmgmt/organization";
import { applySavedFilter as docmgmt_applySavedFilterImpl49 } from "../../../../docmgmt/organization";
import { getOrganizationRecommendations as docmgmt_getOrganizationRecommendationsImpl50 } from "../../../../docmgmt/organization";
import { processDocument as docprocessing_processDocumentImpl51 } from "../../../../docprocessing/processing";
import { getProcessingStatus as docprocessing_getProcessingStatusImpl52 } from "../../../../docprocessing/processing";
import { reprocessDocument as docprocessing_reprocessDocumentImpl53 } from "../../../../docprocessing/processing";
import { getMetrics as monitoring_getMetricsImpl54 } from "../../../../lib/monitoring/encore.service";
import { healthCheck as monitoring_healthCheckImpl55 } from "../../../../lib/monitoring/encore.service";
import { recordPerformance as monitoring_recordPerformanceImpl56 } from "../../../../lib/monitoring/encore.service";
import { resetMetrics as monitoring_resetMetricsImpl57 } from "../../../../lib/monitoring/encore.service";
import { getCacheStats as monitoring_getCacheStatsImpl58 } from "../../../../lib/monitoring/encore.service";
import { getSystemOverview as monitoring_getSystemOverviewImpl59 } from "../../../../lib/monitoring/encore.service";
import { parseCitations as llm_parseCitationsImpl60 } from "../../../../llm/citations";
import { validateCitationsEndpoint as llm_validateCitationsEndpointImpl61 } from "../../../../llm/citations";
import { generateFollowUp as llm_generateFollowUpImpl62 } from "../../../../llm/citations";
import { formatCitations as llm_formatCitationsImpl63 } from "../../../../llm/citations";
import { extractCitedContent as llm_extractCitedContentImpl64 } from "../../../../llm/citations";
import { generate as llm_generateImpl65 } from "../../../../llm/llm";
import { generateRAG as llm_generateRAGImpl66 } from "../../../../llm/llm";
import { health as llm_healthImpl67 } from "../../../../llm/llm";
import { buildPrompt as llm_buildPromptImpl68 } from "../../../../llm/prompts";
import { listTemplates as llm_listTemplatesImpl69 } from "../../../../llm/prompts";
import { getTemplate as llm_getTemplateImpl70 } from "../../../../llm/prompts";
import { addTemplate as llm_addTemplateImpl71 } from "../../../../llm/prompts";
import { removeTemplate as llm_removeTemplateImpl72 } from "../../../../llm/prompts";
import { validateTemplateEndpoint as llm_validateTemplateEndpointImpl73 } from "../../../../llm/prompts";
import { hybridSearch as search_hybridSearchImpl74 } from "../../../../search/search";
import { vectorSearch as search_vectorSearchImpl75 } from "../../../../search/search";
import { fullTextSearch as search_fullTextSearchImpl76 } from "../../../../search/search";
import { enhancedSearch as search_enhancedSearchImpl77 } from "../../../../search/search";
import { createProcessingStatus as upload_createProcessingStatusImpl78 } from "../../../../upload/status";
import { updateProcessingStatus as upload_updateProcessingStatusImpl79 } from "../../../../upload/status";
import { getProcessingStatus as upload_getProcessingStatusImpl80 } from "../../../../upload/status";
import { queryProcessingStatuses as upload_queryProcessingStatusesImpl81 } from "../../../../upload/status";
import { retryProcessingFromStage as upload_retryProcessingFromStageImpl82 } from "../../../../upload/status";
import { cancelProcessing as upload_cancelProcessingImpl83 } from "../../../../upload/status";
import { getProcessingMetrics as upload_getProcessingMetricsImpl84 } from "../../../../upload/status";
import { uploadFile as upload_uploadFileImpl85 } from "../../../../upload/upload";
import { getUploadStatus as upload_getUploadStatusImpl86 } from "../../../../upload/upload";
import { downloadFile as upload_downloadFileImpl87 } from "../../../../upload/upload";
import { deleteFile as upload_deleteFileImpl88 } from "../../../../upload/upload";
import { fileExists as upload_fileExistsImpl89 } from "../../../../upload/upload";
import { getFileMetadata as upload_getFileMetadataImpl90 } from "../../../../upload/upload";
import * as monitoring_service from "../../../../lib/monitoring/encore.service";
import * as docmgmt_service from "../../../../docmgmt/encore.service";
import * as docprocessing_service from "../../../../docprocessing/encore.service";
import * as chat_service from "../../../../chat/encore.service";
import * as upload_service from "../../../../upload/encore.service";
import * as llm_service from "../../../../llm/encore.service";
import * as search_service from "../../../../search/encore.service";

const gateways: any[] = [
];

const handlers: Handler[] = [
    {
        apiRoute: {
            service:           "chat",
            name:              "sendMessage",
            handler:           chat_sendMessageImpl0,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "getConversationBasic",
            handler:           chat_getConversationBasicImpl1,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "listConversationsBasic",
            handler:           chat_listConversationsBasicImpl2,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "deleteConversationBasic",
            handler:           chat_deleteConversationBasicImpl3,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "getMessages",
            handler:           chat_getMessagesImpl4,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "streamMessage",
            handler:           chat_streamMessageImpl5,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "chatHealth",
            handler:           chat_chatHealthImpl6,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "createConversation",
            handler:           chat_createConversationImpl7,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "getConversation",
            handler:           chat_getConversationImpl8,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "listConversations",
            handler:           chat_listConversationsImpl9,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "addMessage",
            handler:           chat_addMessageImpl10,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "saveConversationDraft",
            handler:           chat_saveConversationDraftImpl11,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "updateConversationTitle",
            handler:           chat_updateConversationTitleImpl12,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "deleteConversation",
            handler:           chat_deleteConversationImpl13,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "getConversationHistory",
            handler:           chat_getConversationHistoryImpl14,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "getPrunedHistory",
            handler:           chat_getPrunedHistoryImpl15,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "analyzeConversation",
            handler:           chat_analyzeConversationImpl16,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "manageConversationRAGContext",
            handler:           chat_manageConversationRAGContextImpl17,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "saveDraft",
            handler:           chat_saveDraftImpl18,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "getDraft",
            handler:           chat_getDraftImpl19,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "deleteDraft",
            handler:           chat_deleteDraftImpl20,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "listDrafts",
            handler:           chat_listDraftsImpl21,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "bulkDraftOperation",
            handler:           chat_bulkDraftOperationImpl22,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "autoSaveDraft",
            handler:           chat_autoSaveDraftImpl23,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "restoreDraft",
            handler:           chat_restoreDraftImpl24,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "draftHealth",
            handler:           chat_draftHealthImpl25,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "processRAGQuery",
            handler:           chat_processRAGQueryImpl26,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "chat",
            name:              "ragHealth",
            handler:           chat_ragHealthImpl27,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docmgmt",
            name:              "getDocuments",
            handler:           docmgmt_getDocumentsImpl28,
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
            handler:           docmgmt_getDocumentImpl29,
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
            handler:           docmgmt_updateDocumentImpl30,
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
            handler:           docmgmt_deleteDocumentImpl31,
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
            handler:           docmgmt_getDocumentChunksImpl32,
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
            handler:           docmgmt_getDocumentStatsImpl33,
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
            handler:           docmgmt_updateProcessingStatusImpl34,
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
            handler:           docmgmt_createCollectionImpl35,
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
            handler:           docmgmt_getCollectionsImpl36,
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
            handler:           docmgmt_getCollectionImpl37,
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
            handler:           docmgmt_updateCollectionImpl38,
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
            handler:           docmgmt_deleteCollectionImpl39,
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
            handler:           docmgmt_addDocumentToCollectionImpl40,
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
            handler:           docmgmt_removeDocumentFromCollectionImpl41,
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
            handler:           docmgmt_getCollectionDocumentsImpl42,
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
            handler:           docmgmt_getPopularTagsImpl43,
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
            handler:           docmgmt_addTagToDocumentImpl44,
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
            handler:           docmgmt_removeTagFromDocumentImpl45,
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
            handler:           docmgmt_getDocumentsByTagImpl46,
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
            handler:           docmgmt_createSavedFilterImpl47,
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
            handler:           docmgmt_getSavedFiltersImpl48,
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
            handler:           docmgmt_applySavedFilterImpl49,
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
            handler:           docmgmt_getOrganizationRecommendationsImpl50,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docmgmt_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "docprocessing",
            name:              "processDocument",
            handler:           docprocessing_processDocumentImpl51,
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
            handler:           docprocessing_getProcessingStatusImpl52,
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
            handler:           docprocessing_reprocessDocumentImpl53,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: docprocessing_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "monitoring",
            name:              "getMetrics",
            handler:           monitoring_getMetricsImpl54,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: monitoring_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "monitoring",
            name:              "healthCheck",
            handler:           monitoring_healthCheckImpl55,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: monitoring_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "monitoring",
            name:              "recordPerformance",
            handler:           monitoring_recordPerformanceImpl56,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: monitoring_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "monitoring",
            name:              "resetMetrics",
            handler:           monitoring_resetMetricsImpl57,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: monitoring_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "monitoring",
            name:              "getCacheStats",
            handler:           monitoring_getCacheStatsImpl58,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: monitoring_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "monitoring",
            name:              "getSystemOverview",
            handler:           monitoring_getSystemOverviewImpl59,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: monitoring_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "llm",
            name:              "parseCitations",
            handler:           llm_parseCitationsImpl60,
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
            handler:           llm_validateCitationsEndpointImpl61,
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
            handler:           llm_generateFollowUpImpl62,
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
            handler:           llm_formatCitationsImpl63,
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
            handler:           llm_extractCitedContentImpl64,
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
            handler:           llm_generateImpl65,
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
            handler:           llm_generateRAGImpl66,
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
            handler:           llm_healthImpl67,
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
            handler:           llm_buildPromptImpl68,
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
            handler:           llm_listTemplatesImpl69,
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
            handler:           llm_getTemplateImpl70,
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
            handler:           llm_addTemplateImpl71,
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
            handler:           llm_removeTemplateImpl72,
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
            handler:           llm_validateTemplateEndpointImpl73,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: llm_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "search",
            name:              "hybridSearch",
            handler:           search_hybridSearchImpl74,
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
            handler:           search_vectorSearchImpl75,
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
            handler:           search_fullTextSearchImpl76,
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
            handler:           search_enhancedSearchImpl77,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: search_service.default.cfg.middlewares || [],
    },
    {
        apiRoute: {
            service:           "upload",
            name:              "createProcessingStatus",
            handler:           upload_createProcessingStatusImpl78,
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
            handler:           upload_updateProcessingStatusImpl79,
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
            handler:           upload_getProcessingStatusImpl80,
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
            handler:           upload_queryProcessingStatusesImpl81,
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
            handler:           upload_retryProcessingFromStageImpl82,
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
            handler:           upload_cancelProcessingImpl83,
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
            handler:           upload_getProcessingMetricsImpl84,
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
            handler:           upload_uploadFileImpl85,
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
            handler:           upload_getUploadStatusImpl86,
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
            handler:           upload_downloadFileImpl87,
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
            handler:           upload_deleteFileImpl88,
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
            handler:           upload_fileExistsImpl89,
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
            handler:           upload_getFileMetadataImpl90,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: upload_service.default.cfg.middlewares || [],
    },
];

registerGateways(gateways);
registerHandlers(handlers);

await run(import.meta.url);
