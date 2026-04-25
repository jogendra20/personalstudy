import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  const targetUrl = url.includes("medium.com")
    ? "https://freedium.cfd/" + url
    : url;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
        "Accept": "text/html,*/*",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
    }

    const html = await res.text();

    const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = stripHtml(tm ? tm[1] : "Article");

    let body = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");

    const am = body.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mm = body.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const bm = body.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const raw = (am && am[1]) || (mm && mm[1]) || (bm && bm[1]) || body;

    const content = raw
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, "<h$1>$2</h$1>")
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "<p>$1</p>")
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "<strong>$1</strong>")
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "<em>$1</em>")
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "<code>$1</code>")
      .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "<pre>$1</pre>")
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "<blockquote>$1</blockquote>")
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<li>$1</li>")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{3,}/g, " ")
      .trim();

    const textContent = stripHtml(content);
    const siteName = url.includes("medium.com") ? "Medium" : "Dev.to";

    return NextResponse.json({ title, content, textContent, siteName });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
