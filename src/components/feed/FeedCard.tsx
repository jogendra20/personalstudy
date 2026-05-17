"use client";

import { useState, useRef, useEffect } from "react";
import { Article, recordRead, recordSkip, recordLike, getTagAffinity } from "@/lib/algorithm";

interface FeedCardProps {
  article: Article;
  onLike: (url: string, tag: string) => void;
  onSkip: (url: string, tag: string) => void;
  onSave: (url: string, tag: string) => void;
  onRead: (url: string) => void;
  isActive: boolean;
}

const TAG_EMOJI: Record<string, string> = {
  "AI": "🤖", "ML": "🧠", "Trading": "📈", "DSA": "🧮",
  "Python": "🐍", "System Design": "🏗️", "Web Dev": "🌐",
  "DevOps": "⚙️", "Security": "🔐", "Career": "🎯",
  "Psychology": "🧬", "Programming": "💻",
};

const TAG_TRENDING: Record<string, string> = {
  "AI": "Trending in AI",
  "ML": "Rising in ML",
  "Trading": "Hot in Markets",
  "DSA": "Popular in DSA",
  "Python": "Trending in Python",
  "System Design": "Featured",
  "Web Dev": "Trending in Web",
  "DevOps": "Popular in DevOps",
  "Security": "Critical Read",
  "Career": "Trending in Career",
  "Psychology": "Highly Curated",
  "Programming": "Editor's Pick",
};

