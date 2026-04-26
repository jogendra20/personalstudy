import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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

  const isMedium = isMediumDomain(url) || isMediumSubpub(url);

  const strategies: (() => Promise<string>)[] = [
    // 1. allorigins first for Medium (direct fetch returns login wall)
    async () => {
      if (!isMedium) throw new Error("skip");
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`allorigins ${r.status}`);
      const d = await r.json();
      if (!d.contents || d.contents.length < 5000) throw new Error("allorigins too short");
      return d.contents;
    },
    // 2. Direct fetch — good for dev.to and subpubs
    async () => {
      const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`Direct ${r.status}`);
      const text = await r.text();
      if (isMedium && text.length < 5000) throw new Error("direct too short for medium");
      return text;
    },
    // 3. corsproxy
    async () => {
      const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
        headers: HEADERS, signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`corsproxy ${r.status}`);
      return r.text();
    },
    // 4. allorigins for non-medium as fallback
    async () => {
      if (isMedium) throw new Error("skip");
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`allorigins ${r.status}`);
      const d = await r.json();
      if (!d.contents || d.contents.length < 200) throw new Error("allorigins empty");
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

function extractArticleBody(html: string): string {
  // Remove everything before the first <h1> or first real <p> — strips author header
  const firstH1 = html.indexOf("<h1");
  const firstP = html.indexOf("<p>");
  const start = firstH1 !== -1 ? firstH1 : firstP !== -1 ? firstP : 0;
  return html.slice(start);
}

function buildCleanHtml(raw: string): string {
  let html = raw;

  // 1. Strip noise
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/Press enter or click to view image in full size/gi, "");

  // 2. Extract article portion
  const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    || html.match(/<div[^>]*class="[^"]*(?:crayons-article__body|postArticle-content|article-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
    || html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]
    || html;

  let body = extractArticleBody(article);

  // 3. Pre/code blocks — handle FIRST before anything else
  body = body.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner) => {
    const text = inner
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .trim();
    return `<pre><code>${text}</code></pre>`;
  });
  body = body.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, inner) => {
    const text = inner.replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    return `<code>${text}</code>`;
  });

  // 4. Images — prefer data-src, skip avatars
  body = body.replace(/<picture[^>]*>([\s\S]*?)<\/picture>/gi, (_, inner) => {
    const srcset = inner.match(/srcset="([^"]+)"/i)?.[1];
    const src = inner.match(/src="([^"]+)"/i)?.[1];
    const best = srcset ? srcset.split(",").pop()!.trim().split(" ")[0] : src;
    if (!best) return "";
    return `<img src="${best}" loading="lazy" />`;
  });
  body = body.replace(/<img([^>]*)>/gi, (_, attrs) => {
    const dataSrc = attrs.match(/data-src="([^"]+)"/i)?.[1];
    const src = attrs.match(/\bsrc="([^"]+)"/i)?.[1];
    const alt = attrs.match(/alt="([^"]*)"/i)?.[1] || "";
    const finalSrc = dataSrc || src;
    if (!finalSrc) return "";
    if (
      finalSrc.includes("avatar") || finalSrc.includes("icon") ||
      finalSrc.includes("1x1") || finalSrc.includes("badge") ||
      finalSrc.includes("emoji") || finalSrc.endsWith(".gif") ||
      /resize:fill:64/.test(finalSrc) || /resize:fill:32/.test(finalSrc)
    ) return "";
    return `<img src="${finalSrc}" alt="${alt}" loading="lazy" />`;
  });

  // 5. Structure tags
  body = body.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "<h1>$1</h1>");
  body = body.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "<h2>$1</h2>");
  body = body.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "<h3>$1</h3>");
  body = body.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "<h4>$1</h4>");
  body = body.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "<p>$1</p>");
  body = body.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "<strong>$1</strong>");
  body = body.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "<strong>$1</strong>");
  body = body.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "<em>$1</em>");
  body = body.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "<em>$1</em>");
  body = body.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "<blockquote>$1</blockquote>");
  body = body.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "<ul>$1</ul>");
  body = body.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "<ol>$1</ol>");
  body = body.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<li>$1</li>");
  body = body.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, "<figure>$1</figure>");
  body = body.replace(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/gi, "<figcaption>$1</figcaption>");
  body = body.replace(new RegExp('<a[^>]*href="(https?://[^"]*)"[^>]*>([\s\S]*?)<\/a>', 'gi'), '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>');
  body = body.replace(/<br\s*\/?>/gi, "<br/>");
  body = body.replace(/<hr[^>]*>/gi, "<hr/>");

  // 6. Strip remaining unknown open/close tags (keep content)
  const KEEP = new Set(["h1","h2","h3","h4","h5","h6","p","strong","em","code","pre",
    "blockquote","a","img","br","hr","ul","ol","li","figure","figcaption"]);

  body = body.replace(/<\/?([a-z][a-z0-9]*)[^>]*>/gi, (match, tag) => {
    return KEEP.has(tag.toLowerCase()) ? match : "";
  });

  // 7. Decode entities and clean whitespace
  body = body
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  body = body.replace(/(<br\/>\s*){3,}/gi, "<br/><br/>");
  body = body.replace(/\n{3,}/g, "\n\n");

  // 7b. Remove <h1> from body — page renders title separately
  body = body.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, "");

  // 8. Strip author junk — keep h1 title, cut everything until first real paragraph
  const h1end = body.indexOf("</h1>");
  if (h1end !== -1) {
    const title1 = body.slice(0, h1end + 5);
    const rest = body.slice(h1end + 5);
    const pIdx = rest.search(/<p[^>]*>[^<]{15,}/);
    body = title1 + (pIdx !== -1 ? rest.slice(pIdx) : rest);
  }
  return body.trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });

  const isFromMedium = isMediumDomain(url) || isMediumSubpub(url);
  const isDevTo = url.includes("dev.to");

  let siteName = "Article";
  if (isFromMedium) siteName = "Medium";
  else if (isDevTo) siteName = "DEV Community";
  else { try { siteName = new URL(url).hostname.replace("www.", ""); } catch {} }

  try {
    const raw = await tryFetch(url);

    const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = (titleMatch?.[1] || "Article")
      .replace(/\s*[|\-\u2013\u2014]\s*(Medium|DEV Community|dev\.to|Freedium|plainenglish\.io|towards[^<]*).*$/i, "")
      .replace(/\s*[|]\s*by\s+.+$/i, "")
      .replace(/\s*[|]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^|]*$/i, "")
      .trim();

    const content = buildCleanHtml(raw);
    const textContent = stripHtml(content).slice(0, 3000);

    return NextResponse.json(
      { title, content, textContent, siteName },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
