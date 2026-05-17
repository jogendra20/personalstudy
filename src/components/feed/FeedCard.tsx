"use client";

import { useState, useRef } from "react";
import { Article } from "@/lib/algorithm";

interface FeedCardProps {
  article: Article;
  onLike: (url: string, tag: string) => void;
  onSkip: (url: string, tag: string) => void;
  onSave: (url: string, tag: string) => void;
  onRead: (url: string) => void;
  isActive: boolean;
}

const TAG_COLORS: Record<string, string> = {
  "AI":            "#D4AF37",
  "ML":            "#D4AF37",
  "Trading":       "#D4AF37",
  "DSA":           "#D4AF37",
  "Python":        "#D4AF37",
  "System Design": "#D4AF37",
  "Web Dev":       "#D4AF37",
  "DevOps":        "#D4AF37",
  "Security":      "#D4AF37",
  "Career":        "#D4AF37",
  "Psychology":    "#D4AF37",
  "Programming":   "#D4AF37",
};

export default function FeedCard({
  article, onLike, onSkip, onSave, onRead, isActive
}: FeedCardProps) {
  const [liked, setLiked]         = useState(false);
  const [saved, setSaved]         = useState(false);
  const [tapped, setTapped]       = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [voted, setVoted]         = useState<string | null>(null);
  const lastTap                   = useRef(0);

  const domain = (() => {
    try { return new URL(article.url).hostname.replace("www.", ""); }
    catch { return article.source; }
  })();

  const readTime = article.summary
    ? Math.max(1, Math.ceil(article.summary.split(" ").length / 200))
    : 3;

  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setLiked(true);
      setTapped(true);
      onLike(article.url, article.tag);
      setTimeout(() => setTapped(false), 800);
    }
    lastTap.current = now;
  }

  const tagEmoji: Record<string, string> = {
    "AI": "🤖", "ML": "🧠", "Trading": "📈", "DSA": "🧮",
    "Python": "🐍", "System Design": "🏗️", "Web Dev": "🌐",
    "DevOps": "⚙️", "Security": "🔐", "Career": "🎯",
    "Psychology": "🧬", "Programming": "💻",
  };

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
      {/* Top gold reading progress line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "2px", background: "rgba(212,175,55,0.15)", zIndex: 50,
      }}>
        <div style={{
          height: "100%", width: `${Math.random() * 40 + 10}%`,
          background: "linear-gradient(90deg, #D4AF37aa, #D4AF37, #f0d060)",
          transition: "width 0.3s",
        }} />
      </div>

      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "64px", zIndex: 40,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px", paddingTop: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{
            fontSize: "10px", fontWeight: 800,
            letterSpacing: "0.3em", color: "#111",
            textTransform: "uppercase",
          }}>ONYX</span>
          <div style={{
            width: "6px", height: "6px",
            borderRadius: "50%", background: "#D4AF37",
          }} />
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(212,175,55,0.2)",
          borderRadius: "20px", padding: "4px 12px",
        }}>
          <div style={{
            width: "6px", height: "6px",
            borderRadius: "50%", background: "#D4AF37",
            animation: "pulse 2s infinite",
          }} />
          <span style={{
            fontSize: "9px", fontWeight: 700,
            letterSpacing: "0.15em", color: "#786028",
            textTransform: "uppercase",
          }}>
            {article.tag}
          </span>
        </div>
      </div>

      {/* IMAGE — top 50% */}
      <div style={{
        position: "relative",
        height: "50%", width: "100%",
        overflow: "hidden", flexShrink: 0,
        cursor: "pointer",
      }}
        onClick={(e) => { e.stopPropagation(); handleDoubleTap(); }}
      >
        {/* Shimmer */}
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
              transition: "opacity 0.4s ease, transform 2s ease",
              transform: "scale(1)",
            }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "64px",
            background: "linear-gradient(135deg, #f5f0e8, #ede8df)",
          }}>
            {tagEmoji[article.tag] || "📚"}
          </div>
        )}

        {/* White scrim — bottom of image */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(250,249,245,0) 40%, rgba(250,249,245,0.5) 75%, rgba(250,249,245,1) 100%)",
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
              animation: "goldHeartBurst 0.8s cubic-bezier(0.175,0.885,0.32,1.275) forwards",
            }}>♥</span>
          </div>
        )}

        {/* Source chip */}
        <div style={{
          position: "absolute", bottom: "12px", left: "16px",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(8px)",
          borderRadius: "8px", padding: "4px 8px",
          fontSize: "10px", color: "#666",
          fontWeight: 500,
        }}>
          {domain}
        </div>
      </div>

      {/* CONTENT — bottom 50% */}
      <div style={{
        height: "50%", flexShrink: 0,
        display: "flex", flexDirection: "column",
        justifyContent: "space-between",
        padding: "4px 20px 24px",
        position: "relative", zIndex: 30,
      }}>
        {/* Tag + read time */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          marginBottom: "6px",
        }}>
          <span style={{
            fontSize: "9px", fontWeight: 800,
            letterSpacing: "0.2em", color: "#D4AF37",
            textTransform: "uppercase",
          }}>
            {article.tag}
          </span>
          <div style={{
            width: "4px", height: "4px",
            borderRadius: "50%", background: "#ccc",
          }} />
          <span style={{
            fontSize: "10px", color: "#999", fontWeight: 500,
          }}>
            {readTime} min read
          </span>
        </div>

        {/* Title */}
        <h2
          onClick={(e) => { e.stopPropagation(); onRead(article.url); }}
          style={{
            fontSize: "clamp(18px, 5vw, 26px)",
            fontWeight: 600,
            color: "#111",
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
            fontFamily: "'Georgia', 'Playfair Display', serif",
            cursor: "pointer",
            marginBottom: "6px",
            transition: "color 0.2s",
          }}
        >
          {article.title}
        </h2>

        {/* Summary */}
        {article.summary && (
          <p style={{
            fontSize: "12px", color: "#777",
            lineHeight: 1.6, fontWeight: 300,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            marginBottom: "8px",
          }}>
            {article.summary}
          </p>
        )}

        {/* Poll micro-interaction */}
        <div style={{
          background: "rgba(245,242,236,0.8)",
          border: "1px solid rgba(212,175,55,0.15)",
          borderRadius: "16px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}>
          <span style={{
            fontSize: "11px", fontWeight: 600, color: "#555",
          }}>
            Worth your time?
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            {["Definitely", "Maybe"].map(opt => (
              <button
                key={opt}
                onClick={(e) => { e.stopPropagation(); setVoted(opt); }}
                style={{
                  fontSize: "9px", fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  border: voted === opt
                    ? "1px solid #D4AF37"
                    : "1px solid rgba(212,175,55,0.2)",
                  background: voted === opt ? "#111" : "#FAF9F5",
                  color: voted === opt ? "#D4AF37" : "#786028",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Read CTA */}
          <button
            onClick={(e) => { e.stopPropagation(); onRead(article.url); }}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "#111", color: "#fff",
              fontSize: "10px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "12px 18px", borderRadius: "999px",
              border: "none", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <span>Read Article</span>
            <span style={{ color: "#D4AF37", fontSize: "12px" }}>›</span>
          </button>

          {/* Icon actions */}
          <div style={{ display: "flex", gap: "8px" }}>
            <IconBtn
              active={liked}
              color="#D4AF37"
              onClick={(e) => {
                e.stopPropagation();
                setLiked(!liked);
                onLike(article.url, article.tag);
              }}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "#D4AF37" : "none"} stroke={liked ? "#D4AF37" : "currentColor"} strokeWidth="2">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.318L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              }
            />
            <IconBtn
              active={saved}
              color="#D4AF37"
              onClick={(e) => {
                e.stopPropagation();
                setSaved(!saved);
                onSave(article.url, article.tag);
              }}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "#D4AF37" : "none"} stroke={saved ? "#D4AF37" : "currentColor"} strokeWidth="2">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg>
              }
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes goldHeartBurst {
          0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
          20%  { transform: scale(1.2) rotate(10deg); opacity: 1; }
          40%  { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function IconBtn({ active, color, onClick, icon }: {
  active: boolean;
  color: string;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "44px", height: "44px",
        borderRadius: "50%",
        background: "#fff",
        border: `1px solid ${active ? color : "rgba(0,0,0,0.1)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        color: active ? color : "#aaa",
        boxShadow: active ? `0 0 12px ${color}33` : "0 2px 8px rgba(0,0,0,0.06)",
        transition: "all 0.2s",
      }}
    >
      {icon}
    </button>
  );
}
