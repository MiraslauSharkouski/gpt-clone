"use client";

import React from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatList } from "./chat-list";
import { UserProfile } from "./user-profile";
import { cn } from "@/lib/utils";
import type { Chat } from "@/types";

interface SidebarProps {
  chats: Chat[];
  activeChatId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat?: (chatId: string) => void;
  email?: string | null;
  isAnonymous?: boolean;
  remainingMessages?: number;
  onUpgrade?: () => void;
  onSignOut?: () => void;
  isLoading?: boolean;
}

export function Sidebar({
  chats,
  activeChatId,
  isOpen,
  onClose,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  email,
  isAnonymous,
  remainingMessages,
  onUpgrade,
  onSignOut,
  isLoading,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-background border-r",
          "transform transition-transform duration-200 lg:transform-none",
          isOpen
            ? "translate-x-0 bg-white"
            : "-translate-x-full lg:translate-x-0 bg-white",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b lg:hidden">
            <h2 className="font-semibold">Chats</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Desktop title */}
          <div className="hidden lg:block p-4 border-b">
            <h2 className="font-semibold text-lg">
              <a href="/">ChatGPT</a>
            </h2>
          </div>

          {/* Chat list */}
          <ScrollArea className="flex-1">
            <ChatList
              chats={chats}
              activeChatId={activeChatId}
              onSelectChat={onSelectChat}
              onNewChat={onNewChat}
              onDeleteChat={onDeleteChat}
              isLoading={isLoading}
            />
          </ScrollArea>

          {/* User profile */}
          <UserProfile
            email={email}
            isAnonymous={isAnonymous}
            usageCount={0}
            remainingMessages={remainingMessages}
            onUpgrade={onUpgrade}
            onSignOut={onSignOut}
          />
        </div>
      </aside>
    </>
  );
}
