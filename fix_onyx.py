import re, os

BASE = os.path.dirname(os.path.abspath(__file__))

def read(p):
    with open(os.path.join(BASE, p), "r", encoding="utf-8") as f:
        return f.read()

def write(p, content):
    with open(os.path.join(BASE, p), "w", encoding="utf-8") as f:
        f.write(content)

scrape_path = os.path.join(BASE, "src/app/api/scrape/route.ts")
if os.path.exists(scrape_path):
    os.remove(scrape_path)
    scrape_dir = os.path.dirname(scrape_path)
    if not os.listdir(scrape_dir):
        os.rmdir(scrape_dir)
    print("Deleted src/app/api/scrape/route.ts")
else:
    print("scrape/route.ts already gone, skipping")

clean_content_ts = '''export function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim();
}

export function buildCleanHtml(raw) {
  let html = raw;
  html = html
    .replace(/<script[\\s\\S]*?<\\/script>/gi, "")
    .replace(/<style[\\s\\S]*?<\\/style>/gi, "")
    .replace(/<!--[\\s\\S]*?-->/g, "")
    .replace(/Press enter or click to view image in full size/gi, "");

  let body = html;

  body = body.replace(/<pre[^>]*>([\\s\\S]*?)<\\/pre>/gi, (_m, inner) => {
    const text = inner
      .replace(/<code[^>]*>([\\s\\S]*?)<\\/code>/gi, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .trim();
    return `<pre><code>${text}</code></pre>`;
  });
  body = body.replace(/<code[^>]*>([\\s\\S]*?)<\\/code>/gi, (_m, inner) => {
    const text = inner.replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    return `<code>${text}</code>`;
  });

  body = body.replace(/<picture[^>]*>([\\s\\S]*?)<\\/picture>/gi, (_m, inner) => {
    const srcset = inner.match(/srcset="([^"]+)"/i)?.[1];
    const src = inner.match(/src="([^"]+)"/i)?.[1];
    const best = srcset ? srcset.split(",").pop().trim().split(" ")[0] : src;
    if (!best) return "";
    return `<img src="${best}" loading="lazy" />`;
  });
  body = body.replace(/<img([^>]*)>/gi, (_m, attrs) => {
    const dataSrc = attrs.match(/data-src="([^"]+)"/i)?.[1];
    const src = attrs.match(/\\bsrc="([^"]+)"/i)?.[1];
    const alt = attrs.match(/alt="([^"]*)"/i)?.[1] || "";
    const finalSrc = dataSrc || src;
    if (!finalSrc) return "";
    if (
      finalSrc.includes("avatar") || finalSrc.includes("icon") ||
      finalSrc.includes("1x1") || finalSrc.includes("badge") ||
      finalSrc.includes("emoji") || finalSrc.endsWith(".gif")
    ) return "";
    return `<img src="${finalSrc}" alt="${alt}" loading="lazy" />`;
  });

  body = body.replace(/<a[^>]*href="(https?:\\/\\/[^"]*)"[^>]*>([\\s\\S]*?)<\\/a>/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>');
  body = body.replace(/<br\\s*\\/?>/gi, "<br/>");
  body = body.replace(/<hr[^>]*>/gi, "<hr/>");

  const KEEP = new Set(["h1","h2","h3","h4","h5","h6","p","strong","em","code","pre",
    "blockquote","a","img","br","hr","ul","ol","li","figure","figcaption"]);

  body = body.replace(/<\\/?([a-z][a-z0-9]*)[^>]*>/gi, (match, tag) => {
    return KEEP.has(tag.toLowerCase()) ? match : "";
  });

  body = body
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  body = body.replace(/(<br\\/>\\s*){3,}/gi, "<br/><br/>");
  body = body.replace(/\\n{3,}/g, "\\n\\n");

  return body.trim();
}
'''
write("src/lib/cleanContent.ts", clean_content_ts)
print("Created src/lib/cleanContent.ts")

feed = read("src/app/api/feed/route.ts")

