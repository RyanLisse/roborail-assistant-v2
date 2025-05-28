import { searchKnowledgeBase } from "@/lib/api/backend-client";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 30;

const SearchRequestSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(10),
  enableReranking: z.boolean().default(true),
  threshold: z.number().min(0).max(1).default(0.5),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest = SearchRequestSchema.parse(body);

    const searchResults = await searchKnowledgeBase(
      validatedRequest.query,
      "anonymous", // Since auth is removed
      {
        limit: validatedRequest.limit,
        enableReranking: validatedRequest.enableReranking,
        threshold: validatedRequest.threshold,
      }
    );

    // Convert to frontend format
    const results = searchResults.results.map(result => ({
      id: result.id,
      content: result.content,
      documentId: result.documentID,
      score: result.score,
      filename: result.metadata.filename,
      pageNumber: result.metadata.pageNumber,
      chunkIndex: result.metadata.chunkIndex,
    }));

    return NextResponse.json({
      results,
      totalResults: searchResults.totalResults,
      searchTime: searchResults.searchTime,
      query: searchResults.query,
    });

  } catch (error) {
    console.error("Document search error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "Search failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// Health check for search functionality
export async function GET() {
  try {
    // Test search with a simple query
    const testResult = await searchKnowledgeBase(
      "test",
      "anonymous",
      { limit: 1, threshold: 0.9 } // High threshold to minimize results
    );

    return NextResponse.json({
      status: "healthy",
      searchService: "available",
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Search health check failed:", error);
    return NextResponse.json(
      { 
        status: "unhealthy", 
        searchService: "unavailable",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}