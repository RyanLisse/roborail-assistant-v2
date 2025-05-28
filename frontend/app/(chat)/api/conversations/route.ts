import { backendClient } from "@/lib/api/backend-client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 30;

// List conversations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || undefined;

    const result = await backendClient.listConversations(
      "anonymous", // Since auth is removed
      page,
      pageSize,
      search
    );

    // Convert to frontend format
    const conversations = result.conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      visibility: "private" as const,
      messageCount: conv.messageCount || 0,
    }));

    return NextResponse.json({
      conversations,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error("List conversations error:", error);
    return NextResponse.json(
      { 
        error: "Failed to list conversations", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// Create new conversation (handled automatically by chat endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, firstMessage } = body;

    // For now, we'll just return a placeholder response
    // The actual conversation creation happens when the first message is sent
    return NextResponse.json({
      message: "Conversation will be created when first message is sent",
      suggestion: "Use the chat API to send the first message",
    });

  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { 
        error: "Failed to create conversation", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}