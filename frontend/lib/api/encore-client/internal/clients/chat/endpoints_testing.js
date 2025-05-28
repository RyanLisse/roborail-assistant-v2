import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";
import { registerTestHandler } from "encore.dev/internal/codegen/appinit";

import * as chat_service from "../../../../chat/encore.service";

export async function sendMessage(params, opts) {
    const handler = (await import("../../../../chat/chat")).sendMessage;
    registerTestHandler({
        apiRoute: { service: "chat", name: "sendMessage", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "sendMessage", params, opts);
}

export async function getConversationBasic(params, opts) {
    const handler = (await import("../../../../chat/chat")).getConversationBasic;
    registerTestHandler({
        apiRoute: { service: "chat", name: "getConversationBasic", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "getConversationBasic", params, opts);
}

export async function listConversationsBasic(params, opts) {
    const handler = (await import("../../../../chat/chat")).listConversationsBasic;
    registerTestHandler({
        apiRoute: { service: "chat", name: "listConversationsBasic", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "listConversationsBasic", params, opts);
}

export async function deleteConversationBasic(params, opts) {
    const handler = (await import("../../../../chat/chat")).deleteConversationBasic;
    registerTestHandler({
        apiRoute: { service: "chat", name: "deleteConversationBasic", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "deleteConversationBasic", params, opts);
}

export async function getMessages(params, opts) {
    const handler = (await import("../../../../chat/chat")).getMessages;
    registerTestHandler({
        apiRoute: { service: "chat", name: "getMessages", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "getMessages", params, opts);
}

export async function streamMessage(params, opts) {
    const handler = (await import("../../../../chat/chat")).streamMessage;
    registerTestHandler({
        apiRoute: { service: "chat", name: "streamMessage", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "streamMessage", params, opts);
}

export async function chatHealth(params, opts) {
    const handler = (await import("../../../../chat/chat")).chatHealth;
    registerTestHandler({
        apiRoute: { service: "chat", name: "chatHealth", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "chatHealth", params, opts);
}

export async function createConversation(params, opts) {
    const handler = (await import("../../../../chat/conversation-management")).createConversation;
    registerTestHandler({
        apiRoute: { service: "chat", name: "createConversation", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "createConversation", params, opts);
}

export async function getConversation(params, opts) {
    const handler = (await import("../../../../chat/conversation-management")).getConversation;
    registerTestHandler({
        apiRoute: { service: "chat", name: "getConversation", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "getConversation", params, opts);
}

export async function listConversations(params, opts) {
    const handler = (await import("../../../../chat/conversation-management")).listConversations;
    registerTestHandler({
        apiRoute: { service: "chat", name: "listConversations", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "listConversations", params, opts);
}

export async function addMessage(params, opts) {
    const handler = (await import("../../../../chat/conversation-management")).addMessage;
    registerTestHandler({
        apiRoute: { service: "chat", name: "addMessage", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "addMessage", params, opts);
}

export async function saveConversationDraft(params, opts) {
    const handler = (await import("../../../../chat/conversation-management")).saveConversationDraft;
    registerTestHandler({
        apiRoute: { service: "chat", name: "saveConversationDraft", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "saveConversationDraft", params, opts);
}

export async function updateConversationTitle(params, opts) {
    const handler = (await import("../../../../chat/conversation-management")).updateConversationTitle;
    registerTestHandler({
        apiRoute: { service: "chat", name: "updateConversationTitle", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "updateConversationTitle", params, opts);
}

export async function deleteConversation(params, opts) {
    const handler = (await import("../../../../chat/conversation-management")).deleteConversation;
    registerTestHandler({
        apiRoute: { service: "chat", name: "deleteConversation", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "deleteConversation", params, opts);
}

export async function getConversationHistory(params, opts) {
    const handler = (await import("../../../../chat/conversation-management")).getConversationHistory;
    registerTestHandler({
        apiRoute: { service: "chat", name: "getConversationHistory", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "getConversationHistory", params, opts);
}

export async function getPrunedHistory(params, opts) {
    const handler = (await import("../../../../chat/conversation-management")).getPrunedHistory;
    registerTestHandler({
        apiRoute: { service: "chat", name: "getPrunedHistory", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "getPrunedHistory", params, opts);
}

export async function analyzeConversation(params, opts) {
    const handler = (await import("../../../../chat/conversation-management")).analyzeConversation;
    registerTestHandler({
        apiRoute: { service: "chat", name: "analyzeConversation", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "analyzeConversation", params, opts);
}

export async function manageConversationRAGContext(params, opts) {
    const handler = (await import("../../../../chat/conversation-management")).manageConversationRAGContext;
    registerTestHandler({
        apiRoute: { service: "chat", name: "manageConversationRAGContext", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "manageConversationRAGContext", params, opts);
}

export async function saveDraft(params, opts) {
    const handler = (await import("../../../../chat/draft-autosave")).saveDraft;
    registerTestHandler({
        apiRoute: { service: "chat", name: "saveDraft", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "saveDraft", params, opts);
}

export async function getDraft(params, opts) {
    const handler = (await import("../../../../chat/draft-autosave")).getDraft;
    registerTestHandler({
        apiRoute: { service: "chat", name: "getDraft", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "getDraft", params, opts);
}

export async function deleteDraft(params, opts) {
    const handler = (await import("../../../../chat/draft-autosave")).deleteDraft;
    registerTestHandler({
        apiRoute: { service: "chat", name: "deleteDraft", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "deleteDraft", params, opts);
}

export async function listDrafts(params, opts) {
    const handler = (await import("../../../../chat/draft-autosave")).listDrafts;
    registerTestHandler({
        apiRoute: { service: "chat", name: "listDrafts", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "listDrafts", params, opts);
}

export async function bulkDraftOperation(params, opts) {
    const handler = (await import("../../../../chat/draft-autosave")).bulkDraftOperation;
    registerTestHandler({
        apiRoute: { service: "chat", name: "bulkDraftOperation", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "bulkDraftOperation", params, opts);
}

export async function autoSaveDraft(params, opts) {
    const handler = (await import("../../../../chat/draft-autosave")).autoSaveDraft;
    registerTestHandler({
        apiRoute: { service: "chat", name: "autoSaveDraft", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "autoSaveDraft", params, opts);
}

export async function restoreDraft(params, opts) {
    const handler = (await import("../../../../chat/draft-autosave")).restoreDraft;
    registerTestHandler({
        apiRoute: { service: "chat", name: "restoreDraft", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "restoreDraft", params, opts);
}

export async function draftHealth(params, opts) {
    const handler = (await import("../../../../chat/draft-autosave")).draftHealth;
    registerTestHandler({
        apiRoute: { service: "chat", name: "draftHealth", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "draftHealth", params, opts);
}

export async function processRAGQuery(params, opts) {
    const handler = (await import("../../../../chat/rag-orchestration")).processRAGQuery;
    registerTestHandler({
        apiRoute: { service: "chat", name: "processRAGQuery", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "processRAGQuery", params, opts);
}

export async function ragHealth(params, opts) {
    const handler = (await import("../../../../chat/rag-orchestration")).ragHealth;
    registerTestHandler({
        apiRoute: { service: "chat", name: "ragHealth", raw: false, handler, streamingRequest: false, streamingResponse: false },
        middlewares: chat_service.default.cfg.middlewares || [],
        endpointOptions: {"expose":true,"auth":false,"isRaw":false,"isStream":false,"tags":[]},
    });

    return apiCall("chat", "ragHealth", params, opts);
}