old_interface = '''interface FeedItem {
  title: string;
  url: string;
  source: "devto" | "medium";
  tag: string;
  publishedAt: string;
  readTime: string;
  cover?: string;
  description?: string;
}'''
new_interface = '''interface FeedItem {
  title: string;
  url: string;
  source: "devto" | "medium";
  tag: string;
  publishedAt: string;
  readTime: string;
  cover?: string;
  description?: string;
  content?: string;
  hasFullContent: boolean;
}'''
assert old_interface in feed, "feed interface block not found"
feed = feed.replace(old_interface, new_interface)

old_content_block = '''    const content = (
      item.match(/<content:encoded><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/content:encoded>/i) ||
      item.match(/<content:encoded>([\\s\\S]*?)<\\/content:encoded>/i)
    )?.[1] || desc;'''
new_content_block = '''    const rawContentEncoded = (
      item.match(/<content:encoded><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/content:encoded>/i) ||
      item.match(/<content:encoded>([\\s\\S]*?)<\\/content:encoded>/i)
    )?.[1];
    const content = rawContentEncoded || desc;
    const plainContentLen = stripHtml(content).length;
    const plainDescLen = stripHtml(desc).length;
    const hasFullContent = !!rawContentEncoded && plainContentLen > 600 && plainContentLen > plainDescLen * 2;'''
assert old_content_block in feed, "content extraction block not found"
feed = feed.replace(old_content_block, new_content_block)

old_push = '''    items.push({
      title,
      url: link,
      source: source as "devto" | "medium",
      tag,
      publishedAt: pubDate,
      readTime: estimateReadTime(content || desc),
      cover: extractCover(item),
      description: stripHtml(desc).slice(0, 150),
    });'''
new_push = '''    items.push({
      title,
      url: link,
      source: source as "devto" | "medium",
      tag,
      publishedAt: pubDate,
      readTime: estimateReadTime(content || desc),
      cover: extractCover(item),
      description: stripHtml(desc).slice(0, 150),
      content: hasFullContent ? content : undefined,
      hasFullContent,
    });'''
assert old_push in feed, "items.push block not found"
feed = feed.replace(old_push, new_push)

write("src/app/api/feed/route.ts", feed)
print("Updated src/app/api/feed/route.ts")

page = read("src/app/read/page.tsx")

old_import = 'import { getGroqKey, setGroqKey, toggleSaveArticle, isArticleSaved, Article } from "@/lib/api";'
new_import = 'import { getGroqKey, setGroqKey, toggleSaveArticle, isArticleSaved, Article } from "@/lib/api";\\nimport { buildCleanHtml, stripHtml as stripHtmlText } from "@/lib/cleanContent";'
assert old_import in page, "read/page.tsx import line not found"
page = page.replace(old_import, new_import)

old_effect = '''    try { const s = sessionStorage.getItem("onyx_article"); if (s) setMeta(JSON.parse(s)); } catch {}
    if (!url) { setError("No URL provided."); setLoading(false); return; }
    setSaved(isArticleSaved(url));
    try {
      const ck = "onyx_article_" + btoa(url).slice(0, 40);
      const cached = localStorage.getItem(ck);
      if (cached) { setArticle(JSON.parse(cached)); setLoading(false); return; }
    } catch {}
    fetch("/api/scrape?url=" + encodeURIComponent(url))
      .then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
      .then(data => {
        if (data.error) throw new Error(data.error);
        setArticle(data); setLoading(false); try { const m = JSON.parse(sessionStorage.getItem("onyx_article") || "{}"); triggerForgeTask({ title: data.title, url: url, tag: m?.tag || "General" }, data.textContent || ""); } catch { triggerForgeTask({ title: data.title, url: url, tag: "General" }, data.textContent || ""); }
        try { localStorage.setItem("onyx_article_" + btoa(url).slice(0, 40), JSON.stringify(data)); } catch {}
      })
      .catch(err => { setError(err.message || "Failed to load article."); setLoading(false); });
  }, [url]);'''

new_effect = '''    let m = null;
    try { const s = sessionStorage.getItem("onyx_article"); if (s) { m = JSON.parse(s); setMeta(m); } } catch {}
    if (!url) { setError("No URL provided."); setLoading(false); return; }
    setSaved(isArticleSaved(url));

    if (m && m.hasFullContent && m.content) {
      const cleaned = buildCleanHtml(m.content);
      const textContent = stripHtmlText(cleaned).slice(0, 3000);
      const data = {
        title: m.title || "Article",
        content: cleaned,
        textContent,
        siteName: m.source === "medium" ? "Medium" : "DEV Community",
      };
      setArticle(data);
      setLoading(false);
      try { triggerForgeTask({ title: data.title, url: url, tag: m?.tag || "General" }, textContent); } catch {}
    } else {
      setError("This source only shares a preview here. Read the full piece on the original site.");
      setLoading(false);
    }
  }, [url]);'''

