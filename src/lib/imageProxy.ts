// Routes article images through wsrv.nl (a free, open-source image
// cache/resize proxy) so we serve small, compressed WebP versions
// instead of whatever full-size original the source blog shipped.
// This is the single biggest lever for making the feed usable on 3G.
export function optimizeImage(url?: string, width = 640, quality = 70): string | undefined {
  if (!url) return url;
  if (url.startsWith("data:")) return url;
  try {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&output=webp`;
  } catch {
    return url;
  }
}

// True if the browser reports a slow/metered connection (Data Saver,
// 2G, or 3G). Used to skip non-essential prefetching. Feature-detected
// since Network Information API isn't supported everywhere (notably
// Safari) — on unsupported browsers we just assume a normal connection.
export function isSlowConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as any).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  if (typeof conn.effectiveType === "string") {
    return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g" || conn.effectiveType === "3g";
  }
  return false;
}
