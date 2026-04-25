import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
}

function extractFreedium(html: string): string {
  // Freedium puts article in .main-content or article tag
  const patterns = [
    /<div[^>]*class="[^"]*main-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<footer/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1] && m[1].length > 500) return m[1];
  }
  // fallback: body minus nav/header/footer
  let body = html
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<div[^>]*class="[^"]*(?:navbar|topbar|sidebar|comment|related|share|author-bio)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  const bm = body.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bm ? bm[1] : body;
}

function formatContent(raw: string): string {
  let out = raw;

  // Strip noise: scripts, styles, buttons, forms, svgs
  out = out.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<button[^>]*>[\s\S]*?<\/button>/gi, "");
  out = out.replace(/<form[^>]*>[\s\S]*?<\/form>/gi, "");
  out = out.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "");
  out = out.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "");

  // Normalize headings
  out = out.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "<h1>$1</h1>");
  out = out.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "<h2>$1</h2>");
  out = out.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "<h3>$1</h3>");
  out = out.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "<h4>$1</h4>");

  // Paragraphs
  out = out.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "<p>$1</p>");

  // Inline
  out = out.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "<strong>$2</strong>");
  out = out.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "<em>$2</em>");
  out = out.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "<code>$1</code>");
  out = out.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "<pre>$1</pre>");
  out = out.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "<blockquote>$1</blockquote>");

  // Lists
  out = out.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "<ul>$1</ul>");
  out = out.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "<ol>$1</ol>");
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<li>$1</li>");

  // Images — keep only real article images
  out = out.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "<img src=\"$1\" alt=\"$2\" />");
  out = out.replace(/<img[^>]*src="([^"]+)"[^>]*\/?>/gi, "<img src=\"$1\" />");

  // Links — strip tracking params
  out = out.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "<a href=\"$1\">$2</a>");

  // Line breaks
  out = out.replace(/<br\s*\/?>/gi, "<br/>");

  // Remove all remaining unknown tags, keep content
  out = out.replace(/<(?!(h[1-6]|p|strong|em|code|pre|blockquote|a|img|br|ul|ol|li))[^>]+>/gi, "");

  // Clean whitespace
  out = out.replace(/\n{3,}/g, "\n\n");
  out = out.replace(/ {2,}/g, " ");

  // Remove empty paragraphs
  out = out.replace(/<p>\s*<\/p>/gi, "");
  out = out.replace(/<p>(&nbsp;|\s)*<\/p>/gi, "");

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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return NextResponse.json({ error: "Fetch failed: " + res.status }, { status: 502 });

    const html = await res.text();

    const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = stripTags((tm && tm[1]) || "Article")
      .replace("- Freedium", "")
      .replace("| Medium", "")
      .replace("- Medium", "")
      .trim();

    const body = extractFreedium(html);
    const content = formatContent(body);
    const textContent = stripTags(content);

    return NextResponse.json({ title, content, textContent, siteName: isMedium ? "Medium" : "Dev.to" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