assert old_effect in page, "read/page.tsx effect block not found"
page = page.replace(old_effect, new_effect)

old_paywall_ui = '''            {article.isPaywalled && article.freediumUrl && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(107,70,193,0.08)", border: "1px solid rgba(107,70,193,0.25)", borderRadius: "10px", padding: "10px 14px", marginBottom: "20px" }}>
                <span style={{ fontSize: "0.82rem", color: text2, fontFamily: "'DM Mono', monospace" }}>\u26a0 Partial \u2014 paywalled</span>
                <a href={article.freediumUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", fontSize: "0.82rem", fontFamily: "'DM Mono', monospace", color: "var(--accent3)", fontWeight: 600, textDecoration: "none" }}>Read on Freedium \u2197</a>
              </div>
            )}
'''
if old_paywall_ui in page:
    page = page.replace(old_paywall_ui, "")
    print("Removed Freedium paywall UI block")
else:
    print("WARNING: Freedium UI block not found verbatim (check manually)")

write("src/app/read/page.tsx", page)
print("Updated src/app/read/page.tsx")

api = read("src/lib/api.ts")

old_dead_block = '''// \u2500\u2500\u2500 Article Scraper \u2500\u2500\u2500
export interface ScrapedArticle {
  title: string;
  content: string;
  textContent: string;
  byline?: string;
  siteName?: string;
}

export async function scrapeArticle(url) {
  const targetUrl = url.includes("medium.com")
    ? `https://freedium.cfd/${url}`
    : url;

  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
  const res = await fetch(proxyUrl);
  const data = await res.json();
  const html = data.contents || "";

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\\/title>/i);
  const title = titleMatch ? stripHtml(titleMatch[1]) : "Article";

  let content = html;
  content = content.replace(/<script[\\s\\S]*?<\\/script>/gi, "");
  content = content.replace(/<style[\\s\\S]*?<\\/style>/gi, "");
  content = content.replace(/<nav[\\s\\S]*?<\\/nav>/gi, "");
  content = content.replace(/<header[\\s\\S]*?<\\/header>/gi, "");
  content = content.replace(/<footer[\\s\\S]*?<\\/footer>/gi, "");

  const articleMatch =
    content.match(/<article[^>]*>([\\s\\S]*?)<\\/article>/i) ||
    content.match(/<main[^>]*>([\\s\\S]*?)<\\/main>/i);

  const body = articleMatch ? articleMatch[1] : content;
  const textContent = stripHtml(body).replace(/\\s+/g, " ").trim();

  const cleanContent = body
    .replace(/<(h[1-6])[^>]*>([\\s\\S]*?)<\\/\\1>/gi, "<$1>$2</$1>")
    .replace(/<p[^>]*>([\\s\\S]*?)<\\/p>/gi, "<p>$1</p>")
    .replace(/<(strong|em|code|pre|blockquote)[^>]*>([\\s\\S]*?)<\\/\\1>/gi, "<$1>$2</$1>")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\\s\\S]*?)<\\/a>/gi, '<a href="$1">$2</a>')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '<img src="$1" />')
    .replace(/(<br\\s*\\/?>\\s*){2,}/gi, "<br/>")
    .replace(/<(?!\\/?(?:h[1-6]|p|strong|em|code|pre|blockquote|a|img|br|ul|ol|li)\\b)[^>]+>/gi, "");

  return { title, content: cleanContent, textContent, siteName: url.includes("medium.com") ? "Medium" : "Dev.to" };
}

'''
if old_dead_block in api:
    api = api.replace(old_dead_block, "")
    print("Removed dead scrapeArticle()/ScrapedArticle from api.ts")
else:
    print("WARNING: dead scrapeArticle block not found verbatim (check manually)")

write("src/lib/api.ts", api)

print("\\nALL DONE. Review the diffs, then commit.")
