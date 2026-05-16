/**
 * supabase.ts - Supabase client for ONYX
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

// ── Articles ──────────────────────────────────────────────────────
export async function getArticles(limit = 20, tag?: string) {
  let url = `${SUPABASE_URL}/rest/v1/articles?order=score.desc,created_at.desc&limit=${limit}`;
  if (tag) url += `&tag=eq.${tag}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status}`);
  return res.json();
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/articles`, {
    method: "POST",
    headers: { ...headers, "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify(article),
  });
  if (!res.ok) throw new Error(`Supabase upsert failed: ${res.status}`);
  return res.json();
}

// ── User Actions ──────────────────────────────────────────────────
export async function logAction(action: {
  url: string;
  action: "like" | "skip" | "save" | "read";
  tag: string;
  time_spent?: number;
}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_actions`, {
    method: "POST",
    headers,
    body: JSON.stringify(action),
  });
  if (!res.ok) throw new Error(`Supabase action failed: ${res.status}`);
}

export async function getUserActions() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_actions?order=created_at.desc&limit=100`,
    { headers }
  );
  if (!res.ok) return [];
  return res.json();
}

// ── Feed Cache ────────────────────────────────────────────────────
export async function getFeedCache() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/feed_cache?order=created_at.desc&limit=1`,
    { headers }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  const cache = data[0];
  // 1 hour cache
  const age = Date.now() - new Date(cache.created_at).getTime();
  if (age > 60 * 60 * 1000) return null;
  return cache.feed;
}

export async function saveFeedCache(feed: object[]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/feed_cache`, {
    method: "POST",
    headers,
    body: JSON.stringify({ feed }),
  });
  if (!res.ok) throw new Error(`Supabase cache failed: ${res.status}`);
}
