import { backendClient } from "@/lib/api/backend-client";
import { type NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// Get conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    const conversation = await backendClient.getConversation(
      conversationId,
      "anonymous" // Since auth is removed
    );

    // Convert to frontend format
    const frontendConversation = {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      visibility: "private" as const,
      messages: conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        citations: msg.citations,
        // Convert citations to frontend format if needed
        attachments: [], // No attachments in our backend schema
      })),
    };

    return NextResponse.json(frontendConversation);

  } catch (error) {
    console.error("Get conversation error:", error);
    
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to get conversation", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    const result = await backendClient.deleteConversation(
      conversationId,
      "anonymous" // Since auth is removed
    );

    return NextResponse.json({ success: result.success });

  } catch (error) {
    console.error("Delete conversation error:", error);
    
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to delete conversation", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// Update conversation (e.g., title)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;
    const body = await request.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // For now, we'll return a placeholder since the backend API might not support title updates
    // In a full implementation, you'd call the backend update API
    return NextResponse.json({
      message: "Title update not implemented in backend yet",
      suggestion: "Consider implementing updateConversationTitle in backend API",
    });

  } catch (error) {
    console.error("Update conversation error:", error);
    return NextResponse.json(
      { 
        error: "Failed to update conversation", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}