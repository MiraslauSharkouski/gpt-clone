"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
  createdAt?: string;
}

export function Message({
  role,
  content,
  isStreaming,
  createdAt,
}: MessageProps) {
  const isUser = role === "user";
  const isSystem = role === "system";

  if (isSystem) return null; // Don't render system messages

  return (
    <div
      className={cn(
        "flex w-full message-enter",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {content}
          {isStreaming && <span className="typewriter-cursor" />}
        </div>
        {createdAt && (
          <div
            className={cn(
              "mt-1 text-xs",
              isUser ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {new Date(createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </div>
  );
}
