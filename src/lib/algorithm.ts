export interface Article {
  id: number;
  url: string;
  title: string;
  source: string;
  tag: string;
  summary?: string;
  image_url?: string;
  image_source?: string;
  score: number;
  created_at: string;
}

export interface UserAction {
  url: string;
  action: "like" | "skip" | "save" | "read";
  tag: string;
  time_spent?: number;
}

export interface UserProfile {
  goals: { topics: string[] }[];
  interests: string[];
}

// ── Tag affinity — builds from all actions ────────────────────────
export function buildTagAffinity(actions: UserAction[]): Record<string, number> {
  const affinity: Record<string, number> = {};
  for (const a of actions) {
    if (!a.tag) continue;
    if (!affinity[a.tag]) affinity[a.tag] = 1.0;
    if (a.action === "read")  affinity[a.tag] += 0.8;  // strongest signal
    if (a.action === "like")  affinity[a.tag] += 0.5;
    if (a.action === "save")  affinity[a.tag] += 0.4;
    if (a.action === "skip")  affinity[a.tag] -= 0.5;  // penalize hard
    affinity[a.tag] = Math.max(0.1, Math.min(5.0, affinity[a.tag]));
  }
  return affinity;
}

// ── URL similarity — boost articles from same source/tag ─────────
function similarityBoost(article: Article, actions: UserAction[]): number {
  const readUrls = actions
    .filter(a => a.action === "read" && a.tag === article.tag)
    .map(a => a.url);
  // Same tag + same source = strong boost
  const sameSourceRead = actions.some(
    a => a.action === "read" &&
    a.url !== article.url &&
    article.source &&
    a.url.includes(article.source.split(".")[0])
  );
  if (sameSourceRead) return 0.4;
  if (readUrls.length > 2) return 0.2;
  return 0;
}

// ── Freshness (0-1) ───────────────────────────────────────────────
function freshnessScore(createdAt: string): number {
  const age = Date.now() - new Date(createdAt).getTime();
  const hours = age / (1000 * 60 * 60);
  if (hours < 6)  return 1.0;
  if (hours < 24) return 0.8;
  if (hours < 48) return 0.6;
  if (hours < 72) return 0.4;
  return 0.2;
}

// ── Goal match (0-1) ─────────────────────────────────────────────
function goalMatch(article: Article, profile: UserProfile | null): number {
  if (!profile) return 0.5;
  const topics = [
    ...profile.goals.flatMap(g => g.topics),
    ...profile.interests,
  ].map(t => t.toLowerCase());
  const tag   = article.tag.toLowerCase();
  const title = article.title.toLowerCase();
  return topics.some(t => tag.includes(t) || title.includes(t)) ? 1.0 : 0.3;
}

// ── Image boost — articles with images ranked higher ─────────────
function imageBoost(article: Article): number {
  return article.image_url ? 0.3 : 0;
}

// ── Main ranking ──────────────────────────────────────────────────
export function rankArticles(
  articles: Article[],
  actions: UserAction[],
  profile: UserProfile | null
): Article[] {
  const affinity = buildTagAffinity(actions);

  const scored = articles.map(article => {
    const freshness  = freshnessScore(article.created_at);
    const goal       = goalMatch(article, profile);
    const tagWeight  = affinity[article.tag] || 1.0;
    const similarity = similarityBoost(article, actions);
    const image      = imageBoost(article);

    // Weighted score
    const finalScore =
      (freshness  * 0.25) +
      (goal       * 0.25) +
      ((tagWeight / 5.0) * 0.30) +  // normalize affinity to 0-1
      (similarity * 0.10) +
      (image      * 0.10);

    return { ...article, score: finalScore };
  });

  return scored.sort((a, b) => b.score - a.score);
}

// ── Record a read — updates affinity in localStorage ─────────────
export function recordRead(tag: string, url: string): void {
  try {
    const key = "onyx_tag_affinity";
    const raw = localStorage.getItem(key);
    const affinity: Record<string, number> = raw ? JSON.parse(raw) : {};
    affinity[tag] = Math.min(5.0, (affinity[tag] || 1.0) + 0.8);
    localStorage.setItem(key, JSON.stringify(affinity));
  } catch {}
}

export function recordSkip(tag: string): void {
  try {
    const key = "onyx_tag_affinity";
    const raw = localStorage.getItem(key);
    const affinity: Record<string, number> = raw ? JSON.parse(raw) : {};
    affinity[tag] = Math.max(0.1, (affinity[tag] || 1.0) - 0.5);
    localStorage.setItem(key, JSON.stringify(affinity));
  } catch {}
}

export function recordLike(tag: string): void {
  try {
    const key = "onyx_tag_affinity";
    const raw = localStorage.getItem(key);
    const affinity: Record<string, number> = raw ? JSON.parse(raw) : {};
    affinity[tag] = Math.min(5.0, (affinity[tag] || 1.0) + 0.5);
    localStorage.setItem(key, JSON.stringify(affinity));
  } catch {}
}

export function getTagAffinity(): Record<string, number> {
  try {
    const raw = localStorage.getItem("onyx_tag_affinity");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function deduplicateArticles(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}
