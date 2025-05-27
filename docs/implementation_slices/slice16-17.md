Okay, Architect! Let's flesh out the frontend for the advanced conversation features and then consider a slice for the initial setup of more sophisticated document updates (even if it's just the planning/stubbing).

---
<SLICING_TEMPLATE>
# Slice 16: Frontend - Auto-Save Drafts & Display Follow-up Questions
## What You're Building
This slice enhances the Next.js chat frontend (from Slice 9) to implement auto-saving of draft messages using the backend endpoint (from Slice 15) and to display the suggested follow-up questions returned by the RAG agent.
## Tasks
### 1. Frontend: Implement Auto-Save for Chat Input - Complexity: 3
- [ ] In `app/chat/page.tsx` (or the `ChatInput` component):
    - When the chat input value changes, trigger a debounced function.
    - The debounced function will call a `useMutation` hook (Tanstack Query) to post to `/api/chat/conversations/:conversationId/draft` (from Slice 15).
    - Requires `conversationId` to be available. If a new conversation, auto-save might be disabled until the first message is sent and a `conversationId` is established, or a temporary/draft conversation is created on first input.
    - Handle loading/error states for the draft save mutation (e.g., subtle indicator).
    - When a message is successfully sent (main chat mutation), ensure any pending draft save is cancelled or the draft state is cleared.
- [ ] Write tests: Component test for `ChatInput` verifying debounced calls and mutation trigger.
- [ ] Test passes locally.
    - **Subtask 1.1:** Add debouncing logic to input's `onChange`. - Complexity: 2
    - **Subtask 1.2:** Implement `useMutation` for saving draft. - Complexity: 2
### 2. Frontend: Load Draft on Conversation Load (Optional Enhancement) - Complexity: 2
- [ ] If a backend endpoint to fetch conversation details (including `metadata.draft`) exists or is added:
    - When a conversation is loaded, check if `metadata.draft.currentMessage` exists.
    - If so, populate the chat input field with this draft content.
- [ ] This task is optional for this slice if a dedicated conversation load endpoint isn't prioritized. Focus on auto-saving new input.
- [ ] Write tests: (If implemented) Test that input is populated from mock draft data.
- [ ] Test passes locally.
### 3. Frontend: Display Follow-up Questions - Complexity: 2
- [ ] In `app/chat/page.tsx`:
    - The `ChatResponse` (from Slice 15) now includes `followUpQuestions?: string[]`.
    - After an assistant message is received, if `followUpQuestions` are present, display them below the message.
    - Render them as clickable buttons or links.
    - When a follow-up question is clicked, it should populate the chat input field and (optionally) auto-submit.
- [ ] Write tests: Component test verifying follow-up questions are rendered and clickable.
- [ ] Test passes locally.
## Code Example
```tsx
// app/chat/page.tsx (Additions and modifications from Slice 9)
"use client";
import { useState, FormEvent, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// ... (other imports from Slice 9: Input, Button, ScrollArea, Card, etc.) ...
import { SendHorizonal } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce'; // npm install use-debounce

// ... (Message, CitationSource, Citation types from Slice 9) ...
interface ChatApiResponse { // From backend /api/chat/message
  conversationId: number;
  userMessageId: number;
  assistantMessageId: number;
  answer: string;
  citations?: Citation[];
  sources?: CitationSource[];
  followUpQuestions?: string[]; // New field
}

// API call function for saving draft (e.g., in lib/api.ts)
async function saveDraftApi(payload: { conversationId: number; draftPayload: { currentMessage: string } }): Promise<any> {
  const response = await fetch(`/api/chat/conversations/${payload.conversationId}/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload.draftPayload), // Send only draftPayload in body
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to save draft');
  }
  return response.json();
}


