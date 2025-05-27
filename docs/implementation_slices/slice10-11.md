Okay, Architect! Let's move on to the document management aspects of the frontend and then to backend enhancements like testing and caching.

---
<SLICING_TEMPLATE>
# Slice 10: Frontend - Document Upload UI
## What You're Building
This slice creates a separate Next.js page and components for uploading documents (PDFs, internal documentation) to the backend `/api/documents/upload` endpoint (from Slice 2). It will include a file input, optional metadata fields, and display upload progress and status.
## Tasks
### 1. Create Document Upload Page and Basic Form - Complexity: 2
- [ ] Create a new Next.js page (e.g., `app/documents/upload/page.tsx`).
- [ ] Design a form using Shadcn UI components (`Card`, `Input`, `Label`, `Button`, `Textarea` for metadata).
- [ ] Include a file input (`<input type="file">`, styled or using a Shadcn `Input type="file"` if available/customized).
- [ ] Add fields for optional `title`, `sourceType` (could be a dropdown: PDF, DOCX, URL, Text), and a `textarea` for `metadataJson` (or individual common metadata fields like author, tags).
- [ ] Write tests: Basic page rendering test.
- [ ] Test passes locally.
### 2. Implement File Upload Logic with Tanstack Query - Complexity: 3
- [ ] Use `useMutation` from Tanstack Query to handle the form submission.
- [ ] The mutation function will construct `FormData` to send to the `/api/documents/upload` raw endpoint.
- [ ] Append the selected file, title, sourceType, and metadata to the `FormData`.
- [ ] Handle API responses: display success message with `documentId` or show error messages.
- [ ] Write tests: Mock `fetch`. Test `useMutation` for constructing `FormData` and handling responses.
- [ ] Test passes locally.
    - **Subtask 2.1:** Create API function to post `FormData`. - Complexity: 1
    - **Subtask 2.2:** Implement `useMutation` for form submission. - Complexity: 2
### 3. Display Upload Progress (Optional but good UX) - Complexity: 2
- [ ] If using `fetch` directly or a library like `axios` that supports it, listen to `progress` events during the upload.
- [ ] Display a progress bar (Shadcn `Progress` component) or percentage.
- [ ] Update the UI to show "Uploading..." state.
- [ ] *Note: Standard `fetch` doesn't easily expose upload progress. This might require `XMLHttpRequest` or a library.* For simplicity, can start with just a loading spinner.
- [ ] Write tests: (Difficult to unit test actual progress events without a library). Test UI state changes during mock "uploading" phase.
- [ ] Test passes locally.
### 4. Handle Upload Status and Feedback - Complexity: 2
- [ ] After the mutation `onSuccess` or `onError`:
    - Display a clear success message (e.g., "Document 'X' uploaded successfully and is now processing. ID: Y").
    - Display any error messages returned from the backend.
    - Clear the form or provide an option to upload another document.
