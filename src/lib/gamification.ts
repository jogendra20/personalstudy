/**
 * gamification.ts - XP, levels, streaks, quests for ONYX
 */

// ── Types ─────────────────────────────────────────────────────────
export interface GameProfile {
  xp: number;
  level: number;
  streak: number;
  lastReadDate: string;
  totalRead: number;
  totalTasks: number;
  badges: string[];
  dailyQuest: DailyQuest | null;
}

export interface DailyQuest {
  id: string;
  description: string;
  tag: string;
  target: number;
  progress: number;
  xpReward: number;
  done: boolean;
  date: string;
}

// ── XP per action ────────────────────────────────────────────────
export const XP_REWARDS = {
  read:          10,
  like:           5,
  save:           5,
  task_complete: 25,
  task_perfect:  50,  // score >= 90
  streak_bonus:  15,  // per day streak
  daily_quest:   30,
};

// ── Level thresholds ──────────────────────────────────────────────
export const LEVELS = [
  { level: 1,  name: "Novice",    xpRequired: 0    },
  { level: 2,  name: "Reader",    xpRequired: 100  },
  { level: 3,  name: "Learner",   xpRequired: 300  },
  { level: 4,  name: "Analyst",   xpRequired: 600  },
  { level: 5,  name: "Thinker",   xpRequired: 1000 },
  { level: 6,  name: "Builder",   xpRequired: 1500 },
  { level: 7,  name: "Expert",    xpRequired: 2200 },
  { level: 8,  name: "Master",    xpRequired: 3000 },
  { level: 9,  name: "Legend",    xpRequired: 4000 },
  { level: 10, name: "Sovereign", xpRequired: 5500 },
];

// ── Badges ────────────────────────────────────────────────────────
export const BADGES = [
  { id: "first_read",     name: "First Read",      desc: "Read your first article",         condition: (p: GameProfile) => p.totalRead >= 1    },
  { id: "streak_3",       name: "On Fire",          desc: "3 day reading streak",            condition: (p: GameProfile) => p.streak >= 3       },
  { id: "streak_7",       name: "Week Warrior",     desc: "7 day reading streak",            condition: (p: GameProfile) => p.streak >= 7       },
  { id: "streak_30",      name: "Iron Reader",      desc: "30 day reading streak",           condition: (p: GameProfile) => p.streak >= 30      },
  { id: "tasks_10",       name: "Task Master",      desc: "Complete 10 FORGE tasks",         condition: (p: GameProfile) => p.totalTasks >= 10  },
  { id: "tasks_50",       name: "Forge Legend",     desc: "Complete 50 FORGE tasks",         condition: (p: GameProfile) => p.totalTasks >= 50  },
  { id: "level_5",        name: "Thinker",          desc: "Reach level 5",                   condition: (p: GameProfile) => p.level >= 5        },
  { id: "level_10",       name: "Sovereign",        desc: "Reach level 10",                  condition: (p: GameProfile) => p.level >= 10       },
  { id: "articles_50",    name: "Voracious",        desc: "Read 50 articles",                condition: (p: GameProfile) => p.totalRead >= 50   },
  { id: "articles_100",   name: "Century",          desc: "Read 100 articles",               condition: (p: GameProfile) => p.totalRead >= 100  },
];

const STORAGE_KEY = "onyx_game_profile";

// ── Load/Save ─────────────────────────────────────────────────────
export function loadGameProfile(): GameProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultProfile();
  } catch { return defaultProfile(); }
}

export function saveGameProfile(p: GameProfile): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

function defaultProfile(): GameProfile {
  return {
    xp: 0, level: 1, streak: 0,
    lastReadDate: "", totalRead: 0,
    totalTasks: 0, badges: [],
    dailyQuest: null,
  };
}

// ── Level calculation ─────────────────────────────────────────────
export function calculateLevel(xp: number): number {
  let level = 1;
  for (const l of LEVELS) {
    if (xp >= l.xpRequired) level = l.level;
  }
  return level;
}

export function getLevelName(level: number): string {
  return LEVELS.find(l => l.level === level)?.name || "Novice";
}

