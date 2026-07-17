/**
 * supabase.ts — data access for ONYX.
 *
 * User actions (likes/saves/reads) are scoped to a real, unspoofable
 * per-visitor identity via Supabase Anonymous Auth (see
 * supabaseClient.ts). Row Level Security on `user_actions` restricts
 * each person to their own rows.
 *
 * Until the Supabase dashboard setup (enabling Anonymous Sign-ins +
 * the RLS migration) is done, signInAnonymously() will simply fail
 * quietly and the app keeps working exactly as before — this degrades
 * gracefully rather than breaking anything.
 */
import { getSupabase, ensureAnonymousSession } from "./supabaseClient";

// ── Articles (public content, no per-user scoping needed) ───────────
export async function getArticles(limit = 20, tag?: string) {
  const supabase = getSupabase();
  let query = supabase
    .from("articles")
    .select("*")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (tag) query = query.eq("tag", tag);
  const { data, error } = await query;
  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
  return data;
}

// ── User Actions (scoped to the signed-in anonymous session) ────────
export async function logAction(action: {
  url: string;
  action: "like" | "skip" | "save" | "read";
  tag: string;
  time_spent?: number;
}) {
  await ensureAnonymousSession();
  const supabase = getSupabase();
  const { error } = await supabase.from("user_actions").insert(action);
  if (error) throw new Error(`Supabase action failed: ${error.message}`);
}

export async function getUserActions() {
  await ensureAnonymousSession();
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_actions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return [];
  return data;
}
