"use client";

import React from 'react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileWithPreview extends File {
  preview?: string;
}

interface DropzoneProps extends React.HTMLAttributes<HTMLDivElement> {
  dropzoneOptions?: DropzoneOptions;
  value?: FileWithPreview[];
  onValueChange?: (files: FileWithPreview[]) => void;
  onFilesAdded?: (addedFiles: FileWithPreview[]) => void;
  disabled?: boolean;
  dropZoneClassName?: string;
  className?: string;
}

const Dropzone = React.forwardRef<HTMLDivElement, DropzoneProps>(
  (
    {
      dropzoneOptions,
      value,
      onValueChange,
      onFilesAdded,
      disabled,
      dropZoneClassName,
      className,
      ...props
    },
    ref
  ) => {
    const [files, setFiles] = React.useState<FileWithPreview[]>(value || []);

    const onDrop = React.useCallback(
      (acceptedFiles: File[], rejectedFiles: any[]) => {
        const filesWithPreview = acceptedFiles.map((file) =>
          Object.assign(file, {
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          })
        );

        setFiles((prevFiles) => {
          const newFiles = [...prevFiles, ...filesWithPreview];
          onValueChange?.(newFiles);
          return newFiles;
        });

        if (onFilesAdded) {
          onFilesAdded(filesWithPreview);
        }
      },
      [onValueChange, onFilesAdded]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      disabled,
      ...dropzoneOptions,
    });

    // Update files when value prop changes
    React.useEffect(() => {
      if (value) {
        setFiles(value);
      }
    }, [value]);

    const removeFile = React.useCallback(
      (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        onValueChange?.(newFiles);

        // Revoke preview URL if it exists
        const fileToRemove = files[index];
        if (fileToRemove.preview) {
          URL.revokeObjectURL(fileToRemove.preview);
        }
      },
      [files, onValueChange]
    );

    // Cleanup preview URLs on unmount
    React.useEffect(() => {
      return () => {
        files.forEach((file) => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview);
          }
        });
      };
    }, [files]);

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div
          {...getRootProps()}
          className={cn(
            'group relative grid h-52 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-5 py-2.5 text-center transition hover:bg-muted/25',
            'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isDragActive && 'border-muted-foreground/50',
            disabled && 'pointer-events-none opacity-60',
            dropZoneClassName
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-4 sm:px-5">
            <div className="rounded-full border border-dashed p-3">
              <Upload
                className={cn(
                  'size-7 text-muted-foreground transition-colors',
                  isDragActive && 'text-foreground'
                )}
              />
            </div>
            <div className="space-y-px">
              <p className="font-medium text-muted-foreground">
                {isDragActive ? (
                  'Drop the files here...'
                ) : (
                  <>
                    Drag & drop files here, or{' '}
                    <span className="text-foreground underline underline-offset-2">
                      click to browse
                    </span>
                  </>
                )}
              </p>
              <p className="text-sm text-muted-foreground/70">
                {dropzoneOptions?.accept
                  ? Object.keys(dropzoneOptions.accept).join(', ')
                  : 'You can upload any file type'}
              </p>
              {dropzoneOptions?.maxSize && (
                <p className="text-sm text-muted-foreground/70">
                  Max file size: {formatFileSize(dropzoneOptions.maxSize)}
                </p>
              )}
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Selected Files</h4>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md border border-muted px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <File className="size-4 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Dropzone.displayName = 'Dropzone';

export { Dropzone };
export type { DropzoneProps, FileWithPreview };