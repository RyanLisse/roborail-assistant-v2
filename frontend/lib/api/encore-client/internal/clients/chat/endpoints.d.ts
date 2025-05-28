import { CallOpts } from "encore.dev/api";

type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;
type WithCallOpts<T extends (...args: any) => any> = (
  ...args: [...Parameters<T>, opts?: CallOpts]
) => ReturnType<T>;

import { sendMessage as sendMessage_handler } from "../../../../chat/chat.js";
declare const sendMessage: WithCallOpts<typeof sendMessage_handler>;
export { sendMessage };

import { getConversationBasic as getConversationBasic_handler } from "../../../../chat/chat.js";
declare const getConversationBasic: WithCallOpts<typeof getConversationBasic_handler>;
export { getConversationBasic };

import { listConversationsBasic as listConversationsBasic_handler } from "../../../../chat/chat.js";
declare const listConversationsBasic: WithCallOpts<typeof listConversationsBasic_handler>;
export { listConversationsBasic };

import { deleteConversationBasic as deleteConversationBasic_handler } from "../../../../chat/chat.js";
declare const deleteConversationBasic: WithCallOpts<typeof deleteConversationBasic_handler>;
export { deleteConversationBasic };

import { getMessages as getMessages_handler } from "../../../../chat/chat.js";
declare const getMessages: WithCallOpts<typeof getMessages_handler>;
export { getMessages };

import { streamMessage as streamMessage_handler } from "../../../../chat/chat.js";
declare const streamMessage: WithCallOpts<typeof streamMessage_handler>;
export { streamMessage };

import { chatHealth as chatHealth_handler } from "../../../../chat/chat.js";
declare const chatHealth: WithCallOpts<typeof chatHealth_handler>;
export { chatHealth };

import { createConversation as createConversation_handler } from "../../../../chat/conversation-management.js";
declare const createConversation: WithCallOpts<typeof createConversation_handler>;
export { createConversation };

import { getConversation as getConversation_handler } from "../../../../chat/conversation-management.js";
declare const getConversation: WithCallOpts<typeof getConversation_handler>;
export { getConversation };

import { listConversations as listConversations_handler } from "../../../../chat/conversation-management.js";
declare const listConversations: WithCallOpts<typeof listConversations_handler>;
export { listConversations };

import { addMessage as addMessage_handler } from "../../../../chat/conversation-management.js";
declare const addMessage: WithCallOpts<typeof addMessage_handler>;
export { addMessage };

import { saveConversationDraft as saveConversationDraft_handler } from "../../../../chat/conversation-management.js";
declare const saveConversationDraft: WithCallOpts<typeof saveConversationDraft_handler>;
export { saveConversationDraft };

import { updateConversationTitle as updateConversationTitle_handler } from "../../../../chat/conversation-management.js";
declare const updateConversationTitle: WithCallOpts<typeof updateConversationTitle_handler>;
export { updateConversationTitle };

import { deleteConversation as deleteConversation_handler } from "../../../../chat/conversation-management.js";
declare const deleteConversation: WithCallOpts<typeof deleteConversation_handler>;
export { deleteConversation };

import { getConversationHistory as getConversationHistory_handler } from "../../../../chat/conversation-management.js";
declare const getConversationHistory: WithCallOpts<typeof getConversationHistory_handler>;
export { getConversationHistory };

import { getPrunedHistory as getPrunedHistory_handler } from "../../../../chat/conversation-management.js";
declare const getPrunedHistory: WithCallOpts<typeof getPrunedHistory_handler>;
export { getPrunedHistory };

import { analyzeConversation as analyzeConversation_handler } from "../../../../chat/conversation-management.js";
declare const analyzeConversation: WithCallOpts<typeof analyzeConversation_handler>;
export { analyzeConversation };

import { manageConversationRAGContext as manageConversationRAGContext_handler } from "../../../../chat/conversation-management.js";
declare const manageConversationRAGContext: WithCallOpts<typeof manageConversationRAGContext_handler>;
export { manageConversationRAGContext };

import { saveDraft as saveDraft_handler } from "../../../../chat/draft-autosave.js";
declare const saveDraft: WithCallOpts<typeof saveDraft_handler>;
export { saveDraft };

import { getDraft as getDraft_handler } from "../../../../chat/draft-autosave.js";
declare const getDraft: WithCallOpts<typeof getDraft_handler>;
export { getDraft };

import { deleteDraft as deleteDraft_handler } from "../../../../chat/draft-autosave.js";
declare const deleteDraft: WithCallOpts<typeof deleteDraft_handler>;
export { deleteDraft };

import { listDrafts as listDrafts_handler } from "../../../../chat/draft-autosave.js";
declare const listDrafts: WithCallOpts<typeof listDrafts_handler>;
export { listDrafts };

import { bulkDraftOperation as bulkDraftOperation_handler } from "../../../../chat/draft-autosave.js";
declare const bulkDraftOperation: WithCallOpts<typeof bulkDraftOperation_handler>;
export { bulkDraftOperation };

import { autoSaveDraft as autoSaveDraft_handler } from "../../../../chat/draft-autosave.js";
declare const autoSaveDraft: WithCallOpts<typeof autoSaveDraft_handler>;
export { autoSaveDraft };

import { restoreDraft as restoreDraft_handler } from "../../../../chat/draft-autosave.js";
declare const restoreDraft: WithCallOpts<typeof restoreDraft_handler>;
export { restoreDraft };

import { draftHealth as draftHealth_handler } from "../../../../chat/draft-autosave.js";
declare const draftHealth: WithCallOpts<typeof draftHealth_handler>;
export { draftHealth };

import { processRAGQuery as processRAGQuery_handler } from "../../../../chat/rag-orchestration.js";
declare const processRAGQuery: WithCallOpts<typeof processRAGQuery_handler>;
export { processRAGQuery };

import { ragHealth as ragHealth_handler } from "../../../../chat/rag-orchestration.js";
declare const ragHealth: WithCallOpts<typeof ragHealth_handler>;
export { ragHealth };


