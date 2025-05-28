import { registerHandlers, run, type Handler } from "encore.dev/internal/codegen/appinit";
import { Worker, isMainThread } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { availableParallelism } from "node:os";

import { sendMessage as sendMessageImpl0 } from "../../../../../chat/chat";
import { getConversationBasic as getConversationBasicImpl1 } from "../../../../../chat/chat";
import { listConversationsBasic as listConversationsBasicImpl2 } from "../../../../../chat/chat";
import { deleteConversationBasic as deleteConversationBasicImpl3 } from "../../../../../chat/chat";
import { getMessages as getMessagesImpl4 } from "../../../../../chat/chat";
import { streamMessage as streamMessageImpl5 } from "../../../../../chat/chat";
import { chatHealth as chatHealthImpl6 } from "../../../../../chat/chat";
import { createConversation as createConversationImpl7 } from "../../../../../chat/conversation-management";
import { getConversation as getConversationImpl8 } from "../../../../../chat/conversation-management";
import { listConversations as listConversationsImpl9 } from "../../../../../chat/conversation-management";
import { addMessage as addMessageImpl10 } from "../../../../../chat/conversation-management";
import { saveConversationDraft as saveConversationDraftImpl11 } from "../../../../../chat/conversation-management";
import { updateConversationTitle as updateConversationTitleImpl12 } from "../../../../../chat/conversation-management";
import { deleteConversation as deleteConversationImpl13 } from "../../../../../chat/conversation-management";
import { getConversationHistory as getConversationHistoryImpl14 } from "../../../../../chat/conversation-management";
import { getPrunedHistory as getPrunedHistoryImpl15 } from "../../../../../chat/conversation-management";
import { analyzeConversation as analyzeConversationImpl16 } from "../../../../../chat/conversation-management";
import { manageConversationRAGContext as manageConversationRAGContextImpl17 } from "../../../../../chat/conversation-management";
import { saveDraft as saveDraftImpl18 } from "../../../../../chat/draft-autosave";
import { getDraft as getDraftImpl19 } from "../../../../../chat/draft-autosave";
import { deleteDraft as deleteDraftImpl20 } from "../../../../../chat/draft-autosave";
import { listDrafts as listDraftsImpl21 } from "../../../../../chat/draft-autosave";
import { bulkDraftOperation as bulkDraftOperationImpl22 } from "../../../../../chat/draft-autosave";
import { autoSaveDraft as autoSaveDraftImpl23 } from "../../../../../chat/draft-autosave";
import { restoreDraft as restoreDraftImpl24 } from "../../../../../chat/draft-autosave";
import { draftHealth as draftHealthImpl25 } from "../../../../../chat/draft-autosave";
import { processRAGQuery as processRAGQueryImpl26 } from "../../../../../chat/rag-orchestration";
import { ragHealth as ragHealthImpl27 } from "../../../../../chat/rag-orchestration";
import * as chat_service from "../../../../../chat/encore.service";

const handlers: Handler[] = [
    {
        apiRoute: {
            service:           "chat",
            name:              "sendMessage",
            handler:           sendMessageImpl0,
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
            handler:           getConversationBasicImpl1,
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
            handler:           listConversationsBasicImpl2,
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
            handler:           deleteConversationBasicImpl3,
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
            handler:           getMessagesImpl4,
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
            handler:           streamMessageImpl5,
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
            handler:           chatHealthImpl6,
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
            handler:           createConversationImpl7,
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
            handler:           getConversationImpl8,
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
            handler:           listConversationsImpl9,
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
            handler:           addMessageImpl10,
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
            handler:           saveConversationDraftImpl11,
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
            handler:           updateConversationTitleImpl12,
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
            handler:           deleteConversationImpl13,
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
            handler:           getConversationHistoryImpl14,
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
            handler:           getPrunedHistoryImpl15,
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
            handler:           analyzeConversationImpl16,
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
            handler:           manageConversationRAGContextImpl17,
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
            handler:           saveDraftImpl18,
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
            handler:           getDraftImpl19,
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
            handler:           deleteDraftImpl20,
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
            handler:           listDraftsImpl21,
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
            handler:           bulkDraftOperationImpl22,
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
            handler:           autoSaveDraftImpl23,
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
            handler:           restoreDraftImpl24,
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
            handler:           draftHealthImpl25,
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
            handler:           processRAGQueryImpl26,
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
            handler:           ragHealthImpl27,
            raw:               false,
            streamingRequest:  false,
            streamingResponse: false,
        },
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
        middlewares: chat_service.default.cfg.middlewares || [],
    },
];

registerHandlers(handlers);

await run(import.meta.url);
