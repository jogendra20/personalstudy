export interface ForgeTask {
  id: string;
  articleUrl: string;
  articleTitle: string;
  articleTag: string;
  type: "code" | "quiz" | "design" | "review" | "link";
  title: string;
  description: string;
  starterCode?: string;
  language?: string;
  linkUrl?: string;
  status: "pending" | "done" | "skipped";
  score?: number;
  feedback?: string;
  createdAt: number;
  completedAt?: number;
}

export interface ForgeProfile {
  weakAreas: Record<string, number>;
  completedCount: number;
  skippedCount: number;
  totalScore: number;
}

export interface ForgeNewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  category: "indian" | "crypto" | "forex" | "global";
}

export interface ForgeNewsCache {
  items: ForgeNewsItem[];
  fetchedAt: number;
}

const KEYS = {
  profile: "forge_profile",
  tasks: "forge_tasks",
  news: "forge_news_cache",
  keys: "forge_api_keys",
};

export function getForgeProfile(): ForgeProfile {
  try {
    const raw = localStorage.getItem(KEYS.profile);
    return raw ? JSON.parse(raw) : { weakAreas: {}, completedCount: 0, skippedCount: 0, totalScore: 0 };
  } catch { return { weakAreas: {}, completedCount: 0, skippedCount: 0, totalScore: 0 }; }
}

export function saveForgeProfile(p: ForgeProfile): void {
  try { localStorage.setItem(KEYS.profile, JSON.stringify(p)); } catch {}
}

export function getForgeTasks(): ForgeTask[] {
  try {
    const raw = localStorage.getItem(KEYS.tasks);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveForgeTask(task: ForgeTask): void {
  try {
    const tasks = getForgeTasks();
    const idx = tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) tasks[idx] = task;
    else tasks.unshift(task);
    localStorage.setItem(KEYS.tasks, JSON.stringify(tasks.slice(0, 100)));
  } catch {}
}

export function updateForgeTask(id: string, updates: Partial<ForgeTask>): void {
  const tasks = getForgeTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx < 0) return;
  tasks[idx] = { ...tasks[idx], ...updates };
  localStorage.setItem(KEYS.tasks, JSON.stringify(tasks));
  const p = getForgeProfile();
  if (updates.status === "done" && updates.score !== undefined) {
    p.completedCount++;
    p.totalScore += updates.score;
    saveForgeProfile(p);
  }
  if (updates.status === "skipped") {
    p.skippedCount++;
    p.weakAreas[tasks[idx].articleTag] = (p.weakAreas[tasks[idx].articleTag] || 0) + 1;
    saveForgeProfile(p);
  }
}

export function getNewsCache(): ForgeNewsCache | null {
  try {
    const raw = localStorage.getItem(KEYS.news);
    if (!raw) return null;
    const cache: ForgeNewsCache = JSON.parse(raw);
    if (Date.now() - cache.fetchedAt > 60 * 60 * 1000) return null;
    return cache;
  } catch { return null; }
}

export function saveNewsCache(items: ForgeNewsItem[]): void {
  try {
    localStorage.setItem(KEYS.news, JSON.stringify({ items, fetchedAt: Date.now() }));
  } catch {}
}

export function getPendingTask(): ForgeTask | null {
  return getForgeTasks().find(t => t.status === "pending") || null;
}

export function getWeakAreaBias(profile: ForgeProfile): string {
  const sorted = Object.entries(profile.weakAreas).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : "";
}

export function getForgeKeys(): { tavily: string; groq: string } {
  try { return JSON.parse(localStorage.getItem(KEYS.keys) || "{}"); } catch { return { tavily: "", groq: "" }; }
}

export function saveForgeKeys(k: { tavily: string; groq: string }): void {
  localStorage.setItem(KEYS.keys, JSON.stringify(k));
}
