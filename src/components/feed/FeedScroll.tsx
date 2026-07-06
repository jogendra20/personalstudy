"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import FeedCard from "./FeedCard";
import { Article, rankArticles, deduplicateArticles } from "@/lib/algorithm";
import { logAction, getUserActions, getArticles } from "@/lib/supabase";
import { updateStreak, addXP, updateQuestProgress, XP_REWARDS } from "@/lib/gamification";

interface FeedScrollProps {
  onXP: (amount: number, reason: string) => void;
  onBadge: (name: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

const FEED_CACHE_KEY = "onyx_feed_cache";
const FEED_CACHE_TS_KEY = "onyx_feed_ts";
const FEED_STALE_MS = 5 * 60 * 1000;

export default function FeedScroll({ onXP, onBadge, scrollRef }: FeedScrollProps) {
  const router = useRouter();
  const [articles, setArticles]   = useState<Article[]>([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(0);
  const containerRef              = useRef<HTMLDivElement>(null);
  const readTimers                = useRef<Record<string, number>>({});

  useEffect(() => {
    articles.slice(0, 5).forEach(a => {
      if (a.image_url) {
        const img = new Image();
        img.src = a.image_url;
      }
    });
  }, [articles]);

  useEffect(() => {
    loadFeed();
  }, []);

  function mapRSS(raw: any[]): Article[] {
    return raw.map((a: any, i: number) => ({
      id: i,
      url: a.url,
      title: a.title,
      source: a.source,
      tag: a.tag,
      summary: a.description || "",
      image_url: a.cover || "",
      score: 1,
      created_at: a.publishedAt,
      content: a.content,
      hasFullContent: !!a.hasFullContent,
    })) as Article[];
  }

  function loadCachedFeed(): Article[] | null {
    if (typeof window === "undefined") return null;
    try {
      const ts = parseInt(localStorage.getItem(FEED_CACHE_TS_KEY) || "0");
      if (Date.now() - ts > FEED_STALE_MS) return null;
      const raw = localStorage.getItem(FEED_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function saveFeedCache(items: Article[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(items));
      localStorage.setItem(FEED_CACHE_TS_KEY, Date.now().toString());
    } catch {}
  }

  async function loadFeed() {
    const cached = loadCachedFeed();
    if (cached && cached.length > 0) {
      setArticles(cached.sort((a: Article, b: Article) => (b.image_url ? 1 : 0) - (a.image_url ? 1 : 0)));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/feed");
      if (!res.ok) throw new Error("Feed failed");
      const raw = await res.json();
      const mapped = mapRSS(raw);
      saveFeedCache(mapped);
      setArticles(mapped.sort((a: Article, b: Article) => (b.image_url ? 1 : 0) - (a.image_url ? 1 : 0)));
    } catch (e) {
      console.error("Feed load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    try {
      const raw = await getArticles(20);
      const actions = await getUserActions();
      const ranked = rankArticles(raw, actions, null);
      setArticles(prev => deduplicateArticles([...prev, ...ranked]));
    } catch {}
  }

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight, scrollHeight } = containerRef.current;
    const currentIdx = Math.round(scrollTop / clientHeight);
    setPage(currentIdx);

    if (scrollTop + clientHeight > scrollHeight - clientHeight * 2) {
      loadMore();
    }

    const article = articles[currentIdx];
    if (article) {
      if (!readTimers.current[article.url]) {
        readTimers.current[article.url] = Date.now();
      }
    }
  }, [articles]);

  function handleLike(url: string, tag: string) {
    logAction({ url, action: "like", tag });
    const { newBadges } = addXP(XP_REWARDS.like);
    onXP(XP_REWARDS.like, "Liked article");
    newBadges.forEach(b => onBadge(b));
    updateQuestProgress(tag);
  }

  function handleSkip(url: string, tag: string) {
    logAction({ url, action: "skip", tag });
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: window.innerHeight, behavior: "smooth" });
    }
  }

  function handleSave(url: string, tag: string) {
    logAction({ url, action: "save", tag });
    const { newBadges } = addXP(XP_REWARDS.save);
    onXP(XP_REWARDS.save, "Saved article");
    newBadges.forEach(b => onBadge(b));
  }

  function handleRead(url: string) {
    const article = articles.find(a => a.url === url);
    if (article) {
      logAction({ url, action: "read", tag: article.tag });
      const { streak, bonus } = updateStreak();
      const total = XP_REWARDS.read + bonus;
      onXP(total, streak > 1 ? `🔥 ${streak} day streak!` : "Read article");
      updateQuestProgress(article.tag);
      try { sessionStorage.setItem('onyx_article', JSON.stringify(article)); } catch {}
    }
    router.push(`/read?url=${encodeURIComponent(url)}`);
  }

  if (loading) {
    return (
      <div style={{
        height: "100svh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#0a0a0a", flexDirection: "column", gap: "16px",
      }}>
        <div style={{
          width: "40px", height: "40px",
          border: "3px solid rgba(255,255,255,0.1)",
          borderTop: "3px solid #00ff88",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: "13px" }}>
          loading feed...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!articles.length) {
    return (
      <div style={{
        height: "100svh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#0a0a0a", flexDirection: "column", gap: "12px",
      }}>
        <span style={{ fontSize: "48px" }}>📭</span>
        <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
          No articles yet. Add some!
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef || containerRef}
      onScroll={handleScroll}
      style={{
        height: "100svh",
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
        scrollBehavior: "smooth",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {articles.map((article, idx) => (
        <FeedCard
          key={article.url}
          article={article}
          isActive={idx === page}
          onLike={handleLike}
          onSkip={handleSkip}
          onSave={handleSave}
          onRead={handleRead}
        />
      ))}
    </div>
  );
}
