import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
}

function clean(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, "")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "");
}

function extractBody(html: string): string {
  const a = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const b = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (a && a[1]) || (m && m[1]) || (b && b[1]) || html;
}

function format(raw: string): string {
  let o = raw;
  // Preserve block elements with newlines
  o = o.replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi,
    (_, tag, content) => `<${tag}>${stripTags(content)}</${tag}>\n`);
  o = o.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi,
    (_, c) => `<p>${c.trim()}</p>\n`);
  o = o.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    (_, c) => `<pre>${c}</pre>\n`);
  o = o.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, c) => `<blockquote>${c.trim()}</blockquote>\n`);
  o = o.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi,
    (_, c) => `<ul>${c}</ul>\n`);
  o = o.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi,
    (_, c) => `<ol>${c}</ol>\n`);
  o = o.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,
    (_, c) => `<li>${c.trim()}</li>`);
  // Inline elements
  o = o.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "<strong>$2</strong>");
  o = o.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "<em>$2</em>");
  o = o.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "<code>$1</code>");
  // Images
  o = o.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,
    '<img src="$1" alt="$2" />\n');
  o = o.replace(/<img[^>]*src="([^"]+)"[^>]*\/?>/gi,
    '<img src="$1" />\n');
  // Links
  o = o.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    '<a href="$1">$2</a>');
  o = o.replace(/<br\s*\/?>/gi, "<br/>");
  // Remove remaining unknown tags but preserve their text content
  o = o.replace(/<[a-zA-Z][^>]*>/g, "");
  o = o.replace(/<\/[a-zA-Z]+>/g, "");
  // Clean empty paragraphs and excess newlines
  o = o.replace(/<p>\s*<\/p>/gi, "");
  o = o.replace(/\n{4,}/g, "\n\n");
  return o.trim();
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  const isMedium = url.includes("medium.com");
  // Multiple fallback sources
  const targets = isMedium ? [
    "https://freedium.cfd/" + url,
    "https://md.vern.cc/" + url,
    "https://scribe.rip/" + url.replace("https://medium.com", ""),
  ] : [url];

  let lastError = "All sources failed";
  for (const targetUrl of targets) {
    try {
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) { lastError = "HTTP " + res.status; continue; }
      const html = await res.text();
      const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = stripTags((tm && tm[1]) || "Article")
        .replace("- Freedium", "").replace("| Medium", "")
        .replace("- Medium", "").replace("| DEV Community", "")
        .replace("- DEV Community", "").trim();
      const content = format(extractBody(clean(html)));
      const textContent = stripTags(content);
      if (textContent.length < 200) { lastError = "Content too short"; continue; }
      return NextResponse.json({
        title, content, textContent,
        siteName: isMedium ? "Medium" : "Dev.to",
      });
    } catch (e: any) {
      lastError = e.message;
    }
  }
  return NextResponse.json({ error: lastError }, { status: 500 });
}