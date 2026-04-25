import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
}

function extractReadableContent(html: string): string {
  let c = html
    .replace(/<script[^>]*>.*?<\/script>/gis, "")
    .replace(/<style[^>]*>.*?<\/style>/gis, "")
    .replace(/<nav[^>]*>.*?<\/nav>/gis, "")
    .replace(/<header[^>]*>.*?<\/header>/gis, "")
    .replace(/<footer[^>]*>.*?<\/footer>/gis, "");

  const a = c.match(/<article[^>]*>(.*?)<\/article>/is);
  const m = c.match(/<main[^>]*>(.*?)<\/main>/is);
  const b = c.match(/<body[^>]*>(.*?)<\/body>/is);
  const raw = (a && a[1]) || (m && m[1]) || (b && b[1]) || c;

  return raw
    .replace(/<(h[1-6])[^>]*>(.*?)<\/\1>/gis, "<$1>$2</$1>")
    .replace(/<p[^>]*>(.*?)<\/p>/gis, "<p>$1</p>")
    .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gis, "<strong>$2</strong>")
    .replace(/<(em|i)[^>]*>(.*?)<\/\1>/gis, "<em>$2</em>")
    .replace(/<code[^>]*>(.*?)<\/code>/gis, "<code>$1</code>")
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, "<pre>$1</pre>")
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, "<blockquote>$1</blockquote>")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis, '<a href="$1">$2</a>')
    .replace(/<img[^>]*src="([^"]*)"[^>]*/>/gi, '<img src="$1" />')
    .replace(/<(ul|ol)[^>]*>(.*?)<\/\1>/gis, "<$1>$2</$1>")
    .replace(/<li[^>]*>(.*?)<\/li>/gis, "<li>$1</li>")
    .replace(/<(?h[1-6]|p|strong|em|code|pre|blockquote|a|img|br|ul|ol|li)\b)[^>]+>/gi, " ")
    .replace(/\s{3,}/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  const targetUrl = url.includes("medium.com") ? "https://freedium.cfd/" + url : url;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return NextResponse.json({ error: "Fetch failed: " + res.status }, { status: 502 });

    const html = await res.text();
    const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = stripHtml((tm && tm[1]) || "Article");
    const content = extractReadableContent(html);
    const textContent = stripHtml(content).replace(/\s+/g, " ").trim();
    const siteName = url.includes("medium.com") ? "Medium" : "Dev.to";

    return NextResponse.json({ title, content, textContent, siteName });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
