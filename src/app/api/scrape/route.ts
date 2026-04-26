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
    .replace(/<- Root:    pkg install[\s\S]*?-->/g, "");
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

function sanitizeContent(html: string): string {
  return html
    .replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, "<$1>$2</$1>")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "<p>$1</p>")
    .replace(/<(strong|em|code|pre|blockquote|ul|ol|li|br)[^>]*>([\s\S]*?)<\/\1>/gi, "<$1>$2</$1>")
    .replace(/<br\s*\/?>/gi, "<br/>")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '<img src="$1" loading="lazy" />')
    .replace(/(<br\/>\s*){3,}/gi, "<br/><br/>")
    .replace(/<(?h[1-6]|p|strong|em|code|pre|blockquote|a|img|br|ul|ol|li|figure|figcaption|hr)\b)[^>]+>/gi, "");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";

  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  const isMedium = url.includes("medium.com");
  const isDevTo = url.includes("dev.to");

  // For Medium, use Freedium to bypass paywall
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

    // Extract title — strip site suffix
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
