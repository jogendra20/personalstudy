export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function buildCleanHtml(raw: string): string {
  let html = raw;
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<--------------------------------------------------[\s\S]*?-->/g, "")
    .replace(/Press enter or click to view image in full size/gi, "");

  // Decode entities BEFORE any tag processing/filtering below. Some
  // feeds double-escape their HTML (tags appear as literal "&lt;div&gt;"
  // text). If we decoded at the end instead, a disallowed tag hidden
  // this way would be invisible to the KEEP-list filter — which only
  // recognizes real "<...>" tags — and would only become a real tag
  // *after* filtering already ran, slipping straight through it.
  html = html
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

  let body = html;

  body = body.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m: string, inner: string) => {
    const text = inner
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .trim();
    return `<pre><code>${text}</code></pre>`;
  });
  body = body.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    return `<code>${text}</code>`;
  });

  body = body.replace(/<picture[^>]*>([\s\S]*?)<\/picture>/gi, (_m: string, inner: string) => {
    const srcset = inner.match(/srcset="([^"]+)"/i)?.[1];
    const src = inner.match(/src="([^"]+)"/i)?.[1];
    const best = srcset ? srcset.split(",").pop()!.trim().split(" ")[0] : src;
    if (!best) return "";
    return `<img src="${best}" loading="lazy" />`;
  });
  body = body.replace(/<img([^>]*)>/gi, (_m: string, attrs: string) => {
    const dataSrc = attrs.match(/data-src="([^"]+)"/i)?.[1];
    const src = attrs.match(/\bsrc="([^"]+)"/i)?.[1];
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

  body = body.replace(/<a[^>]*href="(https?:\/\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>');
  body = body.replace(/<br\s*\/?>/gi, "<br/>");
  body = body.replace(/<hr[^>]*>/gi, "<hr/>");

  const KEEP = new Set(["h1","h2","h3","h4","h5","h6","p","strong","em","code","pre",
    "blockquote","a","img","br","hr","ul","ol","li","figure","figcaption"]);

  body = body.replace(/<\/?([a-z][a-z0-9]*)[^>]*>/gi, (match: string, tag: string) => {
    return KEEP.has(tag.toLowerCase()) ? match : "";
  });

  body = body
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  body = body.replace(/(<br\/>\s*){3,}/gi, "<br/><br/>");
  body = body.replace(/\n{3,}/g, "\n\n");

  return body.trim();
}
