"use client";
import { useState, type FormEvent, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import Link from 'next/link';
import { cn } from '@/lib/utils';

// API call function
async function uploadDocumentApi(formData: FormData): Promise<any> {
  // Assuming backend runs on the same host or proxied. Adjust if necessary.
  const response = await fetch(`/api/documents/upload`, { 
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
  documentId: number; // Assuming backend returns number, adjust if string based on schema
  status: string;
  fileName: string;
}

export default function DocumentUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState(''); 
  const [metadataJson, setMetadataJson] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0); // Basic progress state
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocInfo[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation<UploadedDocInfo, Error, FormData>({
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
      // Optionally, show a success toast
      // toast({ title: "Upload Successful", description: `Document "${data.fileName}" uploaded and queued.` });
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      // toast({ variant: "destructive", title: "Upload Failed", description: error.message });
      alert(`Upload failed: ${error.message}`); // Simple alert for now
    },
    // For actual progress, one would typically use XMLHttpRequest or a library
    // that supports upload progress events, then call setUploadProgress.
    // Here, we simulate progress briefly for visual feedback during mutation.
    onMutate: () => {
        setUploadProgress(50); // Indicate loading state
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name); 
      if (!sourceType) setSourceType(selectedFile.type || 'application/octet-stream');
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
    formData.append('sourceType', sourceType || file.type || 'application/octet-stream');
    if (metadataJson) {
      try {
        // Validate JSON structure slightly before sending
        JSON.parse(metadataJson);
        formData.append('metadataJson', metadataJson);
      } catch (jsonError) {
        alert("Invalid JSON in metadata field.");
        return;
      }
    }
    uploadMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto p-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button variant="outline" asChild><Link href="/documents">&larr; Back to Documents</Link></Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upload New Document</CardTitle>
          <CardDescription>Upload PDF, DOCX, TXT, or other supported document types for processing and inclusion in the RAG system.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file">Document File</Label>
              <Input id="file" type="file" onChange={handleFileChange} ref={fileInputRef} required className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title (Optional - defaults to filename)</Label>
              <Input id="title" type="text" placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceType">Content Type (Optional - e.g., application/pdf)</Label>
              <Input id="sourceType" type="text" placeholder="e.g., application/pdf, text/plain" value={sourceType} onChange={(e) => setSourceType(e.target.value)} />
              <p className="text-xs text-muted-foreground">If blank, will attempt to infer from file.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="metadataJson">Additional Metadata (Optional JSON String)</Label>
              <Textarea
                id="metadataJson"
                placeholder='e.g., { "author": "John Doe", "tags": ["important", "q3"], "department": "Legal" }'
                value={metadataJson}
                onChange={(e) => setMetadataJson(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Provide valid JSON. Example: {`{ "category": "policy", "version": "1.2" }`}
              </p>
            </div>
            
            {(uploadMutation.isPending || (uploadProgress > 0 && uploadProgress < 100)) && (
              <div className="space-y-2">
                <Label>Uploading...</Label>
                <Progress value={uploadMutation.isPending && uploadProgress === 50 ? undefined : uploadProgress} className="w-full" />
                {/* Indeterminate if no real progress, determinate if actual progress was implemented */}
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
             {uploadMutation.isSuccess && uploadedDocs.length > 0 && (
                 <Alert variant="success">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Upload Successful</AlertTitle>
                    <AlertDescription>
                        Document &quot;{uploadedDocs[uploadedDocs.length -1].fileName}&quot; (ID: {uploadedDocs[uploadedDocs.length -1].documentId}) uploaded and queued for processing.
                    </AlertDescription>
                </Alert>
             )}

            <Button type="submit" className="w-full" disabled={uploadMutation.isPending || !file}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
            </Button>
          </form>
        </CardContent>
        {uploadedDocs.length > 0 && (
            <CardFooter className="flex-col items-start space-y-2 border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold">Upload History (this session):</h3>
                <ul className="list-disc list-inside w-full space-y-1">
                    {uploadedDocs.slice().reverse().map(doc => (
                        <li key={doc.documentId} className="text-sm">
                           <span className="font-medium">{doc.fileName}</span> (ID: {doc.documentId}) - Status: <span className={cn("font-semibold", {"text-green-600": doc.status === 'queued' || doc.status === 'processing'})}>{doc.status}</span>
                        </li>
                    ))}
                </ul>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}