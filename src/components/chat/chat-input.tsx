"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onUpload?: (file: File) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onUpload,
  isLoading,
  disabled,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (message.trim() && !isLoading && !disabled) {
        onSend(message.trim());
        setMessage("");
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    },
    [message, isLoading, disabled, onSend],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
      e.target.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t bg-background p-4">
      <div className="flex gap-2 max-w-4xl mx-auto items-center">
        {onUpload && (
          <label htmlFor="file-upload">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              disabled={isLoading || disabled}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading || disabled}
            />
          </label>
        )}

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-lg border border-input bg-background",
              "px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "max-h-[200px]",
            )}
            style={{ minHeight: "44px" }}
          />
        </div>

        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || isLoading || disabled}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground text-center mt-2">
        Press Enter to send, Shift+Enter for new line
      </div>
    </form>
  );
}
