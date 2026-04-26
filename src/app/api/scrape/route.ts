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

function isUsableHtml(html: string): boolean {
  if (!html || html.length < 3000) return false;
  if (html.includes("Enable JavaScript and cookies to continue")) return false;
  if (html.includes("cf-browser-verification")) return false;
  if (html.includes("Please complete the security check")) return false;
  return true;
}

async function tryFetch(url: string): Promise<string> {
  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  const isMedium = isMediumDomain(url) || isMediumSubpub(url);
  const freediumUrl = `https://freedium.cfd/${url}`;

  // Run all proxies in parallel, return first usable result
  const fetches = [
    // 1. Direct fetch
    fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? r.text() : Promise.reject(`direct ${r.status}`))
      .then(h => { if (!isUsableHtml(h)) throw new Error("unusable"); return h; }),
    // 2. allorigins
    fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(5000),
    }).then(r => r.json()).then(d => {
      if (!d.contents || !isUsableHtml(d.contents)) throw new Error("unusable");
      return d.contents;
    }),
    // 3. corsproxy
    fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
      headers: HEADERS, signal: AbortSignal.timeout(5000),
    }).then(r => r.ok ? r.text() : Promise.reject(`corsproxy ${r.status}`))
      .then(h => { if (!isUsableHtml(h)) throw new Error("unusable"); return h; }),
    // 4. Freedium — Medium only
    ...(isMedium ? [
      fetch(freediumUrl, { headers: HEADERS, signal: AbortSignal.timeout(6000) })
        .then(r => r.ok ? r.text() : Promise.reject(`freedium ${r.status}`))
        .then(h => { if (!isUsableHtml(h)) throw new Error("unusable"); return h; }),
    ] : []),
  ];

  try {
    return await Promise.any(fetches);
  } catch {
    throw new Error("All proxies failed or returned unusable content");
  }
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

  let body = article || html;

  // Strip leading author junk — <a> tags, empty elements before first real content
  body = body.replace(/^(\s*<a[\s\S]*?<\/a>\s*|\s*<img[^>]*\/>\s*)+/i, "");
  // Strip "X min read·Just now" type text at very start
  body = body.replace(/^[\s\d\w\u00B7,\-]+(min read|just now|\d+ hours? ago|\d+ days? ago).*/im, "");

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
  // ul/ol/li handled by KEEP stripper below
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
      .replace(/\s*[|][^|]+$/, "")
      .trim();

    const content = buildCleanHtml(raw);
    const textContent = stripHtml(content).slice(0, 3000);

    const isPaywalled =
      textContent.length < 800 ||
      raw.toLowerCase().includes("member-only story") ||
      raw.toLowerCase().includes("become a medium member") ||
      raw.toLowerCase().includes("read the full story");
    const freediumUrl = (isMediumDomain(url) || isMediumSubpub(url))
      ? `https://freedium.cfd/${url}`
      : null;

    return NextResponse.json(
      { title, content, textContent, siteName, isPaywalled, freediumUrl },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