export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [currentFollowUps, setCurrentFollowUps] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();


  const chatMutation = useMutation<ChatApiResponse, Error, { userId: string; message: string; conversationId?: number }>({
    mutationFn: postChatMessage, // From Slice 9
    onSuccess: (data) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: data.assistantMessageId,
          role: 'assistant',
          content: data.answer,
          citations: data.citations,
          sources: data.sources,
          createdAt: new Date(),
        },
      ]);
      if (!conversationId) {
        setConversationId(data.conversationId);
      }
      setCurrentFollowUps(data.followUpQuestions || []);
      // Clear draft explicitly on successful send (backend also does this)
      // No need to call draftMutation here to clear, as input is cleared.
    },
    // ... (onError from Slice 9) ...
  });

  const draftMutation = useMutation<any, Error, { conversationId: number; draftPayload: { currentMessage: string } }>({
    mutationFn: saveDraftApi,
    onSuccess: () => {
      console.log("Draft saved for conversation:", conversationId);
    },
    onError: (error) => {
      console.error("Failed to save draft:", error.message);
      // Optionally show a subtle error to the user
    },
  });

  const debouncedSaveDraft = useDebouncedCallback((convId: number, currentInput: string) => {
    if (convId && currentInput.trim().length > 0) { // Only save if there's content and a convId
      draftMutation.mutate({ conversationId: convId, draftPayload: { currentMessage: currentInput } });
    }
  }, 1500); // Debounce by 1.5 seconds

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setInput(newText);
    if (conversationId) { // Only try to save draft if a conversation exists
      debouncedSaveDraft(conversationId, newText);
    }
  };

  const handleSubmit = async (messageToSend: string) => {
    if (!messageToSend.trim()) return;

    const userMessage: Message = {
      id: Date.now(), // Temporary client-side ID
      role: 'user',
      content: messageToSend,
      createdAt: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput(''); // Clear input after preparing message
    setCurrentFollowUps([]); // Clear follow-ups when user sends a message

    // Replace "temp-user-id" with actual user ID
    chatMutation.mutate({ userId: "temp-user-id", message: messageToSend, conversationId });
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSubmit(input);
  };
  
  const handleFollowUpClick = (question: string) => {
    setInput(question); // Populate input field
    handleSubmit(question); // Send the follow-up question as a new message
  };

  // ... (useEffect for scrolling from Slice 9) ...
  // ... (renderMessageContent function from Slice 9, unchanged unless citation display needs rework) ...

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-2xl h-[calc(100vh-4rem)] flex flex-col">
        <CardHeader>
          <CardTitle>RAG Chat {conversationId ? `(ID: ${conversationId})` : ""}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full pr-4">
            {/* ... (message rendering loop from Slice 9) ... */}
            {messages.map((msg) => ( /* ... */ ))}
            {chatMutation.isPending && ( /* ... Typing indicator ... */)}
          </ScrollArea>
        </CardContent>
        {currentFollowUps.length > 0 && (
          <div className="p-4 border-t">
            <h4 className="text-sm font-semibold mb-2 text-gray-600">Suggested follow-ups:</h4>
            <div className="flex flex-wrap gap-2">
              {currentFollowUps.map((fu, index) => (
                <Button key={index} variant="outline" size="sm" onClick={() => handleFollowUpClick(fu)}>
                  {fu}
                </Button>
              ))}
            </div>
          </div>
        )}
        <CardFooter>
          <form onSubmit={handleFormSubmit} className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={handleInputChange} // Use the new handler for auto-save
              disabled={chatMutation.isPending}
            />
            <Button type="submit" disabled={chatMutation.isPending || !input.trim()}>
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
```
## Ready to Merge Checklist
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (chat input auto-saves drafts to backend with debounce, follow-up questions are displayed and clickable).
## Quick Research (5-10 minutes)
**Official Docs:**
- `use-debounce` library for React: [https://github.com/xnimorz/use-debounce](https://github.com/xnimorz/use-debounce)
- Tanstack Query `useMutation` optimistic updates (if needed for draft status).
**Examples:**
- Implementing auto-save features in text editors or forms.
- UI patterns for displaying suggested actions or follow-up questions.
## Need to Go Deeper?
**Research Prompt:** *"What are strategies for managing focus and user experience when a follow-up question is clicked and populates the chat input? Should it auto-submit, or just populate and focus? How does this interact with the auto-save draft feature if the user then modifies the populated follow-up?"*
## Questions for Senior Dev
- [ ] For auto-save, if a conversation hasn't started yet (no `conversationId`), should we:
    - a) Disable auto-save until the first message is sent?
    - b) Trigger a backend call to create a "draft" conversation on first input, get an ID, then auto-save? (Option 'a' is simpler for now).
- [ ] When a follow-up question is clicked, should it immediately submit, or just populate the input field for the user to review/edit/send? (Populate and let user send is usually safer UX).
- [ ] How to visually indicate that a draft is being saved or has been saved successfully without being too intrusive? (A subtle spinner or checkmark near the input, or rely on network indicators).
</SLICING_TEMPLATE>
---
<SLICING_TEMPLATE>
# Slice 17: Document Update Functionality - Backend Stubs & Planning
## What You're Building
This slice focuses on planning and stubbing the backend functionality for updating documents. Full re-processing (re-chunking, re-embedding) of an updated document is complex. This slice will define the API endpoint and initial logic, potentially supporting metadata updates easily, and outlining the steps for content updates.
## Tasks
### 1. Backend: Define Document Update API Endpoint (`doc-mgmt.service.ts`) - Complexity: 2
- [ ] `PUT /api/documents/:documentId`
- [ ] Request body could include:
    - `title?: string`
    - `metadata?: Record<string, any>` (for replacing/updating specific metadata fields)
    - `file?: newFile` (if allowing content replacement)
    - `sourceUrl?: string` (if changing source from a URL)
- [ ] For this slice, focus on updating `title` and `metadata` in the `documents` table directly.
- [ ] If `file` or `sourceUrl` (indicating content change) is provided:
    - Log "Content update requested for document X - full re-processing required (deferred)."
    - Potentially change document status to 'update_queued' or 'stale'.
    - Do NOT implement the re-processing pipeline in this slice.
- [ ] Write tests: Test metadata updates. Test that content update requests are acknowledged but deferred.
- [ ] Test passes locally.
### 2. Backend: Logic for Metadata Update - Complexity: 2
- [ ] In the `PUT /api/documents/:documentId` handler:
    - Fetch the document.
    - If `title` is in request, update `documents.title`.
    - If `metadata` is in request, update `documents.metadata`. Consider if it's a partial update (merge) or full replacement. `jsonb_set` or `||` operator for merging.
    - Update `documents.updatedAt`.
- [ ] Write tests: Verify title and metadata fields are updated correctly in the DB.
- [ ] Test passes locally.
### 3. Backend: Plan for Document Content Re-processing Strategy - Complexity: 1 (Planning)
- [ ] This is a planning task, not implementation. Document the strategy:
    - **Trigger**: When `file` or `sourceUrl` changes via the update endpoint.
    - **Steps**:
        1.  Delete existing chunks for the `documentId` from `document_chunks`. (DB cascade might handle this if `documents` record is replaced, but safer to be explicit).
        2.  Update `documents.source` with new file path/URL.
        3.  Set `documents.status` to 'queued_for_reprocessing' (or similar).
        4.  Re-publish an event to `documentProcessingTopic` (from Slice 2) with the `documentId`.
        5.  The existing `documentProcessorWorkflow` should then pick it up and re-parse, re-chunk, re-embed.
    - **Considerations**:
        - What happens to existing conversations citing the old chunks? (Citations will become stale. No easy fix without versioning chunks/answers, which is very complex).
        - Hash checking: Before full re-processing, optionally compare hash of new content with old. If same, skip. (Requires storing old content hash).
- [ ] No code for re-processing in this slice.
### 4. Frontend: Basic UI Stub for Update (Optional) - Complexity: 1
- [ ] On the `app/documents/page.tsx` (document list):
    - Add an "Edit" button next to each document.
    - For now, this button can lead to a placeholder page or a disabled modal saying "Update functionality coming soon."
    - Or, implement a simple modal allowing only `title` and `metadata` (as JSON string) updates, calling the backend endpoint.
- [ ] This is low priority for this slice if backend stubbing is the focus.
- [ ] Write tests: (If UI is added) Test that edit button/modal appears.
- [ ] Test passes locally.
## Code Example
```typescript
// src/features/doc-mgmt/doc-mgmt.service.ts (Add Update Endpoint)
// ... (existing listDocuments, deleteDocument from Slice 11) ...
import { documents } from "../../shared/infrastructure/database/schema";
import { documentProcessingTopic, DocumentProcessEvent } from "../../shared/infrastructure/pubsub/topics"; // For re-processing later

interface UpdateDocumentPayload {
  title?: string;
  metadata?: Record<string, any>; // For partial update of metadata
  // For content update (deferred implementation)
  // newFileContent?: Buffer; // This would require multipart/form-data for the endpoint
  // newSourceUrl?: string;
}
interface UpdateDocumentRequest {
  documentId: Path<number>;
  payload: UpdateDocumentPayload;
}

// Helper function to merge metadata. existing_metadata || new_metadata (Postgres jsonb concatenation)
// Or use jsonb_set for targeted updates if payload is like { "metadata_path.to.key": "value" }
const mergeMetadata = (existing: any, newMeta: any) => ({ ...existing, ...newMeta });

export const updateDocument = api(
  { method: "PUT", path: "/api/documents/:documentId", auth: true },
  async ({ documentId, payload }: UpdateDocumentRequest, { auth }): Promise<{ message: string; document: typeof documents.$inferSelect }> => {
    const userId = auth?.authData?.userID; // Assuming admin rights or ownership check needed
    // Add proper authorization logic here if not an admin-only feature

    const docToUpdate = await db.query.documents.findFirst({ where: eq(documents.id, documentId) });
    if (!docToUpdate) {
      throw APIError.notFound("Document not found.");
    }

    const updates: Partial<typeof documents.$inferInsert> = {
        updatedAt: new Date(),
    };
    let reprocessNeeded = false;

    if (payload.title && payload.title !== docToUpdate.title) {
      updates.title = payload.title;
    }

    if (payload.metadata) {
      // Example: simple merge. For specific field updates, jsonb_set would be better.
      // updates.metadata = mergeMetadata(docToUpdate.metadata || {}, payload.metadata);
      // Using jsonb_set for each key in payload.metadata:
      let metadataSql = sql`COALESCE(${documents.metadata}, '{}'::jsonb)`;
      for (const key in payload.metadata) {
          metadataSql = sql`jsonb_set(${metadataSql}, ${`{${key}}`}, ${JSON.stringify(payload.metadata[key])}::jsonb)`;
      }
      updates.metadata = metadataSql;
    }

    // Placeholder for content update logic - deferred
    // if (payload.newFileContent || payload.newSourceUrl) {
    //   log.warn("Content update requested, full re-processing is required (feature deferred).", { documentId });
    //   updates.status = 'update_queued'; // Mark for re-processing
    //   reprocessNeeded = true;
    //   // Store new file to bucket, update documents.source
    //   // Delete old chunks: await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    // }

    if (Object.keys(updates).length > 1) { // Has more than just updatedAt
        const updatedResult = await db.update(documents)
            .set(updates)
            .where(eq(documents.id, documentId))
            .returning();

        if (reprocessNeeded) {
            // await documentProcessingTopic.publish({ documentId, priority: 'high' });
            // log.info("Document queued for re-processing", { documentId });
        }
        return { message: `Document ${documentId} updated successfully.`, document: updatedResult[0] };
    }

    return { message: "No changes applied.", document: docToUpdate };
  }
);
```
## Ready to Merge Checklist
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (metadata updates via API work, content update requests are logged as deferred).
## Quick Research (5-10 minutes)
**Official Docs:**
- PostgreSQL `JSONB` manipulation functions.
- Drizzle ORM syntax for updating JSONB fields.
- Encore Pub/Sub for triggering re-processing workflows.
**Examples:**
- Strategies for versioning documents and their chunks if stale citations are a major concern (this is complex, out of scope for now).
- Idempotent re-processing workflows.
## Need to Go Deeper?
**Research Prompt:** *"What are the challenges and best practices for implementing a full document content re-processing pipeline in a RAG system? Consider data consistency (e.g., stale chunks, search index updates), impact on existing citations, and resource utilization. How can this be made efficient and reliable?"*
## Questions for Senior Dev
- [ ] For metadata updates using `jsonb_set`, how should the API payload be structured if we want to allow targeted updates to nested keys (e.g., `{"metadataUpdates": [{"path": ["tags", 0], "value": "new_tag"}]}` vs. simpler full `metadata` object replacement/merge)? (Simpler merge/replace is fine for now).
- [ ] When full content re-processing is implemented, what's the best way to handle user notifications or status updates in the UI about the re-processing?
- [ ] Should there be any mechanism to revert to a previous version of a document if an update causes issues? (Versioning is complex, likely out of scope for MVP).
</SLICING_TEMPLATE>

We're nearing the end of the features explicitly detailed in the initial PRD. The final steps would involve comprehensive E2E testing, performance tuning, security reviews, and deployment preparations.