- [ ] Consider showing a list of recently uploaded documents and their initial 'queued' status on this page (deferred to Slice 11 if too complex here).
- [ ] Write tests: Verify UI updates correctly based on mock success/error responses from the mutation.
- [ ] Test passes locally.
## Code Example
```tsx
// app/documents/upload/page.tsx (Simplified)
"use client";
import { useState, FormEvent, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress'; // For upload progress
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";


// API call function
async function uploadDocumentApi(formData: FormData): Promise<any> {
  // If your Encore backend is running on a different port locally:
  // const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const response = await fetch(`/api/documents/upload`, { // Adjust if needed
    method: 'POST',
    body: formData,
    // Headers are set automatically for FormData by the browser
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to upload document. Unknown error." }));
    throw new Error(errorData.message || 'Failed to upload document');
  }
  return response.json();
}

interface UploadedDocInfo {
  documentId: number;
  status: string;
  fileName: string;
}

export default function DocumentUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState(''); // e.g., 'pdf', 'docx'
  const [metadataJson, setMetadataJson] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocInfo[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: uploadDocumentApi,
    onSuccess: (data) => {
      setUploadedDocs(prev => [...prev, { documentId: data.documentId, status: data.status, fileName: data.fileName }]);
      // Reset form
      setFile(null);
      setTitle('');
      setSourceType('');
      setMetadataJson('');
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      // Display error to user (e.g., using a toast or an alert component)
      alert(`Upload failed: ${error.message}`); // Simple alert for now
      setUploadProgress(0);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!title) setTitle(e.target.files[0].name); // Auto-fill title
      if (!sourceType) setSourceType(e.target.files[0].type); // Auto-fill source type
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name);
    formData.append('sourceType', sourceType || file.type);
    if (metadataJson) {
      formData.append('metadataJson', metadataJson);
    }
    // For upload progress with XHR:
    // const xhr = new XMLHttpRequest();
    // xhr.upload.addEventListener("progress", (event) => {
    //   if (event.lengthComputable) {
    //     setUploadProgress((event.loaded / event.total) * 100);
    //   }
    // });
    // xhr.addEventListener("loadend", () => { /* handle completion */ });
    // xhr.open("POST", "/api/documents/upload");
    // xhr.send(formData);
    // uploadMutation.mutate(formData); // This won't give progress with fetch easily

    // For now, just trigger mutation and rely on its loading state for basic feedback
    setUploadProgress(50); // Simulate progress start
    uploadMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Upload New Document</CardTitle>
          <CardDescription>Upload PDF, DOCX, or other supported document types for processing.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file">Document File</Label>
              <Input id="file" type="file" onChange={handleFileChange} ref={fileInputRef} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title (Optional)</Label>
              <Input id="title" type="text" placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceType">Source Type (Optional, e.g., application/pdf)</Label>
              <Input id="sourceType" type="text" placeholder="e.g., application/pdf, text/plain" value={sourceType} onChange={(e) => setSourceType(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metadataJson">Metadata (Optional JSON String)</Label>
              <Textarea
                id="metadataJson"
                placeholder='e.g., {"author": "John Doe", "tags": ["important", "q3"]}'
                value={metadataJson}
                onChange={(e) => setMetadataJson(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Example: {`{"author": "Jane Doe", "department": "Legal"}`}
              </p>
            </div>
            {uploadMutation.isPending && (
              <div className="space-y-2">
                <Label>Uploading...</Label>
                <Progress value={uploadProgress > 0 ? uploadProgress : undefined} className="w-full" />
                 {/* Indeterminate if progress is 0, determinate otherwise */}
              </div>
            )}
             {uploadMutation.isError && (
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Upload Failed</AlertTitle>
                    <AlertDescription>
                        {uploadMutation.error?.message || "An unknown error occurred."}
                    </AlertDescription>
                </Alert>
            )}
            <Button type="submit" className="w-full" disabled={uploadMutation.isPending || !file}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
            </Button>
          </form>
        </CardContent>
        {uploadedDocs.length > 0 && (
            <CardFooter className="flex-col items-start space-y-2">
                <h3 className="text-lg font-semibold">Recently Uploaded:</h3>
                <ul className="list-disc list-inside">
                    {uploadedDocs.map(doc => (
                        <li key={doc.documentId}>
                            "{doc.fileName}" (ID: {doc.documentId}) - Status: {doc.status}
                        </li>
                    ))}
                </ul>
            </CardFooter>
        )}
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
- [ ] Feature works as expected (can select file, fill metadata, upload to backend, see success/error feedback).
## Quick Research (5-10 minutes)
**Official Docs:**
- Next.js File Uploads (general patterns, not specific to App Router if different): [https://nextjs.org/docs](https://nextjs.org/docs) (search for form handling or server actions if applicable)
- MDN FormData API: [https://developer.mozilla.org/en-US/docs/Web/API/FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- Shadcn UI `Progress` component: [https://ui.shadcn.com/docs/components/progress](https://ui.shadcn.com/docs/components/progress)
**Examples:**
- Tanstack Query examples for file uploads.
- How to implement upload progress with `XMLHttpRequest` if `fetch` is insufficient.
## Need to Go Deeper?
**Research Prompt:** *"What are the best practices for providing robust client-side validation for file uploads in a Next.js app (e.g., file type, size limits) before sending to the backend? How can this be integrated with Shadcn UI and Tanstack Query form handling?"*
## Questions for Senior Dev
- [ ] For upload progress, is relying on `XMLHttpRequest` (if `fetch` doesn't support it well) an acceptable approach, or should we simplify to just a loading spinner for this slice? (Spinner is fine to start).
- [ ] How should complex metadata be handled in the UI? A single JSON textarea, or dynamically generated fields for common keys like 'author', 'tags'? (JSON textarea is simpler for now).
- [ ] What are the typical CORS considerations if the Next.js frontend is served on a different port/domain than the Encore backend during local development? (Encore `global_cors` in `encore.app` or proxying via `next.config.js`).
</SLICING_TEMPLATE>
---
<SLICING_TEMPLATE>
# Slice 11: Document Management UI (List & Delete)
## What You're Building
This slice creates a new Next.js page to display a list of uploaded documents with their status and metadata. It will also implement functionality to delete documents (which should cascade to delete related chunks and notify the user). Update functionality is complex and will be deferred.
## Tasks
### 1. Backend: Create Endpoints for Listing & Deleting Documents - Complexity: 3
- [ ] In a new Encore service `src/features/doc-mgmt/doc-mgmt.service.ts` (or an existing one like `upload.service.ts`):
    - **List Endpoint**: `GET /api/documents`
        - Fetches documents from `documents` table (Drizzle).
        - Supports pagination (e.g., `?page=1&pageSize=10`).
        - Returns `id`, `title`, `sourceType`, `status`, `createdAt`, `updatedAt`, `metadata`.
    - **Delete Endpoint**: `DELETE /api/documents/:documentId`
        - Deletes the document record from `documents` table.
        - Due to `onDelete: 'cascade'` in `document_chunks.documentId` FK, chunks should be deleted automatically by the DB.
        - Also, delete the raw file from `rawDocumentsBucket`.
        - Returns success/failure message.
- [ ] Write tests: Unit/integration tests for these backend endpoints (mock DB/bucket).
- [ ] Test passes locally.
    - **Subtask 1.1:** Implement `GET /api/documents` with pagination. - Complexity: 2
    - **Subtask 1.2:** Implement `DELETE /api/documents/:documentId` including bucket deletion. - Complexity: 2
### 2. Frontend: Document List Page - Complexity: 3
- [ ] Create `app/documents/page.tsx`.
- [ ] Use Tanstack Query's `useQuery` to fetch the list of documents from `/api/documents`.
- [ ] Display documents in a table (Shadcn `Table` component) or a list of `Card`s.
- [ ] Show columns: Title, Status, Source Type, Created At, Actions (Delete button).
- [ ] Implement client-side or server-side pagination for the list.
- [ ] Write tests: Component test for the document list, mocking API response.
- [ ] Test passes locally.
    - **Subtask 2.1:** Setup Tanstack Query `useQuery` to fetch documents. - Complexity: 1
    - **Subtask 2.2:** Implement UI for displaying documents in a table. - Complexity: 2
### 3. Frontend: Implement Delete Functionality - Complexity: 2
- [ ] Add a "Delete" button for each document in the list.
- [ ] On click, show a confirmation dialog (Shadcn `AlertDialog`).
- [ ] If confirmed, use Tanstack Query's `useMutation` to call `DELETE /api/documents/:documentId`.
- [ ] On success, refetch the document list (Tanstack Query `queryClient.invalidateQueries`).
- [ ] Display success/error notifications.
- [ ] Write tests: Mock `fetch`. Test `useMutation` for delete and list refetching.
- [ ] Test passes locally.
## Code Example
```typescript
// src/features/doc-mgmt/doc-mgmt.service.ts (Backend Endpoints)
import { Service } from "encore.dev/service";
import { api, Path, Query } from "encore.dev/api";
import { db } from "../../shared/infrastructure/database/db";
import { documents } from "../../shared/infrastructure/database/schema";
import { Bucket } from "encore.dev/storage/objects";
import { count, desc, eq, sql } from "drizzle-orm";
import log from "encore.dev/log";

