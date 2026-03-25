"use client";

import React, { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "./message";
import type { Message as MessageType } from "@/types";

interface MessageListProps {
  messages: MessageType[];
  streamingMessage?: string;
  isStreaming?: boolean;
}

export function MessageList({
  messages,
  streamingMessage,
  isStreaming,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  return (
    <ScrollArea className="flex-1 w-full">
      <div ref={scrollRef} className="flex flex-col gap-4 p-4 min-h-full">
        {messages.length === 0 && !streamingMessage && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Welcome to ChatGPT</p>
              <p className="text-sm">
                Start a conversation or upload a document
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <Message
            key={message.id || index}
            role={message.role}
            content={message.content}
            createdAt={message.created_at}
          />
        ))}

        {streamingMessage && (
          <Message
            role="assistant"
            content={streamingMessage}
            isStreaming={isStreaming}
          />
        )}

        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
