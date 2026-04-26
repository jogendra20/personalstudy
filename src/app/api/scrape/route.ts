import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function extractBody(html: string): string {
  const attempts = [
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i),
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i),
    html.match(/<div[^>]*class="[^"]*(?:post|article|entry|content|story)[^"]*"[^>]*>([\s\S]*?)<\/div>/i),
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i),
  ];
  for (const m of attempts) {
    if (m?.[1] && m[1].length > 300) return m[1];
  }
  return html;
}

const ALLOWED = new Set([
  "h1","h2","h3","h4","h5","h6",
  "p","strong","em","b","i",
  "code","pre","blockquote",
  "a","img","br","hr",
  "ul","ol","li",
  "figure","figcaption",
]);

function sanitizeContent(html: string): string {
  return html
    .replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, "<$1>$2</$1>")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "<p>$1</p>")
    .replace(/<(strong|em|b|i|code|pre|blockquote|ul|ol|li)[^>]*>([\s\S]*?)<\/\1>/gi, "<$1>$2</$1>")
    .replace(/<br\s*\/?>/gi, "<br/>")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '<img src="$1" loading="lazy" />')
    .replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, "<figure>$1</figure>")
    .replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi, "<figcaption>$1</figcaption>")
    .replace(/<hr[^>]*>/gi, "<hr/>")
    .replace(/(<br\/>\s*){3,}/gi, "<br/><br/>")
    .replace(/<[a-z][a-z0-9]*[^>]*>/gi, (match) => {
      const tag = match.match(/^<([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase();
      return tag && ALLOWED.has(tag) ? match : "";
    })
    .replace(/<\/[a-z][a-z0-9]*>/gi, (match) => {
      const tag = match.match(/^<\/([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase();
      return tag && ALLOWED.has(tag) ? match : "";
    });
}

function isMediumDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "medium.com" || host.endsWith(".medium.com");
  } catch { return false; }
}

function isMediumSubpub(url: string): boolean {
  // e.g. python.plainenglish.io, towardsdatascience.com, betterprogramming.pub
  try {
    const host = new URL(url).hostname;
    const SUBPUBS = [
      "towardsdatascience.com","betterprogramming.pub","plainenglish.io",
      "javascript.plainenglish.io","python.plainenglish.io","levelup.gitconnected.com",
      "itnext.io","codeburst.io","hackernoon.com","blog.devgenius.io",
    ];
    return SUBPUBS.some(d => host === d || host.endsWith("." + d));
  } catch { return false; }
}

async function tryFetch(url: string): Promise<string> {
  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  const strategies: (() => Promise<string>)[] = [
    // 1. Direct fetch
    async () => {
      const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`Direct ${r.status}`);
      return r.text();
    },
    // 2. allorigins
    async () => {
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`allorigins ${r.status}`);
      const d = await r.json();
      if (!d.contents || d.contents.length < 200) throw new Error("allorigins empty");
      return d.contents;
    },
    // 3. corsproxy.io
    async () => {
      const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`corsproxy ${r.status}`);
      return r.text();
    },
    // 4. Freedium (Medium paywall bypass) — last resort for medium.com
    async () => {
      if (!isMediumDomain(url)) throw new Error("not medium");
      const freediumUrl = `https://freedium.cfd/${url}`;
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(freediumUrl)}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw new Error(`freedium ${r.status}`);
      const d = await r.json();
      if (!d.contents || d.contents.length < 200) throw new Error("freedium empty");
      return d.contents;
    },
  ];

  const errors: string[] = [];
  for (const strategy of strategies) {
    try {
      const html = await strategy();
      if (html && html.length > 200) return html;
    } catch (e: any) {
      errors.push(e.message);
    }
  }
  throw new Error(`All strategies failed: ${errors.join(" | ")}`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";

  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  const isFromMedium = isMediumDomain(url) || isMediumSubpub(url);
  const isDevTo = url.includes("dev.to");

  try {
    const raw = await tryFetch(url);

    const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = (titleMatch?.[1] || "Article")
      .replace(/\s*[|\-–—]\s*(Medium|DEV Community|dev\.to|Freedium|plainenglish\.io|towards[^<]*).*$/i, "")
      .trim();

    const cleaned = cleanHtml(raw);
    const body = extractBody(cleaned);
    const content = sanitizeContent(body);
    const textContent = stripHtml(body).slice(0, 3000);

    let siteName = "Article";
    if (isMediumDomain(url)) siteName = "Medium";
    else if (isMediumSubpub(url)) siteName = "Medium";
    else if (isDevTo) siteName = "DEV Community";
    else {
      try { siteName = new URL(url).hostname.replace("www.", ""); } catch {}
    }

    return NextResponse.json(
      { title, content, textContent, siteName },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } }
    );
  } catch (err: any) {
    // Return the detailed error so we can debug
    return NextResponse.json(
      { error: err.message || "Scrape failed" },
      { status: 500 }
    );
  }
}
