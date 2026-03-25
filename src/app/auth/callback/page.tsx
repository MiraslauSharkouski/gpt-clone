"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Verifying your email...");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function handleAuth() {
      try {
        // Supabase automatically handles the session from the URL hash
        let {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth error:", error);
          setStatus("Verification failed. Please try again.");
          setTimeout(() => router.push("/"), 3000);
          return;
        }

        if (!session) {
          // Wait a bit and try again (sometimes session takes time to establish)
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const retryResult = await supabase.auth.getSession();
          session = retryResult.data.session;

          if (!session) {
            setStatus("No session found. Please try again.");
            setTimeout(() => router.push("/"), 3000);
            return;
          }
        }

        // Successfully authenticated
        setStatus("Email verified! Redirecting to chat...");
        setSuccess(true);

        // Link anonymous session to authenticated user if exists
        const sessionId = getCookie("anonymous_session");

        if (sessionId && session) {
          try {
            await fetch("/api/auth/link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                session_id: sessionId,
                user_id: session.user.id,
              }),
            });
          } catch (e) {
            console.error("Failed to link session:", e);
          }
        }

        // Force a full page reload to refresh all state
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } catch (error) {
        console.error("Auth callback error:", error);
        setStatus("Error occurred. Redirecting...");
        setTimeout(() => router.push("/"), 3000);
      }
    }

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-4">
        {success ? (
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
        ) : (
          <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
        )}
        <h1 className="text-2xl font-bold">
          {success ? "Email Verified!" : "Verifying Email..."}
        </h1>
        <p className="text-muted-foreground">{status}</p>
        {!success && (
          <p className="text-sm text-muted-foreground">
            Please wait while we complete your sign in...
          </p>
        )}
      </div>
    </div>
  );
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}
