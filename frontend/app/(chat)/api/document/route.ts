import type { ArtifactKind } from "@/components/artifact";
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api", "Parameter id is missing").toResponse();
  }

  // Authentication removed - simplified for unauthenticated use

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  // Skip user ownership check for simplified unauthenticated use

  return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api", "Parameter id is required.").toResponse();
  }

  // Authentication removed - simplified for unauthenticated use

  const { content, title, kind }: { content: string; title: string; kind: ArtifactKind } =
    await request.json();

  const documents = await getDocumentsById({ id });

  if (documents.length > 0) {
    // Skip user ownership check for simplified unauthenticated use
  }

  const document = await saveDocument({
    id,
    content,
    title,
    kind,
  });

  return Response.json(document, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const timestamp = searchParams.get("timestamp");

  if (!id) {
    return new ChatSDKError("bad_request:api", "Parameter id is required.").toResponse();
  }

  if (!timestamp) {
    return new ChatSDKError("bad_request:api", "Parameter timestamp is required.").toResponse();
  }

  // Authentication removed - simplified for unauthenticated use

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  // Skip user ownership check for simplified unauthenticated use

  const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return Response.json(documentsDeleted, { status: 200 });
}
