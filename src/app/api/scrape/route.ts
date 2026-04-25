import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
}

function extractMedium(html: string): string {
  // Medium article body is between the byline and the footer claps section
  // Look for the section after "min read" and before "responses"
  const start = html.search(/class="[^"]*pw-post-body/i);
  if (start > 0) {
    const chunk = html.slice(start, start + 120000);
    const divEnd = chunk.search(/<section[^>]*data-testid="responses/i);
    return divEnd > 0 ? chunk.slice(0, divEnd) : chunk;
  }
  // Fallback: get everything between <article> tags
  const am = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (am) return am[1];
  // Last fallback: body
  const bm = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bm ? bm[1] : html;
}

function extractDevto(html: string): string {
  const am = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (am) return am[1];
  const mm = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mm) return mm[1];
  const bm = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bm ? bm[1] : html;
}

function clean(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, "")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<figure[^>]*class="[^"]*graf--layoutFillWidth[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, "");
}

function format(raw: string): string {
  let o = raw;
  // Block elements - preserve structure
  o = o.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n<h1>$1</h1>\n");
  o = o.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n<h2>$1</h2>\n");
  o = o.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n<h3>$1</h3>\n");
  o = o.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n<h4>$1</h4>\n");
  o = o.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n<p>$1</p>\n");
  o = o.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n<pre>$1</pre>\n");
  o = o.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "\n<blockquote>$1</blockquote>\n");
  o = o.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "\n<ul>$1</ul>\n");
  o = o.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "\n<ol>$1</ol>\n");
  o = o.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<li>$1</li>");
  // Inline elements
  o = o.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "<strong>$1</strong>");
  o = o.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "<strong>$1</strong>");
  o = o.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "<em>$1</em>");
  o = o.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "<em>$1</em>");
  o = o.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "<code>$1</code>");
  o = o.replace(/<br\s*\/?>/gi, "<br/>");
  // Images
  o = o.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "\n<img src=\"$1\" alt=\"$2\" />\n");
  o = o.replace(/<img[^>]*src="([^"]+)"[^>]*\/?>/gi, "\n<img src=\"$1\" />\n");
  // Links
  o = o.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '<a href="$1">$2</a>');
  // Remove all remaining unknown tags, keep their inner text
  const safe = ["h1","h2","h3","h4","h5","h6","p","strong","em","code","pre","blockquote","ul","ol","li","a","img","br"];
  const safeSet = new Set(safe);
  o = o.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (m: string, t: string) => safeSet.has(t.toLowerCase()) ? m : "");
  // Clean up
  o = o.replace(/<p>\s*<\/p>/gi, "");
  o = o.replace(/<p>(&nbsp;|\s)*<\/p>/gi, "");
  o = o.replace(/\n{4,}/g, "\n\n");
  return o.trim();
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  const isMedium = url.includes("medium.com");
  const targets = isMedium ? [
    url,
    "https://freedium.cfd/" + url,
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
        .replace("- Freedium","").replace("| Medium","")
        .replace("- Medium","").replace("| DEV Community","")
        .replace("- DEV Community","").trim();
      const body = isMedium ? extractMedium(html) : extractDevto(html);
      const content = format(clean(body));
      const textContent = stripTags(content);
      if (textContent.length < 200) { lastError = "Too short"; continue; }
      return NextResponse.json({ title, content, textContent, siteName: isMedium ? "Medium" : "Dev.to" });
    } catch(e: any) {
      lastError = e.message;
    }
  }
  return NextResponse.json({ error: lastError }, { status: 500 });
}