/**
 * supabase.ts — data access for ONYX.
 *
 * User actions (likes/saves/reads) are scoped to a real, unspoofable
 * per-visitor identity via Supabase Anonymous Auth (see
 * supabaseClient.ts). Row Level Security on `user_actions` restricts
 * each person to their own rows.
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

export async function upsertArticle(article: {
  url: string;
  title: string;
  source: string;
  tag: string;
  summary?: string;
  image_url?: string;
  image_source?: string;
  score?: number;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("articles")
    .upsert(article, { onConflict: "url" })
    .select();
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
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

// ── Feed Cache ────────────────────────────────────────────────────
export async function getFeedCache() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("feed_cache")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error || data || !data.length) return null;
  const cache = data[0];
  const age = Date.now() - new Date(cache.created_at).getTime();
  if (age > 60 * 60 * 1000) return null;
  return cache.feed;
}

export async function saveFeedCache(feed: object[]) {
  const supabase = getSupabase();
  const { error } = await supabase.from("feed_cache").insert({ feed });
  if (error) throw new Error(`Supabase cache failed: ${error.message}`);
}
