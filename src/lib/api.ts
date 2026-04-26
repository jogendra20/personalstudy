// ─── Onyx API Layer ───────────────────────────────────────────────────────────
// All logic lives here (no API routes) for static export + Capacitor compat.

export interface Article {
  id: string;
  title: string;
  url: string;
  source: "devto" | "medium";
  tag: string;
  publishedAt: string;
  readTime: string;
  cover?: string;
  description?: string;
}

// ─── RSS Feeds (defined in /api/feed/route.ts — server-side) ─────────────────

// ─── Feed ─────────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}

export async function fetchFeed(
  onBatch?: (articles: Article[]) => void
): Promise<Article[]> {
  const res = await fetch(`/api/feed?t=${Date.now()}`);
  if (!res.ok) throw new Error("Feed fetch failed");
  const articles: Article[] = await res.json();
  // Add IDs (not stored server-side)
  const tagged = articles.map((a, i) => ({ ...a, id: `${a.source}-${i}-${Date.now()}` }));
  if (onBatch) onBatch(tagged);
  return tagged;
}

// ─── Article Scraper ──────────────────────────────────────────────────────────
export interface ScrapedArticle {
  title: string;
  content: string;
  textContent: string;
  byline?: string;
  siteName?: string;
}

export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  // Use Freedium for Medium paywalled content
  const targetUrl = url.includes("medium.com")
    ? `https://freedium.cfd/${url}`
    : url;

  // Use AllOrigins CORS proxy for client-side fetch
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
  const res = await fetch(proxyUrl);
  const data = await res.json();
  const html: string = data.contents || "";

  // Basic extraction: strip scripts/styles, get body text
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? stripHtml(titleMatch[1]) : "Article";

  // Extract article body heuristically
  let content = html;
  content = content.replace(/<script[\s\S]*?<\/script>/gi, "");
  content = content.replace(/<style[\s\S]*?<\/style>/gi, "");
  content = content.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  content = content.replace(/<header[\s\S]*?<\/header>/gi, "");
  content = content.replace(/<footer[\s\S]*?<\/footer>/gi, "");

  // Try to find article/main tag
  const articleMatch =
    content.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

  const body = articleMatch ? articleMatch[1] : content;
  const textContent = stripHtml(body).replace(/\s+/g, " ").trim();

  // Preserve some basic HTML for rendering
  const cleanContent = body
    .replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, "<$1>$2</$1>")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "<p>$1</p>")
    .replace(/<(strong|em|code|pre|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi, "<$1>$2</$1>")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '<a href="$1">$2</a>')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '<img src="$1" />')
    .replace(/(<br\s*\/?>\s*){2,}/gi, "<br/>")
    .replace(/<(?!\/?(?:h[1-6]|p|strong|em|code|pre|blockquote|a|img|br|ul|ol|li)\b)[^>]+>/gi, "");

  return { title, content: cleanContent, textContent, siteName: url.includes("medium.com") ? "Medium" : "Dev.to" };
}

// ─── Ghostreader (Groq) ───────────────────────────────────────────────────────
export interface GhostreaderResponse {
  explanation: string;
}

export async function askGhostreader(
  highlight: string,
  context: string,
  groqApiKey: string
): Promise<GhostreaderResponse> {
  const systemPrompt = `You are Ghostreader — a sharp, concise reading companion. 
When the user highlights text, you explain it clearly: define terms, give context, 
connect concepts. Be direct, no fluff. Max 3 short paragraphs.`;

  const userPrompt = `Article context (first 800 chars):
${context.slice(0, 800)}

Highlighted text:
"${highlight}"

Explain this highlighted text in the context of the article.`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 512,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Groq API error");
  }

  const data = await res.json();
  return { explanation: data.choices[0].message.content };
}

// ─── Local Storage Helpers ────────────────────────────────────────────────────
export function getGroqKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("onyx_groq_key") || "";
}

export function setGroqKey(key: string): void {
  localStorage.setItem("onyx_groq_key", key);
}

export function getSavedArticles(): Article[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("onyx_saved") || "[]");
  } catch {
    return [];
  }
}

export function toggleSaveArticle(article: Article): boolean {
  const saved = getSavedArticles();
  const idx = saved.findIndex((a) => a.url === article.url);
  if (idx >= 0) {
    saved.splice(idx, 1);
    localStorage.setItem("onyx_saved", JSON.stringify(saved));
    return false;
  } else {
    saved.unshift(article);
    localStorage.setItem("onyx_saved", JSON.stringify(saved));
    return true;
  }
}

export function isArticleSaved(url: string): boolean {
  return getSavedArticles().some((a) => a.url === url);
}
