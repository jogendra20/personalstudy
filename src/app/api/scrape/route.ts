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
    html.match(/class="[^"]*(?:article|post|entry|story|content)-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i),
    html.match(/class="[^"]*(?:article|post|entry|story)[^"]*"[^>]*>([\s\S]*?)<\/(?:article|div|section)>/i),
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i),
  ];
  for (const m of attempts) {
    if (m?.[1] && m[1].length > 200) return m[1];
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
  // Preserve allowed tags, strip everything else
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";

  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  const isMedium = url.includes("medium.com");
  const isDevTo = url.includes("dev.to");
  const targetUrl = isMedium ? `https://freedium.cfd/${url}` : url;

  try {
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Onyx/1.0)" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) throw new Error(`Proxy returned ${res.status}`);

    const data = await res.json();
    const raw: string = data.contents || "";

    if (!raw || raw.length < 100) throw new Error("Empty response");

    const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = (titleMatch?.[1] || "Article")
      .replace(/\s*[|\-–—]\s*(Medium|DEV Community|dev\.to).*$/i, "")
      .trim();

    const cleaned = cleanHtml(raw);
    const body = extractBody(cleaned);
    const content = sanitizeContent(body);
    const textContent = stripHtml(body).slice(0, 3000);
    const siteName = isMedium ? "Medium" : isDevTo ? "DEV Community" : new URL(url).hostname;

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
