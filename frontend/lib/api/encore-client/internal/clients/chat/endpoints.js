import { apiCall, streamIn, streamOut, streamInOut } from "encore.dev/internal/codegen/api";

const TEST_ENDPOINTS = typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test"
    ? await import("./endpoints_testing.js")
    : null;

export async function sendMessage(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.sendMessage(params, opts);
    }

    return apiCall("chat", "sendMessage", params, opts);
}
export async function getConversationBasic(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getConversationBasic(params, opts);
    }

    return apiCall("chat", "getConversationBasic", params, opts);
}
export async function listConversationsBasic(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.listConversationsBasic(params, opts);
    }

    return apiCall("chat", "listConversationsBasic", params, opts);
}
export async function deleteConversationBasic(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.deleteConversationBasic(params, opts);
    }

    return apiCall("chat", "deleteConversationBasic", params, opts);
}
export async function getMessages(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getMessages(params, opts);
    }

    return apiCall("chat", "getMessages", params, opts);
}
export async function streamMessage(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.streamMessage(params, opts);
    }

    return apiCall("chat", "streamMessage", params, opts);
}
export async function chatHealth(opts) {
    const params = undefined;
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.chatHealth(params, opts);
    }

    return apiCall("chat", "chatHealth", params, opts);
}
export async function createConversation(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.createConversation(params, opts);
    }

    return apiCall("chat", "createConversation", params, opts);
}
export async function getConversation(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getConversation(params, opts);
    }

    return apiCall("chat", "getConversation", params, opts);
}
export async function listConversations(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.listConversations(params, opts);
    }

    return apiCall("chat", "listConversations", params, opts);
}
export async function addMessage(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.addMessage(params, opts);
    }

    return apiCall("chat", "addMessage", params, opts);
}
export async function saveConversationDraft(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.saveConversationDraft(params, opts);
    }

    return apiCall("chat", "saveConversationDraft", params, opts);
}
export async function updateConversationTitle(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.updateConversationTitle(params, opts);
    }

    return apiCall("chat", "updateConversationTitle", params, opts);
}
export async function deleteConversation(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.deleteConversation(params, opts);
    }

    return apiCall("chat", "deleteConversation", params, opts);
}
export async function getConversationHistory(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getConversationHistory(params, opts);
    }

    return apiCall("chat", "getConversationHistory", params, opts);
}
export async function getPrunedHistory(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getPrunedHistory(params, opts);
    }

    return apiCall("chat", "getPrunedHistory", params, opts);
}
export async function analyzeConversation(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.analyzeConversation(params, opts);
    }

    return apiCall("chat", "analyzeConversation", params, opts);
}
export async function manageConversationRAGContext(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.manageConversationRAGContext(params, opts);
    }

    return apiCall("chat", "manageConversationRAGContext", params, opts);
}
export async function saveDraft(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.saveDraft(params, opts);
    }

    return apiCall("chat", "saveDraft", params, opts);
}
export async function getDraft(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.getDraft(params, opts);
    }

    return apiCall("chat", "getDraft", params, opts);
}
export async function deleteDraft(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.deleteDraft(params, opts);
    }

    return apiCall("chat", "deleteDraft", params, opts);
}
export async function listDrafts(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.listDrafts(params, opts);
    }

    return apiCall("chat", "listDrafts", params, opts);
}
export async function bulkDraftOperation(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.bulkDraftOperation(params, opts);
    }

    return apiCall("chat", "bulkDraftOperation", params, opts);
}
export async function autoSaveDraft(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.autoSaveDraft(params, opts);
    }

    return apiCall("chat", "autoSaveDraft", params, opts);
}
export async function restoreDraft(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.restoreDraft(params, opts);
    }

    return apiCall("chat", "restoreDraft", params, opts);
}
export async function draftHealth(opts) {
    const params = undefined;
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.draftHealth(params, opts);
    }

    return apiCall("chat", "draftHealth", params, opts);
}
export async function processRAGQuery(params, opts) {
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.processRAGQuery(params, opts);
    }

    return apiCall("chat", "processRAGQuery", params, opts);
}
export async function ragHealth(opts) {
    const params = undefined;
    if (typeof ENCORE_DROP_TESTS === "undefined" && process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.ragHealth(params, opts);
    }

    return apiCall("chat", "ragHealth", params, opts);
}
