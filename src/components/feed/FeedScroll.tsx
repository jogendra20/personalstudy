"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import FeedCard from "./FeedCard";
import { Article, rankArticles, deduplicateArticles } from "@/lib/algorithm";
import { logAction, getUserActions, getArticles } from "@/lib/supabase";
import { updateStreak, addXP, updateQuestProgress, XP_REWARDS } from "@/lib/gamification";
import { optimizeImage, isSlowConnection } from "@/lib/imageProxy";

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
  const [articles, setArticles]     = useState<Article[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage]             = useState(0);
  const containerRef                = useRef<HTMLDivElement>(null);
  const readTimers                  = useRef<Record<string, number>>({});

  useEffect(() => {
    // Don't spend a slow-3G user's bandwidth prefetching images they
    // may never scroll to. Only prefetch the next couple of cards, and
    // only the compressed version, not the original full-size image.
    if (isSlowConnection()) return;
    articles.slice(0, 2).forEach(a => {
      const src = optimizeImage(a.image_url, 640, 70);
      if (src) {
        const img = new Image();
        img.src = src;
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
      hasFullContent: Boolean(a.hasFullContent),
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

  function clearFeedCache(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(FEED_CACHE_KEY);
      localStorage.removeItem(FEED_CACHE_TS_KEY);
    } catch {}
  }

  // Run freshly-loaded RSS articles through the same personalization
  // algorithm used for infinite-scroll (tag affinity, freshness, goal
  // match) — but WITHIN each source, then re-interleave 5:1. A plain
  // global sort here would undo the feed's Medium-vs-rest balance,
  // since Medium's tag feeds are near-always the "freshest" and most
  // consistently have cover images, so a naive sort floats Medium back
  // to the top of the feed.
  async function rankFresh(items: Article[]): Promise<Article[]> {
    try {
      const actions = await getUserActions();
      const ranked = rankArticles(items, actions, null); // scored + globally sorted
      const medium = ranked.filter(a => a.source === "medium");
      const other  = ranked.filter(a => a.source !== "medium");
      const balanced: Article[] = [];
      let oi = 0, mi = 0;
      while (oi < other.length || mi < medium.length) {
        for (let k = 0; k < 5 && oi < other.length; k++) balanced.push(other[oi++]);
        if (mi < medium.length) balanced.push(medium[mi++]);
      }
      return deduplicateArticles(balanced);
    } catch {
      return deduplicateArticles(items);
    }
  }

  async function loadFeed() {
    const cached = loadCachedFeed();
    if (cached && cached.length > 0) {
      setArticles(await rankFresh(cached));
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
      setArticles(await rankFresh(mapped));
    } catch (e) {
      console.error("Feed load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  // Manual refresh — bypasses both the localStorage cache AND the Vercel
  // edge cache (via a cache-busting query param), so it always pulls a
  // genuinely fresh set of articles from the RSS sources.
  async function refreshFeed() {
    if (refreshing) return;
    setRefreshing(true);
    clearFeedCache();
    try {
      const res = await fetch(`/api/feed?refresh=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Feed refresh failed");
      const raw = await res.json();
      const mapped = mapRSS(raw);
      saveFeedCache(mapped);
      setArticles(await rankFresh(mapped));
      setPage(0);
      containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      scrollRef?.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error("Feed refresh failed:", e);
    } finally {
      setRefreshing(false);
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
    const el = scrollRef?.current || containerRef.current;
    if (!el) return;
    const { scrollTop, clientHeight, scrollHeight } = el;
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
    const el = scrollRef?.current || containerRef.current;
    el?.scrollBy({ top: window.innerHeight, behavior: "smooth" });
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

  const refreshButton = (
    <button
      onClick={refreshFeed}
      disabled={refreshing || loading}
      aria-label="Refresh feed"
      style={{
        position: "fixed", top: "16px", right: "16px", zIndex: 250,
        width: "40px", height: "40px", borderRadius: "50%",
        background: "rgba(10,10,11,0.75)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: refreshing || loading ? "default" : "pointer",
        opacity: refreshing || loading ? 0.6 : 1,
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        transition: "opacity 0.2s",
      }}
    >
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{
          animation: refreshing ? "onyxSpin 0.8s linear infinite" : "none",
        }}
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
      <style>{`@keyframes onyxSpin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );

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
        {refreshButton}
      </div>
    );
  }

  return (
    <>
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
            loadImage={Math.abs(idx - page) <= 3}
            onLike={handleLike}
            onSkip={handleSkip}
            onSave={handleSave}
            onRead={handleRead}
          />
        ))}
      </div>
      {refreshButton}
    </>
  );
}
