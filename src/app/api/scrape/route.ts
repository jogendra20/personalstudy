import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
}

function extractMedium(html: string): string {
  const attrPos = html.search(/class="[^"]*pw-post-body/i);
  if (attrPos > 0) {
    const tagStart = html.lastIndexOf("<", attrPos);
    const chunk = html.slice(tagStart, tagStart + 120000);
    const divEnd = chunk.search(/<section[^>]*data-testid="responses/i);
    return divEnd > 0 ? chunk.slice(0, divEnd) : chunk;
  }
  const am = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (am) return am[1];
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

function decodeEntities(s: string): string {
  return s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g," ");
}

function format(raw: string): string {
  let o = raw;

  // Step 1: code blocks — Medium uses <pre> OR <div class="graf--pre">
  // Strip ALL inner tags, decode entities, preserve text
  o = o.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_: string, inner: string) => {
    const text = decodeEntities(inner.replace(/<[^>]*>/g, "")).trim();
    return text ? "\n<pre><code>" + text + "</code></pre>\n" : "";
  });
  o = o.replace(/<div[^>]*class="[^"]*graf--pre[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, (_: string, inner: string) => {
    const text = decodeEntities(inner.replace(/<[^>]*>/g, "")).trim();
    return text ? "\n<pre><code>" + text + "</code></pre>\n" : "";
  });

  // Step 2: headings
  o = o.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_: string, i: string) => "\n<h1>" + stripTags(i) + "</h1>\n");
  o = o.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_: string, i: string) => "\n<h2>" + stripTags(i) + "</h2>\n");
  o = o.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_: string, i: string) => "\n<h3>" + stripTags(i) + "</h3>\n");
  o = o.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_: string, i: string) => "\n<h4>" + stripTags(i) + "</h4>\n");

  // Step 3: blockquote
  o = o.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "\n<blockquote>$1</blockquote>\n");

  // Step 4: lists
  o = o.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "\n<ul>$1</ul>\n");
  o = o.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "\n<ol>$1</ol>\n");
  o = o.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "<li>$1</li>");

  // Step 5: paragraphs
  o = o.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n<p>$1</p>\n");

  // Step 6: inline formatting
  o = o.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "<strong>$1</strong>");
  o = o.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "<strong>$1</strong>");
  o = o.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "<em>$1</em>");
  o = o.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "<em>$1</em>");
  o = o.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "<code>$1</code>");
  o = o.replace(/<br\s*\/?>/gi, "<br/>");

  // Step 7: images — src OR data-src fallback
  o = o.replace(/<img[^>]*>/gi, (m: string) => {
    const srcArr = Array.from(m.matchAll(/(?:data-src|src)\s*=\s*"([^"]*)"/g));
    const altArr = Array.from(m.matchAll(/alt\s*=\s*"([^"]*)"/g));
    const src = srcArr[0] ? srcArr[0][1] : "";
    const alt = altArr[0] ? altArr[0][1] : "";
    if (src || src.startsWith("data:")) return "";
    return alt
      ? "\n<img src=\"" + src + "\" alt=\"" + alt + "\" />\n"
      : "\n<img src=\"" + src + "\" />\n";
  });

  // Step 8: links
  o = o.replace(/<a[^>]*>/gi, (m: string) => {
    const hrefArr = Array.from(m.matchAll(/href\s*=\s*"([^"]*)"/g));
    const href = hrefArr[0] ? hrefArr[0][1] : "";
    return href ? "<a href=\"" + href + "\">" : "";
  });

  // Step 9: strip remaining unknown tags, remove attributes from safe tags
  const safeSet = new Set(["h1","h2","h3","h4","h5","h6","p","strong","em","code","pre","blockquote","ul","ol","li","br","img","a"]);
  o = o.replace(/<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (m: string, t: string, attrs: string) => {
    const tag = t.toLowerCase();
    if (!safeSet.has(tag)) return "";
    if (attrs.trim() === "" || attrs.trim() === "/") return m;
    return "<" + tag + ">";
  });
  o = o.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g, (m: string, t: string) => {
    return safeSet.has(t.toLowerCase()) ? m : "";
  });

  // Step 10: cleanup
  o = o.replace(/<p>\s*<\/p>/gi, "");
  o = o.replace(/<p>(&nbsp;|\s)*<\/p>/gi, "");
  o = o.replace(/\n{4,}/g, "\n\n");
  return o.trim();
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "No URL" }, { status: 400 });
  const isMedium = url.includes("medium.com") || url.includes("towardsdatascience.com") || url.includes("towardsdeeplearning.com") || url.includes("betterhumans") || url.includes("betterprogramming");
  const targets = isMedium ? [
    url,
    "https://freedium.cfd/" + url,
    "https://scribe.rip/" + url.replace(/https?:\/\/[^/]+/, ""),
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
        .replace("- Freedium","").replace("| Medium","").replace("- Medium","")
        .replace("| DEV Community","").replace("- DEV Community","")
        .replace(/\s*\|.*$/,"").replace(/\s*-[^-]*$/,"").trim();
      const body = isMedium ? extractMedium(html) : extractDevto(html);
      const content = format(clean(body));
      const textContent = stripTags(content);
      if (textContent.length < 800 && isMedium && !targetUrl.includes("freedium") && !targetUrl.includes("scribe")) {
        lastError = "Paywall hit"; continue;
      }
      return NextResponse.json({ title, content, textContent, siteName: isMedium ? "Medium" : "Dev.to" });
    } catch(e: any) {
      lastError = e.message;
    }
  }
  return NextResponse.json({ error: lastError }, { status: 500 });
}
