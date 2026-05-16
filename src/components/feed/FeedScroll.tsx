"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import FeedCard from "./FeedCard";
import { Article, rankArticles, deduplicateArticles } from "@/lib/algorithm";
import { logAction, getUserActions, getArticles } from "@/lib/supabase";
import { updateStreak, addXP, updateQuestProgress, XP_REWARDS } from "@/lib/gamification";

interface FeedScrollProps {
  onXP: (amount: number, reason: string) => void;
  onBadge: (name: string) => void;
}

export default function FeedScroll({ onXP, onBadge }: FeedScrollProps) {
  const [articles, setArticles]   = useState<Article[]>([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(0);
  const containerRef              = useRef<HTMLDivElement>(null);
  const readTimers                = useRef<Record<string, number>>({});

  // Load feed
  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    setLoading(true);
    try {
      const res = await fetch("/api/feed");
      if (!res.ok) throw new Error("Feed failed");
      const raw = await res.json();
      // Map RSS shape → Article shape FeedCard expects
      const mapped = raw.map((a: any, i: number) => ({
        id: i,
        url: a.url,
        title: a.title,
        source: a.source,
        tag: a.tag,
        summary: a.description || "",
        image_url: a.cover || "",
        score: 1,
        created_at: a.publishedAt,
      }));
      setArticles(mapped);
    } catch (e) {
      console.error("Feed load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  // Load more when near end
  async function loadMore() {
    try {
      const raw = await getArticles(20);
      const actions = await getUserActions();
      const ranked = rankArticles(raw, actions, null);
      setArticles(prev => deduplicateArticles([...prev, ...ranked]));
    } catch {}
  }

  // Track scroll position
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight, scrollHeight } = containerRef.current;
    const currentIdx = Math.round(scrollTop / clientHeight);
    setPage(currentIdx);

    // Load more near end
    if (scrollTop + clientHeight > scrollHeight - clientHeight * 2) {
      loadMore();
    }

    // Track read time
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
    // Scroll to next
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
    }
    window.open(url, "_blank");
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
      ref={containerRef}
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
