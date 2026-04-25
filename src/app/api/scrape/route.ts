import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
}

function extractReadableContent(html: string): string {
  let content = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");

  const article = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const main = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const body = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const raw = article?.[1] || main?.[1] || body?.[1] || content;

  return raw
    .replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, "<$1>$2</$1>")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "<p>$1</p>")
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "<strong>$2</strong>")
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "<em>$2</em>")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "<code>$1</code>")
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "<pre>$1</pre>")
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "<blockquote>$1</blockquote>")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '<a href="$1">$2</a>')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '<img src="$1" />')
    .replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, "<$1>$2</$1>")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<li>$1</li>")
    .replace(/<(?h[1-6]|p|strong|em|code|pre|blockquote|a|img|br|ul|ol|li)\b)[^>]+>/gi, " ")
    .replace(/\s{3,}/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  const targetUrl = url.includes("medium.com") ? `https://freedium.cfd/${url}` : url;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 502 });

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = stripHtml(titleMatch?.[1] || "Article");
    const content = extractReadableContent(html);
    const textContent = stripHtml(content).replace(/\s+/g, " ").trim();
    const siteName = url.includes("medium.com") ? "Medium" : "Dev.to";

    return NextResponse.json({ title, content, textContent, siteName });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
