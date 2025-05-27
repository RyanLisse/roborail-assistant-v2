import { backendClient } from "@/lib/api/backend-client";
import { ChatSDKError } from "@/lib/errors";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const page = Math.ceil((Number.parseInt(searchParams.get("starting_after") || "0") + 1) / limit) || 1;
    const search = searchParams.get("search") || undefined;

    // Use backend API to get conversations
    const result = await backendClient.listConversations(
      "anonymous", // Since auth is removed
      page,
      limit,
      search
    );

    // Convert backend format to frontend chat history format
    const chats = result.conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      visibility: "private" as const,
      userId: "anonymous",
    }));

    // Format for infinite scroll pagination
    const hasMore = result.pagination.page < result.pagination.totalPages;

    return Response.json({
      chats,
      hasMore,
    });

  } catch (error) {
    console.error("History API error:", error);
    
    return new ChatSDKError(
      "bad_request:api",
      error instanceof Error ? error.message : "Failed to fetch chat history"
    ).toResponse();
  }
}
