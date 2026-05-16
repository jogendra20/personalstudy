/**
 * nexus.ts - NEXUS client for ONYX
 * All AI + search calls go through NEXUS
 */

const NEXUS_URL = process.env.NEXUS_URL || "https://nexus-56tm.onrender.com"\;
const NEXUS_SECRET = process.env.NEXUS_SECRET || "";

const headers = {
  "Content-Type": "application/json",
  "X-API-Key": NEXUS_SECRET,
};

// ── Text ─────────────────────────────────────────────────────────
export async function nexusAsk(
  prompt: string,
  task: "trading" | "reasoning" | "coding" | "search" | "premium" | "default" = "default"
): Promise<string> {
  const res = await fetch(`${NEXUS_URL}/ask`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt, task }),
  });
  if (!res.ok) throw new Error(`NEXUS /ask failed: ${res.status}`);
  const data = await res.json();
  return data.response as string;
}

// ── Search ───────────────────────────────────────────────────────
export async function nexusSearch(
  query: string,
  max_results = 5,
  freshness: "day" | "week" | "month" | "any" = "day"
): Promise<{ title: string; url: string; snippet: string; source: string; published_date: string }[]> {
  const res = await fetch(`${NEXUS_URL}/search`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, max_results, freshness }),
  });
  if (!res.ok) throw new Error(`NEXUS /search failed: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

// ── Image ────────────────────────────────────────────────────────
export async function nexusImage(prompt: string): Promise<{
  image_url?: string;
  image_b64?: string;
  provider: string;
}> {
  const res = await fetch(`${NEXUS_URL}/image`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt, callback_url: "none" }), // skip Telegram
  });
  if (!res.ok) throw new Error(`NEXUS /image failed: ${res.status}`);
  return res.json();
}
