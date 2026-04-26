import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function removeJunk(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Medium specific junk
    .replace(/<div[^>]*data-testid="headerSocialRow"[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*class="[^"]*metabar[^"]*"[\s\S]*?<\/div>/gi, "")
    // Remove "Press enter or click to view image in full size" text
    .replace(/Press enter or click to view image in full size/gi, "")
    // Remove Listen / Share / Follow UI
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "");
}

function extractBody(html: string): string {
  // Medium article body is in <article> tag
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (article?.[1] && article[1].length > 500) return article[1];

  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (main?.[1] && main[1].length > 500) return main[1];

  // Dev.to uses specific class
  const devto = html.match(/class="[^"]*crayons-article__body[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (devto?.[1] && devto[1].length > 300) return devto[1];

  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return body?.[1] || html;
}

function fixImages(html: string): string {
  // Priority: data-src > src — Medium uses data-src for lazy loading
  // Also handle <source srcset> inside <picture>
  let out = html;

  // Picture elements — extract best src
  out = out.replace(/<picture[^>]*>([\s\S]*?)<\/picture>/gi, (_, inner) => {
    const srcset = inner.match(/srcset="([^"]+)"/i)?.[1];
    const src = inner.match(/src="([^"]+)"/i)?.[1];
    const best = srcset ? srcset.split(",")[0].trim().split(" ")[0] : src;
    if (!best) return "";
    return `<img src="${best}" loading="lazy" />`;
  });

  // Regular img — prefer data-src over src
  out = out.replace(/<img([^>]*)>/gi, (_, attrs) => {
    const dataSrc = attrs.match(/data-src="([^"]+)"/i)?.[1];
    const src = attrs.match(/\bsrc="([^"]+)"/i)?.[1];
    const alt = attrs.match(/alt="([^"]*)"/i)?.[1] || "";
    const finalSrc = dataSrc || src;
    if (!finalSrc) return "";
    // Skip tiny images (avatars, icons, tracking pixels)
    if (finalSrc.includes("avatar") || finalSrc.includes("icon") || finalSrc.includes("1x1") || finalSrc.includes("badge")) return "";
    return `<img src="${finalSrc}" alt="${alt}" loading="lazy" />`;
  });

  return out;
}

function buildCleanHtml(html: string): string {
  let out = fixImages(html);

  // Code blocks — must do BEFORE stripping tags
  out = out.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner) => {
    // Strip all tags inside pre except keep text
    const text = inner
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    return `<pre><code>${text}</code></pre>`;
  });

  // Inline code
  out = out.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, inner) => {
    const text = inner.replace(/<[^>]+>/g, "");
    return `<code>${text}</code>`;
  });

  // Headings
  for (let i = 1; i <= 4; i++) {
    out = out.replace(new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\/h${i}>`, "gi"), `<h${i}>$1</h${i}>`);
  }

  // Paragraphs
  out = out.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "<p>$1</p>");

  // Formatting
  out = out.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "<strong>$1</strong>");
  out = out.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "<strong>$1</strong>");
  out = out.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "<em>$1</em>");
  out = out.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "<em>$1</em>");

  // Blockquote
  out = out.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "<blockquote>$1</blockquote>");

  // Lists
  out = out.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "<ul>$1</ul>");
  out = out.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "<ol>$1</ol>");
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<li>$1</li>");

  // Links
  out = out.replace(/<a[^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>');

  // Figure / caption
  out = out.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, "<figure>$1</figure>");
  out = out.replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi, "<figcaption>$1</figcaption>");

  // Breaks and hr
  out = out.replace(/<br\s*\/?>/gi, "<br/>");
  out = out.replace(/<hr[^>]*>/gi, "<hr/>");

  // Strip all remaining unknown tags but keep their content
  const keep = "h1|h2|h3|h4|p|strong|em|code|pre|blockquote|a|img|br|hr|ul|ol|li|figure|figcaption";
  out = out.replace(new RegExp(`<(?!\\/?(?:${keep})\\b)[a-z][a-z0-9]*[^>]*>`, "gi"), "");
  out = out.replace(new RegExp(`<\\/(?!(?:${keep})\\b)[a-z][a-z0-9]*>`, "gi"), "");

  // Decode HTML entities
  out = out.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
           .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  // Clean up whitespace
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
      "towardsdatascience.com", "betterprogramming.pub", "plainenglish.io",
      "javascript.plainenglish.io", "python.plainenglish.io", "levelup.gitconnected.com",
      "itnext.io", "codeburst.io", "hackernoon.com", "blog.devgenius.io",
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
        headers: HEADERS, signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`corsproxy ${r.status}`);
      return r.text();
    },
    async () => {
      if (!isMediumDomain(url)) throw new Error("not medium");
      const r = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent("https://freedium.cfd/" + url)}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!r.ok) throw new Error(`freedium ${r.status}`);
      const d = await r.json();
      if (!d.contents || d.contents.length < 200) throw new Error("freedium empty");
      return d.contents;
    },
  ];

  const errors: string[] = [];
  for (const s of strategies) {
    try {
      const html = await s();
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
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  try {
    const raw = await tryFetch(url);

    const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = (titleMatch?.[1] || "Article")
      .replace(/\s*[|\-–—]\s*(Medium|DEV Community|dev\.to|Freedium|plainenglish\.io|towards[^<]*).*$/i, "")
      .trim();

    const noJunk = removeJunk(raw);
    const body = extractBody(noJunk);
    const content = buildCleanHtml(body);
    const textContent = stripHtml(body).slice(0, 3000);

    let siteName = "Article";
    if (isMediumDomain(url)) siteName = "Medium";
    else if (isMediumSubpub(url)) siteName = "Medium";
    else if (url.includes("dev.to")) siteName = "DEV Community";
    else { try { siteName = new URL(url).hostname.replace("www.", ""); } catch {} }

    return NextResponse.json(
      { title, content, textContent, siteName },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
