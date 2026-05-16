export type SageEmotion = "curious" | "happy" | "focused" | "concerned" | "motivated" | "waiting" | "dormant";

export interface SageGoal {
  id: string;
  text: string;
  topics: string[];
  deadline?: string;
  progress: number;
  dailyAction: string;
  createdAt: number;
}

export interface SageProfile {
  name: string;
  careerTarget: string;
  goals: SageGoal[];
  interests: string[];
  setupDone: boolean;
  createdAt: number;
}

export interface SageCheckin {
  date: string;
  mood: string;
  note: string;
  goalsUpdated: string[];
}

const KEYS = {
  profile:       "sage_profile",
  checkins:      "sage_checkins",
  lastActive:    "sage_last_active",
  conversations: "sage_conversations",
  emotion:       "sage_emotion",
};

export function getProfile(): SageProfile | null {
  try {
    const raw = localStorage.getItem(KEYS.profile);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveProfile(p: SageProfile): void {
  try { localStorage.setItem(KEYS.profile, JSON.stringify(p)); } catch {}
}

export function updateGoalProgress(goalId: string, progress: number): void {
  const p = getProfile();
  if (!p) return;
  p.goals = p.goals.map(g => g.id === goalId ? { ...g, progress } : g);
  saveProfile(p);
}

export function getLastActive(): number {
  try { return parseInt(localStorage.getItem(KEYS.lastActive) || "0"); } catch { return 0; }
}

export function setLastActive(): void {
  try { localStorage.setItem(KEYS.lastActive, Date.now().toString()); } catch {}
}

export function getCheckins(): SageCheckin[] {
  try {
    const raw = localStorage.getItem(KEYS.checkins);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addCheckin(c: SageCheckin): void {
  try {
    const checkins = getCheckins();
    checkins.unshift(c);
    localStorage.setItem(KEYS.checkins, JSON.stringify(checkins.slice(0, 30)));
  } catch {}
}

export function getConversations(): { role: string; content: string }[] {
  try {
    const raw = localStorage.getItem(KEYS.conversations);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addConversation(role: string, content: string): void {
  try {
    const convs = getConversations();
    convs.push({ role, content });
    localStorage.setItem(KEYS.conversations, JSON.stringify(convs.slice(-20)));
  } catch {}
}

export function computeEmotion(profile: SageProfile | null): SageEmotion {
  if (!profile) return "curious";
  const hour = new Date().getHours();
  const lastActive = getLastActive();
  const idleHours = (Date.now() - lastActive) / (1000 * 60 * 60);

  if (hour >= 23 || hour < 6) return "dormant";
  if (idleHours > 4) return "concerned";
  if (hour >= 7 && hour <= 9) return "motivated";

  const avgProgress = profile.goals.length
    ? profile.goals.reduce((a, g) => a + g.progress, 0) / profile.goals.length
    : 0;

  if (avgProgress > 70) return "happy";
  if (avgProgress > 40) return "focused";
  if (idleHours > 1) return "waiting";
  return "curious";
}

export function buildSystemPrompt(profile: SageProfile): string {
  const goals = profile.goals.map(g => `- ${g.text} (${g.progress}% done)`).join("\n");
  const checkins = getCheckins().slice(0, 3).map(c => `${c.date}: ${c.mood}`).join(", ");
  return `You are SAGE — a sharp, proactive AI life companion for ${profile.name}.
Their goal: ${profile.careerTarget}.
Active goals:\n${goals}
Recent mood: ${checkins || "no data yet"}
Interests: ${profile.interests.join(", ")}

Be direct, concise, personal. Push gently. No generic advice. Max 3 sentences.
You know them well — reference their goals and progress naturally.`;
}

export type SageIntent =
  | "FEED_FILTER"
  | "ARTICLE_OPEN"
  | "GOAL_SHOW"
  | "GOAL_UPDATE"
  | "SEARCH"
  | "GHOSTREADER"
  | "FORGE_TASK"
  | "CHAT";

export interface SageCommand {
  intent: SageIntent;
  params: Record<string, string>;
}

// ── Now calls /api/sage instead of Groq directly ──────────────────
export async function classifyIntent(input: string): Promise<SageCommand> {
  try {
    const res = await fetch("/api/sage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "classify", input }),
    });
    const data = await res.json();
    return data as SageCommand;
  } catch {
    return { intent: "CHAT", params: {} };
  }
}

export async function ghostRead(
  mode: "explain" | "summarise" | "eli5",
  articleTitle: string,
  articleText: string
): Promise<string> {
  try {
    const res = await fetch("/api/sage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ghostread", mode, articleTitle, articleText }),
    });
    const data = await res.json();
    return data.response || "";
  } catch {
    return "Failed to process article.";
  }
}

export async function sageChat(
  input: string,
  profile: SageProfile | null
): Promise<string> {
  try {
    const systemPrompt = profile ? buildSystemPrompt(profile) : undefined;
    const res = await fetch("/api/sage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "chat", input, systemPrompt }),
    });
    const data = await res.json();
    return data.response || "";
  } catch {
    return "SAGE is unavailable right now.";
  }
}
