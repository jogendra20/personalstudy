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
  o = o.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "<h1>$1</h1>");
  o = o.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "<h2>$1</h2>");
  o = o.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "<h3>$1</h3>");
  o = o.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "<h4>$1</h4>");
  o = o.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "<p>$1</p>");
  o = o.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "<strong>$1</strong>");
  o = o.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "<strong>$1</strong>");
  o = o.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "<em>$1</em>");
  o = o.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "<em>$1</em>");
  o = o.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "<code>$1</code>");
  o = o.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "<pre>$1</pre>");
  o = o.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "<blockquote>$1</blockquote>");
  o = o.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "<ul>$1</ul>");
  o = o.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "<ol>$1</ol>");
  o = o.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<li>$1</li>");
  o = o.replace(/<img[^>]*src="([^"]+)"[^>]*\/>/gi, '<img src="$1" />');
  o = o.replace(/<img[^>]*src="([^"]+)"[^>]*>/gi, '<img src="$1" />');
  o = o.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '<a href="$1">$2</a>');
  o = o.replace(/<br\s*\/?>/gi, "<br/>");
  o = o.replace(/<[a-zA-Z][^>]*>/g, "");
  o = o.replace(/<\/[a-zA-Z]+>/g, "");
  o = o.replace(/<p>\s*<\/p>/gi, "");
  o = o.replace(/\n{3,}/g, "\n\n");
  return o.trim();
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  const isMedium = url.includes("medium.com");
  const targets = isMedium
    ? ["https://freedium.cfd/" + url, "https://md.vern.cc/" + url]
    : [url];

  let lastError = "All sources failed";
  for (const targetUrl of targets) {
    try {
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) { lastError = "HTTP " + res.status; continue; }
      const html = await res.text();
      const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = stripTags((tm && tm[1]) || "Article")
        .replace("- Freedium", "").replace("| Medium", "").replace("- Medium", "").trim();
      const content = format(extractBody(clean(html)));
      const textContent = stripTags(content);
      if (textContent.length < 100) { lastError = "Too short"; continue; }
      return NextResponse.json({ title, content, textContent, siteName: isMedium ? "Medium" : "Dev.to" });
    } catch (e: any) {
      lastError = e.message;
    }
  }
  return NextResponse.json({ error: lastError }, { status: 500 });
}