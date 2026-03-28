"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade?: (email: string) => Promise<void>;
}

export function UpgradeModal({
  open,
  onOpenChange,
  onUpgrade,
}: UpgradeModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    // Send magic link directly via Supabase
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    // If onUpgrade callback provided (for chat page), call it
    if (onUpgrade) {
      try {
        await onUpgrade(email);
      } catch (err) {
        // Ignore callback errors
      }
    }

    setSuccess(true);
    setIsLoading(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setEmail("");
    setError(null);
    setSuccess(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {success ? "Check Your Email" : "Sign In / Sign Up"}
          </DialogTitle>
          <DialogDescription>
            {success
              ? `We've sent a magic link to ${email}. Click the link in your email to sign in or create an account. Your chats will be preserved.`
              : "Enter your email address to receive a magic link. No password required! Verify your email for unlimited messages."}
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Magic Link
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-4">
            <div className="flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="text-sm text-muted-foreground text-center">
                Magic link sent! Check your inbox and click the link to complete
                sign in.
              </p>
            </div>
          </div>
        )}

        {!success && (
          <div className="text-xs text-muted-foreground text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
