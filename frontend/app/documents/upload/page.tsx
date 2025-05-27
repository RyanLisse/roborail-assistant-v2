'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dropzone, type FileWithPreview } from '@/components/ui/dropzone';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface UploadFormData {
  file: File;
  title: string;
  sourceType: string;
  metadata: string;
}

interface UploadResponse {
  id: string;
  status: string;
  message: string;
}

export default function DocumentUploadPage() {
  const [formData, setFormData] = useState({
    title: '',
    sourceType: '',
    metadata: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const router = useRouter();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('title', data.title);
      formData.append('sourceType', data.sourceType);
      formData.append('metadata', data.metadata);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));

        xhr.open('POST', '/api/files/upload');
        xhr.send(formData);
      });
    },
    onSuccess: (data) => {
      toast.success('Document uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setUploadProgress(0);
      setSelectedFiles([]);
      setFormData({ title: '', sourceType: '', metadata: '' });
      router.push('/documents');
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploadProgress(0);
    }
  });

  const handleFilesChange = (files: FileWithPreview[]) => {
    setSelectedFiles(files);
    if (files.length > 0 && !formData.title) {
      setFormData(prev => ({ ...prev, title: files[0].name.split('.')[0] }));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (selectedFiles.length === 0) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!formData.title || !formData.sourceType) {
      toast.error('Please fill in all required fields');
      return;
    }

    // For now, upload only the first file. You can extend this to handle multiple files
    uploadMutation.mutate({
      file: selectedFiles[0],
      title: formData.title,
      sourceType: formData.sourceType,
      metadata: formData.metadata
    });
  };

  const isUploading = uploadMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Select File *</Label>
              <div className="mt-2">
                <Dropzone
                  value={selectedFiles}
                  onValueChange={handleFilesChange}
                  disabled={isUploading}
                  dropzoneOptions={{
                    accept: {
                      'application/pdf': ['.pdf'],
                      'application/msword': ['.doc'],
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                      'text/plain': ['.txt'],
                      'text/markdown': ['.md'],
                    },
                    maxSize: 10 * 1024 * 1024, // 10MB
                    maxFiles: 1,
                  }}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter document title"
                disabled={isUploading}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="sourceType">Source Type *</Label>
              <Select
                value={formData.sourceType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sourceType: value }))}
                disabled={isUploading}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select source type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="metadata">Additional Metadata</Label>
              <Textarea
                id="metadata"
                value={formData.metadata}
                onChange={(e) => setFormData(prev => ({ ...prev, metadata: e.target.value }))}
                placeholder="Enter any additional metadata or description"
                disabled={isUploading}
                className="mt-2"
                rows={4}
              />
            </div>

            {isUploading && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">{uploadProgress}% complete</p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isUploading || selectedFiles.length === 0}
                className="flex-1"
              >
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/documents')}
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}