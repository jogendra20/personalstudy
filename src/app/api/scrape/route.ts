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
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i),
    html.match(/<div[^>]*class="[^"]*(?:post|article|entry|content|story)[^"]*"[^>]*>([\s\S]*?)<\/div>/i),
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i),
  ];
  for (const m of attempts) {
    if (m?.[1] && m[1].length > 300) return m[1];
  }
  return html;
}

function sanitizeContent(html: string): string {
  let out = html;

  // 1. Fix images — recover src from data-src (lazy loaded)
  out = out.replace(/<img[^>]*?data-src="([^"]+)"[^>]*>/gi, '<img src="$1" loading="lazy" style="max-width:100%;border-radius:8px;margin:1.5rem auto;display:block;" />');
  out = out.replace(/<img[^>]*?src="([^"]+)"[^>]*>/gi, '<img src="$1" loading="lazy" style="max-width:100%;border-radius:8px;margin:1.5rem auto;display:block;" />');

  // 2. Fix code blocks — preserve pre/code content exactly
  out = out.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner) => {
    const code = inner.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "$1");
    return `<pre>${code}</pre>`;
  });

  // 3. Inline code
  out = out.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "<code>$1</code>");

  // 4. Headings
  out = out.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "<h1>$1</h1>");
  out = out.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "<h2>$1</h2>");
  out = out.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "<h3>$1</h3>");
  out = out.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "<h4>$1</h4>");

  // 5. Paragraphs
  out = out.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "<p>$1</p>");

  // 6. Formatting
  out = out.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "<strong>$1</strong>");
  out = out.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "<strong>$1</strong>");
  out = out.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "<em>$1</em>");
  out = out.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "<em>$1</em>");

  // 7. Blockquote
  out = out.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "<blockquote>$1</blockquote>");

  // 8. Lists
  out = out.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "<ul>$1</ul>");
  out = out.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "<ol>$1</ol>");
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<li>$1</li>");

  // 9. Links
  out = out.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>');

  // 10. Breaks and dividers
  out = out.replace(/<br\s*\/?>/gi, "<br/>");
  out = out.replace(/<hr[^>]*>/gi, "<hr/>");

  // 11. Figure / caption
  out = out.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, "<figure>$1</figure>");
  out = out.replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi, "<figcaption>$1</figcaption>");

  // 12. Strip remaining unknown tags but keep their inner content
  out = out.replace(/<(?!\/?(h[1-6]|p|strong|em|code|pre|blockquote|a|img|br|hr|ul|ol|li|figure|figcaption)\b)[a-z][a-z0-9]*[^>]*>/gi, "");
  out = out.replace(/<\/(?!h[1-6]|p|strong|em|code|pre|blockquote|a|img|ul|ol|li|figure|figcaption\b)[a-z][a-z0-9]*>/gi, "");

  // 13. Clean up excess whitespace
  out = out.replace(/(<br\/>\s*){3,}/gi, "<br/><br/>");
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

function isMediumDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "medium.com" || host.endsWith(".medium.com");
  } catch { return false; }
}

function isMediumSubpub(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    const SUBPUBS = [
      "towardsdatascience.com","betterprogramming.pub","plainenglish.io",
      "javascript.plainenglish.io","python.plainenglish.io","levelup.gitconnected.com",
      "itnext.io","codeburst.io","hackernoon.com","blog.devgenius.io",
    ];
    return SUBPUBS.some(d => host === d || host.endsWith("." + d));
  } catch { return false; }
}

async function tryFetch(url: string): Promise<string> {
  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  const strategies: (() => Promise<string>)[] = [
    async () => {
      const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`Direct ${r.status}`);
      return r.text();
    },
    async () => {
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`allorigins ${r.status}`);
      const d = await r.json();
      if (!d.contents || d.contents.length < 200) throw new Error("allorigins empty");
      return d.contents;
    },
    async () => {
      const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`corsproxy ${r.status}`);
      return r.text();
    },
    async () => {
      if (!isMediumDomain(url)) throw new Error("not medium");
      const freediumUrl = `https://freedium.cfd/${url}`;
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(freediumUrl)}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw new Error(`freedium ${r.status}`);
      const d = await r.json();
      if (!d.contents || d.contents.length < 200) throw new Error("freedium empty");
      return d.contents;
    },
  ];

  const errors: string[] = [];
  for (const strategy of strategies) {
    try {
      const html = await strategy();
      if (html && html.length > 200) return html;
    } catch (e: any) {
      errors.push(e.message);
    }
  }
  throw new Error(`All strategies failed: ${errors.join(" | ")}`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";

  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  const isFromMedium = isMediumDomain(url) || isMediumSubpub(url);
  const isDevTo = url.includes("dev.to");

  try {
    const raw = await tryFetch(url);

    const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = (titleMatch?.[1] || "Article")
      .replace(/\s*[|\-–—]\s*(Medium|DEV Community|dev\.to|Freedium|plainenglish\.io|towards[^<]*).*$/i, "")
      .trim();

    const cleaned = cleanHtml(raw);
    const body = extractBody(cleaned);
    const content = sanitizeContent(body);
    const textContent = stripHtml(body).slice(0, 3000);

    let siteName = "Article";
    if (isMediumDomain(url)) siteName = "Medium";
    else if (isMediumSubpub(url)) siteName = "Medium";
    else if (isDevTo) siteName = "DEV Community";
    else {
      try { siteName = new URL(url).hostname.replace("www.", ""); } catch {}
    }

    return NextResponse.json(
      { title, content, textContent, siteName },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Scrape failed" },
      { status: 500 }
    );
  }
}
