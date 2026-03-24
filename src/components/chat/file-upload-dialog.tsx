'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, Loader2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadDialogProps {
  chatId: string;
  onUpload: (file: File, chatId: string) => Promise<void>;
  disabled?: boolean;
}

export function FileUploadDialog({ chatId, onUpload, disabled }: FileUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const allowedTypes = ['pdf', 'docx', 'txt'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedTypes.includes(fileExtension)) {
        setError('File type must be PDF, DOCX, or TXT');
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setError(null);
      setFileName(file.name);
      setIsUploading(true);

      try {
        await onUpload(file, chatId);
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setFileName(null);
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload file');
      } finally {
        setIsUploading(false);
      }
    },
    [chatId, onUpload]
  );

  const handleClose = () => {
    setOpen(false);
    setError(null);
    setSuccess(false);
    setFileName(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a PDF, DOCX, or TXT file. The content will be processed and used to provide context-aware responses.
            Maximum file size: 10MB.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {!success ? (
            <div className="space-y-4">
              <label
                className={cn(
                  'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer',
                  'hover:bg-accent transition-colors',
                  isUploading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin mb-2 text-muted-foreground" />
                  ) : (
                    <FileText className="w-8 h-8 mb-2 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {isUploading ? 'Processing...' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOCX, TXT (MAX. 10MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>

              {fileName && !success && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  <span className="truncate">{fileName}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
              <p className="text-sm font-medium">Document uploaded successfully!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
