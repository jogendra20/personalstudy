import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<- Root:    pkg install[\s\S]*?-->/g, "");
}

function extractBody(html: string): string {
  const a = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const b = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (a && a[1]) || (m && m[1]) || (b && b[1]) || html;
}

function formatContent(raw: string): string {
  let out = raw;

  // Normalize headings
  out = out.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "<h1>$1</h1>");
  out = out.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "<h2>$1</h2>");
  out = out.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "<h3>$1</h3>");
  out = out.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "<h4>$1</h4>");

  // Paragraphs
  out = out.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "<p>$1</p>");

  // Inline formatting
  out = out.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "<strong>$2</strong>");
  out = out.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "<em>$2</em>");
  out = out.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "<code>$1</code>");
  out = out.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "<pre>$1</pre>");
  out = out.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "<blockquote>$1</blockquote>");

  // Lists
  out = out.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "<ul>$1</ul>");
  out = out.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "<ol>$1</ol>");
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<li>$1</li>");

  // Images
  out = out.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '<img src="$1" alt="$2" />');
  out = out.replace(/<img[^>]*src="([^"]+)"[^>]*\/?>/gi, '<img src="$1" />');

  // Links
  out = out.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '<a href="$1">$2</a>');

  // Line breaks
  out = out.replace(/<br\s*\/?>/gi, "<br/>");

  // Remove all other tags but keep content
  out = out.replace(/<(?!(h[1-6]|p|strong|em|code|pre|blockquote|a|img|br|ul|ol|li))[^>]+>/gi, "");

  // Clean up excess whitespace between tags
  out = out.replace(/>\s{2,}</g, "><");
  out = out.replace(/\s{3,}/g, " ");

  return out.trim();
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  const isMedium = url.includes("medium.com");
  const targetUrl = isMedium ? "https://freedium.cfd/" + url : url;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return NextResponse.json({ error: "Fetch failed: " + res.status }, { status: 502 });

    const html = await res.text();
    const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = stripTags((tm && tm[1]) || "Article");
    const title = rawTitle.replace("- Freedium", "").replace("| Medium", "").trim();

    const cleaned = cleanHtml(html);
    const body = extractBody(cleaned);
    const content = formatContent(body);
    const textContent = stripTags(content);

    return NextResponse.json({
      title,
      content,
      textContent,
      siteName: isMedium ? "Medium" : "Dev.to",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
