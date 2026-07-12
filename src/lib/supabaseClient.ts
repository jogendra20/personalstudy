/**
 * supabaseClient.ts — one real, unspoofable identity per visitor.
 *
 * Uses Supabase's built-in Anonymous Auth instead of a hand-rolled
 * localStorage UUID. The difference matters: a client-generated ID is
 * just a value anyone can read or fake with browser dev tools, so it
 * can't be trusted by Row Level Security. An anonymous *auth* session
 * is issued and verified server-side by Supabase's auth service — RLS
 * policies can genuinely trust it (`auth.uid() = user_id`). The same
 * identity can later be upgraded to a full account (email/social)
 * without losing the person's history.
 *
 * See the SQL migration notes alongside this file for the exact RLS
 * policies this depends on.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";

let client: SupabaseClient | null = null;
let anonSignInPromise: Promise<void> | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

export function ensureAnonymousSession(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!anonSignInPromise) {
    anonSignInPromise = (async () => {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) console.error("Anonymous sign-in failed:", error.message);
      }
    })();
  }
  return anonSignInPromise;
}
