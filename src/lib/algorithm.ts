/**
 * algorithm.ts - Feed ranking algorithm for ONYX
 * Scores articles based on goals, actions, freshness
 */

// ── Types ─────────────────────────────────────────────────────────
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

// ── Tag weights from user actions ────────────────────────────────
export function buildTagWeights(actions: UserAction[]): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const a of actions) {
    if (!a.tag) continue;
    if (!weights[a.tag]) weights[a.tag] = 1.0;
    if (a.action === "like")  weights[a.tag] += 0.5;
    if (a.action === "save")  weights[a.tag] += 0.4;
    if (a.action === "read")  weights[a.tag] += 0.2;
    if (a.action === "skip")  weights[a.tag] -= 0.3;
    // Clamp between 0.1 and 3.0
    weights[a.tag] = Math.max(0.1, Math.min(3.0, weights[a.tag]));
  }
  return weights;
}

// ── Freshness score (0-1) ─────────────────────────────────────────
function freshnessScore(createdAt: string): number {
  const age = Date.now() - new Date(createdAt).getTime();
  const hours = age / (1000 * 60 * 60);
  if (hours < 6)  return 1.0;
  if (hours < 24) return 0.8;
  if (hours < 48) return 0.6;
  if (hours < 72) return 0.4;
  return 0.2;
}

// ── Goal match score (0-1) ────────────────────────────────────────
function goalMatchScore(article: Article, profile: UserProfile | null): number {
  if (!profile) return 0.5;
  const allTopics = [
    ...profile.goals.flatMap(g => g.topics),
    ...profile.interests,
  ].map(t => t.toLowerCase());
  const tag = article.tag.toLowerCase();
  const title = article.title.toLowerCase();
  if (allTopics.some(t => tag.includes(t) || title.includes(t))) return 1.0;
  return 0.3;
}

// ── Main ranking function ─────────────────────────────────────────
export function rankArticles(
  articles: Article[],
  actions: UserAction[],
  profile: UserProfile | null
): Article[] {
  const tagWeights = buildTagWeights(actions);

  const scored = articles.map(article => {
    const freshness  = freshnessScore(article.created_at);
    const goalMatch  = goalMatchScore(article, profile);
    const tagWeight  = tagWeights[article.tag] || 1.0;

    // Weighted final score
    const finalScore =
      (freshness  * 0.3) +
      (goalMatch  * 0.4) +
      (tagWeight  * 0.3);

    return { ...article, score: finalScore };
  });

  // Sort descending
  return scored.sort((a, b) => b.score - a.score);
}

// ── Deduplicate by URL ────────────────────────────────────────────
export function deduplicateArticles(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}
