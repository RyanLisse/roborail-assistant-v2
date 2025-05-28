import { backendClient, type ChatRequest } from "@/lib/api/backend-client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

// Request schema
const ChatRequestSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
  responseMode: z.enum(["detailed", "concise", "technical", "conversational"]).default("detailed"),
  enableReranking: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest = ChatRequestSchema.parse(body);

    // Create backend request
    const backendRequest: ChatRequest = {
      message: validatedRequest.message,
      conversationId: validatedRequest.conversationId,
      userId: "anonymous", // Since auth is removed, use anonymous user
      responseMode: validatedRequest.responseMode,
      enableReranking: validatedRequest.enableReranking,
    };

    // Call backend RAG service
    const response = await backendClient.sendMessage(backendRequest);

    // Return response in format expected by frontend
    return NextResponse.json({
      id: response.messageId,
      conversationId: response.conversationId,
      role: "assistant",
      content: response.content,
      citations: response.citations,
      metadata: response.metadata,
      followUpQuestions: response.followUpQuestions,
      createdAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Chat RAG API error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const healthStatus = await backendClient.healthCheck();
    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error("Backend health check failed:", error);
    return NextResponse.json(
      { 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 503 }
    );
  }
}