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

  // Protect <pre>/<code> blocks from the entity-decode + tag-filtering
  // steps below by extracting them first. Code samples are often full
  // of angle-bracket syntax (JSX, HTML examples) that must render as
  // literal visible text, never as real tags. Decoding entities first
  // and then stripping tags afterward — which is correct and necessary
  // for the rest of the article — would treat a code sample like
  // "<Component prop=\"x\">" as a real tag once decoded, and the
  // KEEP-list filter would then delete it entirely, wiping the code
  // block's content instead of preserving it as text.
  const codeBlocks: string[] = [];
  const stashCode = (asPre: boolean) => (_m: string, inner: string): string => {
    const decoded = inner
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'");
    // Re-escape for guaranteed-safe literal display, regardless of
    // what characters the code sample happens to contain.
    const safe = decoded.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const idx = codeBlocks.length;
    codeBlocks.push(asPre ? `<pre><code>${safe}</code></pre>` : `<code>${safe}</code>`);
    return `@@ONYXCODEBLOCK${idx}@@`;
  };
  html = html.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, stashCode(true));
  html = html.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, stashCode(false));

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

  // Restore the protected code blocks now — everything above ran
  // without ever seeing their real content, so it can't have been
  // decoded, filtered, or otherwise damaged.
  body = body.replace(/@@ONYXCODEBLOCK(\d+)@@/g, (_m: string, i: string) => codeBlocks[Number(i)] || "");

  return body.trim();
}
