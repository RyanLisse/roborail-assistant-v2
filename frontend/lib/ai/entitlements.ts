import type { ChatModel } from "./models";

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel["id"]>;
}

// Simplified entitlements for unauthenticated use
export const defaultEntitlements: Entitlements = {
  maxMessagesPerDay: 100,
  availableChatModelIds: ["chat-model", "chat-model-reasoning"],
};

// Export for compatibility with model selector
export const entitlementsByUserType = {
  guest: defaultEntitlements,
  default: defaultEntitlements,
};
