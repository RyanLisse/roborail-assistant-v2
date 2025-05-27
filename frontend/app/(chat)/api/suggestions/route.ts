import { getSuggestionsByDocumentId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return new ChatSDKError("bad_request:api", "Parameter documentId is required.").toResponse();
  }

  // Authentication removed - simplified for unauthenticated use

  const suggestions = await getSuggestionsByDocumentId({
    documentId,
  });

  const [suggestion] = suggestions;

  if (!suggestion) {
    return Response.json([], { status: 200 });
  }

  // Skip user ownership check for simplified unauthenticated use

  return Response.json(suggestions, { status: 200 });
}
