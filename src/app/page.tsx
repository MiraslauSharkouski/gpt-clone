"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageSquare, Upload, Sparkles, Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);
  const [authStatus, setAuthStatus] = useState<{
    isAuthenticated: boolean;
    email?: string;
    remaining?: number;
  } | null>(null);

  // Check auth and create session if needed
  useEffect(() => {
    async function initSession() {
      try {
        // Check current auth status
        const checkRes = await fetch("/api/auth/session");
        if (checkRes.ok) {
          const data = await checkRes.json();
          setAuthStatus({
            isAuthenticated: data.is_authenticated,
            email: data.email,
            remaining: data.remaining,
          });
        }

        // Create anonymous session if not authenticated
        const res = await fetch("/api/auth/anonymous", { method: "POST" });
        if (res.ok) {
          // Session cookie is set by the API
        }
      } catch (error) {
        console.error("Failed to initialize session:", error);
      } finally {
        setIsInitializing(false);
      }
    }

    initSession();
  }, []);

  const handleNewChat = async () => {
    try {
      const res = await fetch("/api/chats", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.session_created) {
          // Session was created, retry chat creation
          const retryRes = await fetch("/api/chats", { method: "POST" });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            router.push(`/chat/${retryData.chat.id}`);
          }
        } else if (data.chat) {
          router.push(`/chat/${data.chat.id}`);
        }
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">QwenChat</h1>
          <div className="flex items-center gap-4">
            {/* Auth Status Badge */}
            {authStatus && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-muted">
                <div
                  className={`w-2 h-2 rounded-full ${
                    authStatus.isAuthenticated
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                />
                {authStatus.isAuthenticated ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    {authStatus.remaining ?? 3} messages left
                  </span>
                )}
              </div>
            )}
            <Button onClick={handleNewChat}>
              <MessageSquare className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center">
        <div className="container max-w-2xl mx-auto px-4 text-center space-y-8 py-12">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome to ChatGPT
            </h2>
            <p className="text-muted-foreground text-lg">
              Your AI-powered chat assistant with document understanding
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-6 rounded-lg border bg-card text-card-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Smart Conversations</h3>
              <p className="text-sm text-muted-foreground">
                Chat with Qwen-2.5 AI for helpful, accurate responses
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card text-card-foreground">
              <Upload className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Document RAG</h3>
              <p className="text-sm text-muted-foreground">
                Upload PDFs, DOCX, or TXT files for context-aware answers
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card text-card-foreground">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Real-time Streaming</h3>
              <p className="text-sm text-muted-foreground">
                Get responses instantly with streaming technology
              </p>
            </div>
          </div>

          <Button size="lg" onClick={handleNewChat} className="mt-8">
            <MessageSquare className="mr-2 h-5 w-5" />
            Start Chatting
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Powered by Qwen-2.5 • Built with Next.js & Supabase
        </div>
      </footer>
    </div>
  );
}
