"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  UserCircle,
  LogOut,
  LogIn,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UpgradeModal } from "@/components/chat/upgrade-modal";

export default function Home() {
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);
  const [authStatus, setAuthStatus] = useState<{
    isAuthenticated: boolean;
    email?: string;
    remaining?: number;
  } | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Check auth and create session if needed
  useEffect(() => {
    async function initSession() {
      try {
        // Check Supabase auth first (instant, client-side)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setAuthStatus({
            isAuthenticated: true,
            email: session.user.email || undefined,
            remaining: 999,
          });
        } else {
          setAuthStatus({
            isAuthenticated: false,
            remaining: 3,
          });
        }

        // Create anonymous session if not authenticated
        if (!session) {
          const res = await fetch("/api/auth/anonymous", { method: "POST" });
          if (res.ok) {
            // Session cookie is set by the API
          }
        }
      } catch (error) {
        console.error("Failed to initialize session:", error);
        setAuthStatus({
          isAuthenticated: false,
          remaining: 3,
        });
      } finally {
        setIsInitializing(false);
      }
    }

    initSession();

    // Listen for auth changes (instant updates)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthStatus({
        isAuthenticated: !!session,
        email: session?.user?.email || undefined,
        remaining: session ? 999 : 3,
      });
    });

    return () => subscription.unsubscribe();
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthStatus({
      isAuthenticated: false,
      remaining: 3,
    });
    window.location.reload();
  };

  const handleSignIn = () => {
    setUpgradeModalOpen(true);
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
            {/* Auth Status Dropdown Menu */}
            {authStatus && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    {authStatus.isAuthenticated ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="hidden sm:inline">✓ Verified</span>
                      </>
                    ) : (
                      <>
                        <UserCircle className="w-4 h-4 text-yellow-500" />
                        <span className="hidden sm:inline">
                          {authStatus.remaining ?? 3} messages left
                        </span>
                      </>
                    )}
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {authStatus.isAuthenticated ? (
                    <>
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="font-medium">✓ Verified</span>
                          </div>
                          {authStatus.email && (
                            <span className="text-xs text-muted-foreground truncate">
                              {authStatus.email}
                            </span>
                          )}
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center gap-2">
                            <UserCircle className="w-4 h-4 text-yellow-500" />
                            <span className="font-medium">Anonymous User</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {authStatus.remaining ?? 3} messages remaining
                          </span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignIn}>
                        <LogIn className="mr-2 h-4 w-4" />
                        <span>Sign In / Sign Up</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
              Welcome to QwenChat
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

      {/* Sign In / Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
      />
    </div>
  );
}
