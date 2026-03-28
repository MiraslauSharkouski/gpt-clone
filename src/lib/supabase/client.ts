import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Client-side Supabase client
 * Use this in browser components and client-side code
 */
export const supabase = createClient<Database>(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  },
);

/**
 * Server-side Supabase client with service role
 * Use this ONLY in API routes and server components
 * NEVER expose this to the client
 */
export const createServerClient = () => {
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";
  return createClient<Database>(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
};