export default new Service("doc-mgmt");

const rawDocumentsBucket = new Bucket("raw-documents");

interface ListDocumentsParams {
  page: Query<number>;
  pageSize: Query<number>;
}
interface ListDocumentsResponse {
  items: Array<typeof documents.$inferSelect & { chunkCount?: number }>;
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export const listDocuments = api(
  { method: "GET", path: "/api/documents", auth: true },
  async ({ page = 1, pageSize = 10 }: ListDocumentsParams): Promise<ListDocumentsResponse> => {
    page = Number(page);
    pageSize = Number(pageSize);
    const offset = (page - 1) * pageSize;

    const items = await db.query.documents.findMany({
      orderBy: [desc(documents.createdAt)],
      limit: pageSize,
      offset: offset,
      // TODO: Add chunkCount if needed via a subquery or separate query
    });

    const totalResult = await db.select({ value: count() }).from(documents);
    const totalItems = totalResult[0].value;
    const totalPages = Math.ceil(totalItems / pageSize);

    return { items, totalItems, totalPages, currentPage: page };
  }
);

interface DeleteDocumentParams {
  documentId: Path<number>;
}
export const deleteDocument = api(
  { method: "DELETE", path: "/api/documents/:documentId", auth: true },
  async ({ documentId }: DeleteDocumentParams): Promise<{ message: string }> => {
    const docToDelete = await db.query.documents.findFirst({ where: eq(documents.id, documentId) });
    if (!docToDelete) {
      throw api.ErrNotFound("Document not found.");
    }

    // Delete from DB (chunks will cascade)
    await db.delete(documents).where(eq(documents.id, documentId));
    log.info("Document deleted from DB", { documentId });

    // Delete from bucket
    try {
      if (docToDelete.source) { // source is the filename in bucket
        await rawDocumentsBucket.remove(docToDelete.source);
        log.info("Document file deleted from bucket", { bucketKey: docToDelete.source });
      }
    } catch (error: any) {
      // Log error but don't fail the whole operation if DB delete succeeded
      log.error("Failed to delete document from bucket", { documentId, bucketKey: docToDelete.source, error: error.message });
    }

    return { message: `Document ${documentId} and its associated data deleted successfully.` };
  }
);

// app/documents/page.tsx (Frontend List & Delete - Simplified)
"use client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface DocumentItem {
  id: number;
  title: string;
  sourceType: string | null;
  status: string | null;
  createdAt: string; // Assuming string from JSON
  updatedAt: string;
  metadata: any;
}
interface ListApiResponse {
  items: DocumentItem[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

async function fetchDocuments(page: number = 1, pageSize: number = 10): Promise<ListApiResponse> {
  const response = await fetch(`/api/documents?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) throw new Error('Failed to fetch documents');
  return response.json();
}

async function deleteDocumentApi(documentId: number): Promise<{ message: string }> {
  const response = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to delete document');
  }
  return response.json();
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, error } = useQuery<ListApiResponse, Error>({
    queryKey: ['documents', currentPage, pageSize],
    queryFn: () => fetchDocuments(currentPage, pageSize),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation< { message: string }, Error, number >({
    mutationFn: deleteDocumentApi,
    onSuccess: (data, documentId) => {
      alert(data.message || `Document ${documentId} deleted.`);
      queryClient.invalidateQueries({ queryKey: ['documents'] }); // Refetch all pages or current page
    },
    onError: (error) => {
      alert(`Error deleting document: ${error.message}`);
    },
  });

  if (isLoading) return <p>Loading documents...</p>;
  if (error) return <p>Error loading documents: {error.message}</p>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Document Management</h1>
        <Button asChild><Link href="/documents/upload">Upload New Document</Link></Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.items.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>{doc.title}</TableCell>
              <TableCell>{doc.status}</TableCell>
              <TableCell>{doc.sourceType}</TableCell>
              <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleteMutation.isLoading && deleteMutation.variables === doc.id}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the document "{doc.title}" and all its associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(doc.id)}>
                        Confirm Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Basic Pagination Controls */}
      <div className="flex items-center justify-between mt-4 space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span>Page {data?.currentPage} of {data?.totalPages}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, data?.totalPages || 1))}
          disabled={currentPage === data?.totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
```
## Ready to Merge Checklist
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Code reviewed by senior dev
- [ ] Feature works as expected (can list documents, see status, delete documents with confirmation, bucket file is also deleted).
## Quick Research (5-10 minutes)
**Official Docs:**
- Shadcn `Table` and `AlertDialog` components.
- Tanstack Query `useQuery` for lists, pagination strategies, and `queryClient.invalidateQueries`.
- Encore API path parameters (`Path<number>`) and query parameters (`Query<number>`).
**Examples:**
- CRUD interfaces with Next.js and Tanstack Query.
- Efficiently deleting related data (file from bucket upon DB record deletion).
## Need to Go Deeper?
**Research Prompt:** *"What are the best practices for handling cascading deletes and related resource cleanup (like files in object storage) in a distributed system when an Encore API triggers the delete? Consider idempotency, error handling if a secondary resource (like bucket file) fails to delete, and potential for orphan data."*
## Questions for Senior Dev
- [ ] For the backend delete endpoint, if deleting the file from the bucket fails after the DB record is deleted, how should this be handled? Should we attempt a rollback or log it for manual cleanup? (Logging is usually sufficient; complex rollbacks are hard).
- [ ] Is the pagination implementation on the backend (offset/limit) and frontend (passing page numbers) standard and efficient enough for now?
- [ ] How detailed should the `document.metadata` be displayed in the list UI? (For now, not displayed to keep it simple, but could be a modal or expandable row later).
</SLICING_TEMPLATE>

---

Next up would be more advanced features, deeper testing, and performance optimizations like caching. We are making good progress on the core application!