function fakeReads(url: string): string {
  const hash = url.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const n = (hash % 900) + 100;
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

function fakeMinutesAgo(createdAt: string): string {
  const age = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(age / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function FeedCard({
  article, onLike, onSkip, onSave, onRead, isActive
}: FeedCardProps) {
  const [liked, setLiked]           = useState(false);
  const [saved, setSaved]           = useState(false);
  const [tapped, setTapped]         = useState(false);
  const [imgLoaded, setImgLoaded]   = useState(false);
  const [voted, setVoted]           = useState<string | null>(null);
  const [affinity, setAffinity]     = useState(1.0);
  const lastTap                     = useRef(0);
  const readStart                   = useRef<number>(0);

  useEffect(() => {
    if (isActive) {
      readStart.current = Date.now();
      const a = getTagAffinity();
      setAffinity(a[article.tag] || 1.0);
    }
  }, [isActive, article.tag]);

  const domain = (() => {
    try { return new URL(article.url).hostname.replace("www.", ""); }
    catch { return article.source; }
  })();

  const readTime = article.summary
    ? Math.max(1, Math.ceil(article.summary.split(" ").length / 200))
    : 3;

  const reads    = fakeReads(article.url);
  const timeAgo  = fakeMinutesAgo(article.created_at);
  const trending = TAG_TRENDING[article.tag] || "Curated for you";
  const emoji    = TAG_EMOJI[article.tag] || "📚";

  // Affinity bar width (1-5 scale → 20%-100%)
  const affinityPct = Math.round((affinity / 5) * 100);

  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setLiked(true);
      setTapped(true);
      recordLike(article.tag);
      onLike(article.url, article.tag);
      setTimeout(() => setTapped(false), 800);
    }
    lastTap.current = now;
  }

  function handleRead() {
    recordRead(article.tag, article.url);
    onRead(article.url);
  }

  function handleSkip(e: React.MouseEvent) {
    e.stopPropagation();
    recordSkip(article.tag);
    onSkip(article.url, article.tag);
  }

  return (
    <div
      onClick={handleDoubleTap}
      style={{
        position: "relative",
        width: "100%",
        height: "100svh",
        background: "#FAF9F5",
        display: "flex",
        flexDirection: "column",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top gold progress line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "2px", background: "rgba(212,175,55,0.15)", zIndex: 50,
      }}>
        <div style={{
          height: "100%",
          width: `${affinityPct}%`,
          background: "linear-gradient(90deg, #D4AF37aa, #D4AF37, #f0d060)",
          transition: "width 0.8s ease",
        }} />
      </div>

      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "56px", zIndex: 40,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px", paddingTop: "10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{
            fontSize: "10px", fontWeight: 800,
            letterSpacing: "0.3em", color: "#111",
            textTransform: "uppercase",
          }}>ONYX</span>
          <div style={{
            width: "5px", height: "5px",
            borderRadius: "50%", background: "#D4AF37",
          }} />
        </div>
        <button
          onClick={handleSkip}
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "20px",
            padding: "4px 12px",
            fontSize: "10px", color: "#999",
            fontWeight: 600, cursor: "pointer",
            letterSpacing: "0.05em",
          }}
        >
          Skip ›
        </button>
      </div>

      {/* IMAGE — top 48% */}
      <div style={{
        position: "relative",
        height: "48%", width: "100%",
        overflow: "hidden", flexShrink: 0,
      }}>
        {!imgLoaded && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, #f0ede6 25%, #e8e4db 50%, #f0ede6 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }} />
        )}

        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.title}
            onLoad={() => setImgLoaded(true)}
            style={{
              width: "100%", height: "100%",
              objectFit: "cover",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 0.5s ease",
            }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "72px",
            background: "linear-gradient(135deg, #f5f0e8, #ede8df)",
          }}>
            {emoji}
          </div>
        )}

        {/* White scrim */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(250,249,245,0) 35%, rgba(250,249,245,0.6) 75%, rgba(250,249,245,1) 100%)",
        }} />

        {/* Double tap heart */}
        {tapped && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <span style={{
              fontSize: "80px", color: "#D4AF37",
              animation: "goldHeart 0.8s cubic-bezier(0.175,0.885,0.32,1.275) forwards",
            }}>♥</span>
          </div>
        )}

        {/* Source chip */}
        <div style={{
          position: "absolute", bottom: "14px", left: "16px",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(8px)",
            borderRadius: "8px", padding: "4px 8px",
            fontSize: "10px", color: "#555", fontWeight: 500,
          }}>
            {domain}
          </div>
        </div>
      </div>

      {/* CONTENT — bottom 52% */}
      <div style={{
        height: "52%", flexShrink: 0,
        display: "flex", flexDirection: "column",
        padding: "12px 20px 20px",
        position: "relative", zIndex: 30,
        gap: "8px",
      }}>

        {/* Stats line */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <span style={{
            fontSize: "9px", fontWeight: 800,
            letterSpacing: "0.2em", color: "#D4AF37",
            textTransform: "uppercase",
          }}>
            {article.tag}
          </span>
          <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#ccc" }} />
          <span style={{ fontSize: "10px", color: "#aaa" }}>{reads} reads</span>
          <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#ccc" }} />
          <span style={{ fontSize: "10px", color: "#aaa" }}>{timeAgo}</span>
          <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#ccc" }} />
          <span style={{
            fontSize: "9px", fontWeight: 700,
            color: "#D4AF37", letterSpacing: "0.05em",
          }}>
            🔥 {trending}
          </span>
        </div>

        {/* Title */}
        <h2
          onClick={(e) => { e.stopPropagation(); handleRead(); }}
          style={{
            fontSize: "clamp(17px, 4.5vw, 24px)",
            fontWeight: 700,
            color: "#111",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            fontFamily: "'Georgia', serif",
            cursor: "pointer",
            margin: 0,
          }}
        >
          {article.title}
        </h2>

        {/* Context — summary with read time */}
        {article.summary && (
          <div style={{
            background: "rgba(212,175,55,0.04)",
            borderLeft: "2px solid #D4AF37",
            borderRadius: "0 8px 8px 0",
            padding: "8px 12px",
          }}>
            <p style={{
              fontSize: "12px", color: "#666",
              lineHeight: 1.6, margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {article.summary}
            </p>
            <span style={{
              fontSize: "10px", color: "#D4AF37",
              fontWeight: 600, marginTop: "4px",
              display: "block",
            }}>
              {readTime} min read
            </span>
          </div>
        )}

        {/* Affinity indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{
            fontSize: "9px", color: "#bbb",
            fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>
            Your interest
          </span>
          <div style={{
            flex: 1, height: "3px",
            background: "rgba(212,175,55,0.15)",
            borderRadius: "2px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${affinityPct}%`,
              background: "#D4AF37",
              borderRadius: "2px",
              transition: "width 0.8s ease",
            }} />
          </div>
          <span style={{ fontSize: "9px", color: "#D4AF37", fontWeight: 700 }}>
            {affinityPct}%
          </span>
        </div>

        {/* Bottom actions */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
        }}>
          {/* Read CTA */}
          <button
            onClick={(e) => { e.stopPropagation(); handleRead(); }}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "#111", color: "#fff",
              fontSize: "10px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "12px 20px", borderRadius: "999px",
              border: "none", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <span>Read Article</span>
            <span style={{ color: "#D4AF37", fontSize: "14px" }}>›</span>
          </button>

          {/* Icon actions */}
          <div style={{ display: "flex", gap: "8px" }}>
            <IconBtn
              active={liked}
              onClick={(e) => {
                e.stopPropagation();
                setLiked(!liked);
                recordLike(article.tag);
                onLike(article.url, article.tag);
              }}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24"
                  fill={liked ? "#D4AF37" : "none"}
                  stroke={liked ? "#D4AF37" : "#aaa"} strokeWidth="2">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.318L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              }
            />
            <IconBtn
              active={saved}
              onClick={(e) => {
                e.stopPropagation();
                setSaved(!saved);
                onSave(article.url, article.tag);
              }}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24"
                  fill={saved ? "#D4AF37" : "none"}
                  stroke={saved ? "#D4AF37" : "#aaa"} strokeWidth="2">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg>
              }
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes goldHeart {
          0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
          20%  { transform: scale(1.2) rotate(10deg); opacity: 1; }
          40%  { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

function IconBtn({ active, onClick, icon }: {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      width: "44px", height: "44px",
      borderRadius: "50%", background: "#fff",
      border: `1px solid ${active ? "#D4AF37" : "rgba(0,0,0,0.08)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer",
      boxShadow: active ? "0 0 12px rgba(212,175,55,0.3)" : "0 2px 8px rgba(0,0,0,0.06)",
      transition: "all 0.2s",
    }}>
      {icon}
    </button>
  );
}
