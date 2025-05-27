import { uploadFile } from "@/lib/api/backend-client";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: "Unsupported file type. Please upload PDF, Word, or text files." 
        },
        { status: 400 }
      );
    }

    // Upload to backend
    const result = await uploadFile(file, "anonymous");

    return NextResponse.json({
      documentId: result.documentId,
      status: result.status,
      message: result.message,
      fileName: result.fileName,
      uploadedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { 
        error: "Upload failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// Get upload status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const { backendClient } = await import("@/lib/api/backend-client");
    const status = await backendClient.getDocumentStatus(documentId);

    return NextResponse.json(status);

  } catch (error) {
    console.error("Document status check error:", error);
    return NextResponse.json(
      { 
        error: "Failed to get document status", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}