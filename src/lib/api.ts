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

// ─── RSS Feeds ────────────────────────────────────────────────────────────────
const RSS_PROXY = "https://api.rss2json.com/v1/api.json?rss_url=";

const FEEDS = [
  // ── Dev.to ──────────────────────────────────────────────────────────────
  { url: "https://dev.to/feed/tag/machinelearning",        source: "devto", tag: "ML" },
  { url: "https://dev.to/feed/tag/deeplearning",           source: "devto", tag: "ML" },
  { url: "https://dev.to/feed/tag/artificialintelligence", source: "devto", tag: "AI" },
  { url: "https://dev.to/feed/tag/llm",                   source: "devto", tag: "AI" },
  { url: "https://dev.to/feed/tag/python",                 source: "devto", tag: "Python" },
  { url: "https://dev.to/feed/tag/datastructures",         source: "devto", tag: "DSA" },
  { url: "https://dev.to/feed/tag/algorithms",             source: "devto", tag: "DSA" },
  { url: "https://dev.to/feed/tag/webdev",                 source: "devto", tag: "Web Dev" },
  { url: "https://dev.to/feed/tag/nextjs",                 source: "devto", tag: "Web Dev" },
  { url: "https://dev.to/feed/tag/programming",            source: "devto", tag: "Programming" },
  { url: "https://dev.to/feed/tag/typescript",             source: "devto", tag: "Programming" },
  { url: "https://dev.to/feed/tag/systemdesign",           source: "devto", tag: "System Design" },
  { url: "https://dev.to/feed/tag/database",               source: "devto", tag: "System Design" },
  { url: "https://dev.to/feed/tag/devops",                 source: "devto", tag: "DevOps" },
  { url: "https://dev.to/feed/tag/docker",                 source: "devto", tag: "DevOps" },
  { url: "https://dev.to/feed/tag/linux",                  source: "devto", tag: "Linux" },
  { url: "https://dev.to/feed/tag/terminal",               source: "devto", tag: "Linux" },
  { url: "https://dev.to/feed/tag/career",                 source: "devto", tag: "Career" },
  { url: "https://dev.to/feed/tag/productivity",           source: "devto", tag: "Career" },
  { url: "https://dev.to/feed/tag/beginners",              source: "devto", tag: "Programming" },
  { url: "https://dev.to/feed/tag/react",                  source: "devto", tag: "Web Dev" },
  { url: "https://dev.to/feed/tag/opensource",             source: "devto", tag: "Programming" },
  { url: "https://dev.to/feed/tag/security",               source: "devto", tag: "Security" },
  { url: "https://dev.to/feed/tag/api",                    source: "devto", tag: "System Design" },
  { url: "https://dev.to/feed/tag/agentai",                source: "devto", tag: "AI" },

  // ── Medium ───────────────────────────────────────────────────────────────
  { url: "https://medium.com/feed/tag/machine-learning",        source: "medium", tag: "ML" },
  { url: "https://medium.com/feed/tag/deep-learning",           source: "medium", tag: "ML" },
  { url: "https://medium.com/feed/tag/neural-networks",         source: "medium", tag: "ML" },
  { url: "https://medium.com/feed/tag/artificial-intelligence", source: "medium", tag: "AI" },
  { url: "https://medium.com/feed/tag/llm",                     source: "medium", tag: "AI" },
  { url: "https://medium.com/feed/tag/chatgpt",                 source: "medium", tag: "AI" },
  { url: "https://medium.com/feed/tag/python",                  source: "medium", tag: "Python" },
  { url: "https://medium.com/feed/tag/data-science",            source: "medium", tag: "ML" },
  { url: "https://medium.com/feed/tag/data-structures",         source: "medium", tag: "DSA" },
  { url: "https://medium.com/feed/tag/algorithms",              source: "medium", tag: "DSA" },
  { url: "https://medium.com/feed/tag/leetcode",                source: "medium", tag: "DSA" },
  { url: "https://medium.com/feed/tag/system-design",           source: "medium", tag: "System Design" },
  { url: "https://medium.com/feed/tag/software-architecture",   source: "medium", tag: "System Design" },
  { url: "https://medium.com/feed/tag/web-development",         source: "medium", tag: "Web Dev" },
  { url: "https://medium.com/feed/tag/programming",             source: "medium", tag: "Programming" },
  { url: "https://medium.com/feed/tag/software-engineering",    source: "medium", tag: "Programming" },
  { url: "https://medium.com/feed/tag/devops",                  source: "medium", tag: "DevOps" },
  { url: "https://medium.com/feed/tag/linux",                   source: "medium", tag: "Linux" },
  { url: "https://medium.com/feed/tag/trading",                 source: "medium", tag: "Trading" },
  { url: "https://medium.com/feed/tag/algorithmic-trading",     source: "medium", tag: "Trading" },
  { url: "https://medium.com/feed/tag/stock-market",            source: "medium", tag: "Trading" },
  { url: "https://medium.com/feed/tag/career",                  source: "medium", tag: "Career" },
  { url: "https://medium.com/feed/tag/productivity",            source: "medium", tag: "Career" },
  { url: "https://medium.com/feed/tag/cybersecurity",           source: "medium", tag: "Security" },
  { url: "https://medium.com/feed/tag/reinforcement-learning",  source: "medium", tag: "ML" },
  { url: "https://medium.com/feed/tag/natural-language-processing", source: "medium", tag: "ML" },
  { url: "https://medium.com/feed/tag/open-source",             source: "medium", tag: "Programming" },
  { url: "https://medium.com/feed/tag/fastapi",                 source: "medium", tag: "Python" },
  { url: "https://medium.com/feed/tag/interview",               source: "medium", tag: "Career" },
] as const;

function estimateReadTime(text: string): string {
  const words = text.replace(/<[^>]*>/g, "").split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}

export async function fetchFeed(): Promise<Article[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const res = await fetch(
        `${RSS_PROXY}${encodeURIComponent(feed.url)}&count=6`
      );
      const data = await res.json();
      if (data.status !== "ok") return [];

      return data.items.map((item: any, i: number): Article => ({
        id: `${feed.source}-${feed.tag}-${i}-${Date.now()}`,
        title: item.title || "Untitled",
        url: item.link || item.guid || "",
        source: feed.source as "devto" | "medium",
        tag: feed.tag,
        publishedAt: item.pubDate || new Date().toISOString(),
        readTime: estimateReadTime(item.content || item.description || ""),
        cover: item.thumbnail || item.enclosure?.link || undefined,
        description: stripHtml(item.description || item.content || "").slice(0, 140),
      }));
    })
  );

  const all: Article[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  // Deduplicate by title, shuffle
  const seen = new Set<string>();
  const unique = all.filter((a) => {
    const key = a.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.sort(() => Math.random() - 0.5);
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
