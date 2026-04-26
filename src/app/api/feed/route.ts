import { NextResponse } from "next/server";

export const runtime = "edge";
export const revalidate = 300;

interface FeedItem {
  title: string;
  url: string;
  source: "devto" | "medium";
  tag: string;
  publishedAt: string;
  readTime: string;
  cover?: string;
  description?: string;
}

const FEEDS = [
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
  { url: "https://dev.to/feed/tag/career",                 source: "devto", tag: "Career" },
  { url: "https://dev.to/feed/tag/react",                  source: "devto", tag: "Web Dev" },
  { url: "https://dev.to/feed/tag/security",               source: "devto", tag: "Security" },
  { url: "https://medium.com/feed/tag/machine-learning",        source: "medium", tag: "ML" },
  { url: "https://medium.com/feed/tag/deep-learning",           source: "medium", tag: "ML" },
  { url: "https://medium.com/feed/tag/artificial-intelligence", source: "medium", tag: "AI" },
  { url: "https://medium.com/feed/tag/llm",                     source: "medium", tag: "AI" },
  { url: "https://medium.com/feed/tag/python",                  source: "medium", tag: "Python" },
  { url: "https://medium.com/feed/tag/data-science",            source: "medium", tag: "ML" },
  { url: "https://medium.com/feed/tag/data-structures",         source: "medium", tag: "DSA" },
  { url: "https://medium.com/feed/tag/algorithms",              source: "medium", tag: "DSA" },
  { url: "https://medium.com/feed/tag/leetcode",                source: "medium", tag: "DSA" },
  { url: "https://medium.com/feed/tag/system-design",           source: "medium", tag: "System Design" },
  { url: "https://medium.com/feed/tag/web-development",         source: "medium", tag: "Web Dev" },
  { url: "https://medium.com/feed/tag/programming",             source: "medium", tag: "Programming" },
  { url: "https://medium.com/feed/tag/software-engineering",    source: "medium", tag: "Programming" },
  { url: "https://medium.com/feed/tag/devops",                  source: "medium", tag: "DevOps" },
  { url: "https://medium.com/feed/tag/linux",                   source: "medium", tag: "Linux" },
  { url: "https://medium.com/feed/tag/trading",                 source: "medium", tag: "Trading" },
  { url: "https://medium.com/feed/tag/algorithmic-trading",     source: "medium", tag: "Trading" },
  { url: "https://medium.com/feed/tag/stock-market",            source: "medium", tag: "Trading" },
  { url: "https://medium.com/feed/tag/career",                  source: "medium", tag: "Career" },
  { url: "https://medium.com/feed/tag/cybersecurity",           source: "medium", tag: "Security" },
  { url: "https://medium.com/feed/tag/natural-language-processing", source: "medium", tag: "ML" },
  { url: "https://medium.com/feed/tag/reinforcement-learning",  source: "medium", tag: "ML" },
  { url: "https://medium.com/feed/tag/fastapi",                 source: "medium", tag: "Python" },
  { url: "https://medium.com/feed/tag/interview",               source: "medium", tag: "Career" },
] as const;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}

function estimateReadTime(text: string): string {
  const words = stripHtml(text).split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function extractCover(xml: string): string | undefined {
  const media = xml.match(/<media:content[^>]+url="([^"]+)"/i);
  const enclosure = xml.match(/<enclosure[^>]+url="([^"]+)"/i);
  const img = xml.match(/<img[^>]+src="([^"]+)"/i);
  const url = media?.[1] || enclosure?.[1] || img?.[1];
  if (!url || url.includes("avatar") || url.includes("icon") || url.length < 20) return undefined;
  return url;
}

// Clean Medium URLs — strip ?source=rss... tracking params
function cleanUrl(url: string, source: string): string {
  if (source === "medium") {
    try {
      const u = new URL(url);
      // Remove all query params — Medium article URLs don't need them
      u.search = "";
      // Also normalize subdomains like pub.towardsai.net → keep as-is
      // but ensure it's a proper medium.com or known subdomain article
      return u.toString();
    } catch {
      return url;
    }
  }
  return url;
}

function parseRSS(xml: string, source: string, tag: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemMatches = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi));

  for (const match of itemMatches) {
    const item = match[1];

    const title = stripHtml(
      (item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
       item.match(/<title>([\s\S]*?)<\/title>/i))?.[1] || ""
    ).trim();

    const rawLink = (
      item.match(/<link>([\s\S]*?)<\/link>/i) ||
      item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)
    )?.[1]?.trim() || "";

    const link = cleanUrl(rawLink, source);

    const desc = (
      item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
      item.match(/<description>([\s\S]*?)<\/description>/i)
    )?.[1] || "";

    const content = (
      item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/i) ||
      item.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i)
    )?.[1] || desc;

    const pubDate = (
      item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)
    )?.[1]?.trim() || new Date().toISOString();

    if (!title || !link) continue;

    // Skip non-article URLs
    if (!link.startsWith("http")) continue;

    items.push({
      title,
      url: link,
      source: source as "devto" | "medium",
      tag,
      publishedAt: pubDate,
      readTime: estimateReadTime(content || desc),
      cover: extractCover(item),
      description: stripHtml(desc).slice(0, 150),
    });
  }

  return items.slice(0, 5);
}

async function fetchOneFeed(feed: { url: string; source: string; tag: string }): Promise<FeedItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Onyx/1.0; RSS Reader)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml, feed.source, feed.tag);
  } catch {
    return [];
  }
}

export async function GET() {
  const results = await Promise.allSettled(FEEDS.map(fetchOneFeed));

  const all: FeedItem[] = [];
  const seen = new Set<string>();

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const item of r.value) {
      const key = item.title.toLowerCase().slice(0, 60);
      if (seen.has(key) || !item.url || !item.title) continue;
      seen.add(key);
      all.push(item);
    }
  }

  all.sort(() => Math.random() - 0.5);

  return NextResponse.json(all, {
    headers: {
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