export function xpToNextLevel(xp: number): { current: number; needed: number; percent: number } {
  const currentLevel = calculateLevel(xp);
  const next = LEVELS.find(l => l.level === currentLevel + 1);
  if (!next) return { current: xp, needed: 0, percent: 100 };
  const currentThreshold = LEVELS.find(l => l.level === currentLevel)!.xpRequired;
  const needed = next.xpRequired - currentThreshold;
  const current = xp - currentThreshold;
  return { current, needed, percent: Math.round((current / needed) * 100) };
}

// ── Add XP ────────────────────────────────────────────────────────
export function addXP(amount: number): { profile: GameProfile; levelUp: boolean; newBadges: string[] } {
  const profile = loadGameProfile();
  const oldLevel = profile.level;
  profile.xp += amount;
  profile.level = calculateLevel(profile.xp);
  const levelUp = profile.level > oldLevel;
  const newBadges = checkBadges(profile);
  saveGameProfile(profile);
  return { profile, levelUp, newBadges };
}

// ── Streak ────────────────────────────────────────────────────────
export function updateStreak(): { streak: number; bonus: number } {
  const profile = loadGameProfile();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (profile.lastReadDate === today) {
    return { streak: profile.streak, bonus: 0 };
  }

  if (profile.lastReadDate === yesterday) {
    profile.streak += 1;
  } else {
    profile.streak = 1;
  }

  profile.lastReadDate = today;
  profile.totalRead += 1;
  const bonus = XP_REWARDS.streak_bonus * Math.min(profile.streak, 7);
  profile.xp += XP_REWARDS.read + bonus;
  profile.level = calculateLevel(profile.xp);
  saveGameProfile(profile);
  return { streak: profile.streak, bonus };
}

// ── Badge checker ─────────────────────────────────────────────────
export function checkBadges(profile: GameProfile): string[] {
  const newBadges: string[] = [];
  for (const badge of BADGES) {
    if (!profile.badges.includes(badge.id) && badge.condition(profile)) {
      profile.badges.push(badge.id);
      newBadges.push(badge.name);
    }
  }
  if (newBadges.length) saveGameProfile(profile);
  return newBadges;
}

// ── Daily Quest ───────────────────────────────────────────────────
export const QUEST_TEMPLATES = [
  { description: "Read 2 AI articles today",      tag: "AI",            target: 2, xpReward: 30 },
  { description: "Read 2 Trading articles today", tag: "Trading",       target: 2, xpReward: 30 },
  { description: "Complete 1 FORGE task today",   tag: "any",           target: 1, xpReward: 40 },
  { description: "Read 3 articles today",         tag: "any",           target: 3, xpReward: 35 },
  { description: "Read 2 DSA articles today",     tag: "DSA",           target: 2, xpReward: 30 },
  { description: "Read 2 System Design articles", tag: "System Design", target: 2, xpReward: 30 },
];

export function getDailyQuest(): DailyQuest {
  const profile = loadGameProfile();
  const today = new Date().toDateString();

  if (profile.dailyQuest && profile.dailyQuest.date === today) {
    return profile.dailyQuest;
  }

  // Pick random quest
  const template = QUEST_TEMPLATES[Math.floor(Math.random() * QUEST_TEMPLATES.length)];
  const quest: DailyQuest = {
    id: Date.now().toString(),
    ...template,
    progress: 0,
    done: false,
    date: today,
  };

  profile.dailyQuest = quest;
  saveGameProfile(profile);
  return quest;
}

export function updateQuestProgress(tag: string): DailyQuest | null {
  const profile = loadGameProfile();
  const quest = profile.dailyQuest;
  if (!quest || quest.done) return null;
  if (quest.tag !== "any" && quest.tag !== tag) return null;

  quest.progress += 1;
  if (quest.progress >= quest.target) {
    quest.done = true;
    profile.xp += quest.xpReward;
    profile.level = calculateLevel(profile.xp);
  }

  profile.dailyQuest = quest;
  saveGameProfile(profile);
  return quest;
}
