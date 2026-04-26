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
  ];
  for (const m of attempts) {
    if (m?.[1] && m[1].length > 300) return m[1];
  }
  // Last resort: everything between body tags
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return body?.[1] || html;
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

async function fetchViaProxy(targetUrl: string): Promise<string> {
  const proxies = [
    // Proxy 1: allorigins
    async () => {
      const r = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!r.ok) throw new Error("allorigins failed");
      const d = await r.json();
      if (!d.contents) throw new Error("allorigins empty");
      return d.contents as string;
    },
    // Proxy 2: corsproxy.io
    async () => {
      const r = await fetch(
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; Onyx/1.0)" },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!r.ok) throw new Error("corsproxy failed");
      return await r.text();
    },
    // Proxy 3: direct fetch (works for dev.to, fails for Medium)
    async () => {
      const r = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`Direct fetch failed: ${r.status}`);
      return await r.text();
    },
  ];

  for (const proxy of proxies) {
    try {
      const html = await proxy();
      if (html && html.length > 200) return html;
    } catch {
      // try next proxy
    }
  }
  throw new Error("All proxies failed");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";

  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  const isMedium = url.includes("medium.com");
  const isDevTo = url.includes("dev.to");

  // Use Freedium for Medium to bypass paywall
  const targetUrl = isMedium ? `https://freedium.cfd/${url}` : url;

  try {
    const raw = await fetchViaProxy(targetUrl);

    const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = (titleMatch?.[1] || "Article")
      .replace(/\s*[|\-–—]\s*(Medium|DEV Community|dev\.to|Freedium).*$/i, "")
      .trim();

    const cleaned = cleanHtml(raw);
    const body = extractBody(cleaned);
    const content = sanitizeContent(body);
    const textContent = stripHtml(body).slice(0, 3000);
    const siteName = isMedium
      ? "Medium"
      : isDevTo
      ? "DEV Community"
      : new URL(url).hostname;

    return NextResponse.json(
      { title, content, textContent, siteName },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Scrape failed" },
      { status: 500 }
    );
  }
}
