"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { MessageList, ChatInput, TypingIndicator } from "@/components/chat";
import {
  UpgradeModal,
  FileUploadDialog,
} from "@/components/chat/auth-components";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Menu, Plus } from "lucide-react";
import type { Chat, Message } from "@/types";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const chatId = params.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(true);

  // Auth state
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [remainingMessages, setRemainingMessages] = useState(3);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Load chats
  const loadChats = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error("Failed to load chats:", error);
    } finally {
      setIsSidebarLoading(false);
    }
  }, []);

  // Load chat messages
  const loadMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.chat?.messages || []);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }, []);

  // Check auth status
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check");
      if (res.ok) {
        const data = await res.json();
        setIsAnonymous(!data.is_authenticated);
        setRemainingMessages(data.remaining ?? 3);
        if (data.upgrade_required) {
          setUpgradeModalOpen(true);
        }
      }
    } catch (error) {
      console.error("Failed to check auth:", error);
    }
  }, []);

  useEffect(() => {
    loadChats();
    checkAuth();
  }, [loadChats, checkAuth]);

  useEffect(() => {
    if (chatId) {
      loadMessages(chatId);
    } else {
      setMessages([]);
    }
  }, [chatId, loadMessages]);

  // Create new chat
  const handleNewChat = useCallback(async () => {
    try {
      const res = await fetch("/api/chats", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        loadChats();
        router.push(`/chat/${data.chat.id}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
    }
  }, [loadChats, router, toast]);

  // Select chat
  const handleSelectChat = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);
      setSidebarOpen(false);
    },
    [router],
  );

  // Delete chat
  const handleDeleteChat = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
        if (res.ok) {
          loadChats();
          if (chatId === id) {
            // Stay on the same page, just clear the current chat
            // Don't redirect to home
          }
          toast({
            title: "Success",
            description: "Chat deleted",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete chat",
          variant: "destructive",
        });
      }
    },
    [chatId, loadChats, toast],
  );

  // Send message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!chatId) {
        // Create new chat if none selected
        const res = await fetch("/api/chats", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          loadChats();
          router.push(`/chat/${data.chat.id}`);
          // Message will be sent after navigation
          return;
        }
      }

      setIsLoading(true);
      setStreamingMessage("");

      try {
        const res = await fetch(`/api/chats/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, useRag: true }),
        });

        if (res.status === 403) {
          const data = await res.json();
          if (data.error === "upgrade_required") {
            setUpgradeModalOpen(true);
            setIsLoading(false);
            return;
          }
        }

        if (!res.ok) {
          throw new Error("Failed to send message");
        }

        // Add user message optimistically
        const userMessage: Message = {
          id: Date.now().toString(),
          chat_id: chatId,
          role: "user",
          content,
          metadata: {},
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);

        // Stream response
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter((l) => l.trim());

            for (const line of lines) {
              if (line.startsWith("data:")) {
                try {
                  const data = JSON.parse(line.replace("data:", "").trim());
                  if (data.content) {
                    setStreamingMessage((prev) => prev + data.content);
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        }

        // Add assistant message after streaming
        if (streamingMessage) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            chat_id: chatId,
            role: "assistant",
            content: streamingMessage,
            metadata: {},
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }

        // Update remaining messages
        setRemainingMessages((prev) => Math.max(0, prev - 1));
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setStreamingMessage("");
      }
    },
    [chatId, loadChats, router, toast, streamingMessage],
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File, uploadChatId: string) => {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`/api/chats/${uploadChatId}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        toast({
          title: "Success",
          description: "Document uploaded and processed",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Upload failed",
          variant: "destructive",
        });
        throw error;
      }
    },
    [toast],
  );

  // Handle upgrade
  const handleUpgrade = useCallback(
    async (email: string) => {
      // Get session from auth check endpoint instead of reading cookie directly
      const checkRes = await fetch("/api/auth/check");
      const checkData = await checkRes.json();

      const sessionId = checkData.session_id;

      if (!sessionId) {
        throw new Error("No active session found");
      }

      const res = await fetch("/api/auth/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upgrade failed");
      }

      // If already upgraded (dev mode or instant upgrade)
      if (data.upgraded || data.dev_mode) {
        setEmail(email);
        setIsAnonymous(false);
        setRemainingMessages(999); // Unlimited for authenticated users
        toast({
          title: "Email verified!",
          description: "You now have unlimited messages",
        });
      } else if (data.pending_verification) {
        setEmail(email);
        toast({
          title: "Verification email sent",
          description:
            "Check your inbox and click the link to complete upgrade",
        });
      } else {
        setEmail(email);
        toast({
          title: "Verification email sent",
          description: "Check your inbox to verify your email",
        });
      }
    },
    [setEmail, setRemainingMessages, toast],
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        chats={chats}
        activeChatId={chatId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        email={email}
        isAnonymous={isAnonymous}
        remainingMessages={remainingMessages}
        onUpgrade={() => setUpgradeModalOpen(true)}
        isLoading={isSidebarLoading}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-lg">
              {chats.find((c) => c.id === chatId)?.title || "New Chat"}
            </h1>
          </div>
          <FileUploadDialog
            chatId={chatId || ""}
            onUpload={handleFileUpload}
            disabled={!chatId}
          />
        </header>

        {/* Messages */}
        <MessageList
          messages={messages}
          streamingMessage={streamingMessage}
          isStreaming={isLoading}
        />

        {/* Typing indicator */}
        {isLoading && (
          <div className="px-4 pb-2">
            <TypingIndicator />
          </div>
        )}

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          disabled={!chatId && remainingMessages === 0}
        />
      </main>

      {/* Upgrade modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
