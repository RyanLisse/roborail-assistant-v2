"use client";

import { useDocumentUpload, useDocumentStatuses } from "@/hooks";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { FileIcon, LoaderIcon, TrashIcon, UploadIcon, XIcon } from "./icons";

interface UploadedDocument {
  documentId: string;
  fileName: string;
  status: string;
  uploadedAt: string;
  progress?: number;
}

interface DocumentManagerProps {
  onDocumentUploaded?: (document: UploadedDocument) => void;
  className?: string;
}

export function DocumentManager({ onDocumentUploaded, className }: DocumentManagerProps) {
  const [uploadQueue, setUploadQueue] = useState<UploadedDocument[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Use Tanstack Query mutation for uploads
  const uploadMutation = useDocumentUpload();
  
  // Track statuses of uploaded documents
  const documentIds = uploadQueue.map(doc => doc.documentId).filter(id => !id.startsWith('temp-'));
  const { data: statuses } = useDocumentStatuses(documentIds);

  // Update upload queue when statuses change
  useEffect(() => {
    if (statuses) {
      setUploadQueue(prev => 
        prev.map(doc => {
          const status = statuses.find(s => s.documentId === doc.documentId);
          return status ? { ...doc, status: status.status, progress: status.progress } : doc;
        })
      );
    }
  }, [statuses]);

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown',
        ];

        if (!allowedTypes.includes(file.type)) {
          toast.error(`Unsupported file type: ${file.name}. Please upload PDF, Word, or text files.`);
          continue;
        }

        // Validate file size (50MB limit)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
          toast.error(`File too large: ${file.name}. Maximum size is 50MB.`);
          continue;
        }

        // Create temporary upload entry
        const tempEntry: UploadedDocument = {
          documentId: `temp-${Date.now()}-${Math.random()}`,
          fileName: file.name,
          status: 'uploading',
          uploadedAt: new Date().toISOString(),
          progress: 0,
        };

        setUploadQueue(prev => [...prev, tempEntry]);

        // Use the mutation to upload
        uploadMutation.mutate(
          { file, userId: "anonymous" },
          {
            onSuccess: (data) => {
              // Update the temporary entry with real document ID
              setUploadQueue(prev => 
                prev.map(doc => 
                  doc.documentId === tempEntry.documentId 
                    ? { ...doc, documentId: data.documentId, status: 'processing' }
                    : doc
                )
              );
              
              // Call the callback if provided
              if (onDocumentUploaded) {
                onDocumentUploaded({
                  documentId: data.documentId,
                  fileName: data.fileName,
                  status: data.status,
                  uploadedAt: new Date().toISOString(),
                });
              }
              
              toast.success(`Successfully uploaded: ${file.name}`);
            },
            onError: (error) => {
              // Remove failed upload from queue
              setUploadQueue(prev => prev.filter(doc => doc.documentId !== tempEntry.documentId));
              toast.error(`Failed to upload ${file.name}: ${error.message}`);
            }
          }
        );

      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`);
      }
    }
  }, [uploadMutation, onDocumentUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
    }
  }, [handleFileUpload]);

  const removeUpload = useCallback((documentId: string) => {
    setUploadQueue(prev => prev.filter(upload => upload.documentId !== documentId));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'processed':
        return 'text-green-600';
      case 'processing':
      case 'uploading':
        return 'text-blue-600';
      case 'error':
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Uploaded';
      case 'processed':
        return 'Ready';
      case 'processing':
        return 'Processing...';
      case 'uploading':
        return 'Uploading...';
      case 'error':
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadIcon />
          Document Manager
        </CardTitle>
        <CardDescription>
          Upload documents to enhance your chat experience. Supported formats: PDF, Word, Text, Markdown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={cn(
            "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors cursor-pointer hover:border-gray-400",
            isDragOver && "border-blue-500 bg-blue-50",
            uploadMutation.isPending && "pointer-events-none opacity-50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin">
                <LoaderIcon size={24} />
              </div>
              <p className="text-sm text-gray-600">Uploading files...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadIcon size={32} />
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500">PDF, Word, Text, Markdown (max 50MB)</p>
            </div>
          )}
        </div>

        {/* Upload Queue */}
        {uploadQueue.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Documents</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {uploadQueue.map((upload) => (
                <motion.div
                  key={upload.documentId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {upload.status === 'uploading' || upload.status === 'processing' ? (
                        <div className="animate-spin">
                          <LoaderIcon size={16} />
                        </div>
                      ) : (
                        <FileIcon size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{upload.fileName}</p>
                      <p className={cn("text-xs", getStatusColor(upload.status))}>
                        {getStatusText(upload.status)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUpload(upload.documentId)}
                    className="flex-shrink-0"
                  >
                    <XIcon size={16} />
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Uploaded documents will be processed and made available for chat queries</p>
          <p>• Processing may take a few minutes depending on document size</p>
          <p>• Documents are searchable once processing is complete</p>
        </div>
      </CardContent>
    </Card>
  );
}