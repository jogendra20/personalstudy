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
  "AI":            "#00ff88",
  "ML":            "#00ccff",
  "Trading":       "#ffaa00",
  "DSA":           "#ff6688",
  "Python":        "#3776ab",
  "System Design": "#cc88ff",
  "Web Dev":       "#ff8844",
  "DevOps":        "#44bbff",
  "Security":      "#ff4444",
  "Career":        "#ffdd44",
  "Psychology":    "#ff99cc",
  "Programming":   "#88ff44",
};

export default function FeedCard({
  article, onLike, onSkip, onSave, onRead, isActive
}: FeedCardProps) {
  const [liked, setLiked]     = useState(false);
  const [saved, setSaved]     = useState(false);
  const [tapped, setTapped]   = useState(false);
  const lastTap               = useRef(0);
  const tagColor              = TAG_COLORS[article.tag] || "#ffffff";

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

  const domain = (() => {
    try { return new URL(article.url).hostname.replace("www.", ""); }
    catch { return article.source; }
  })();

  const readTime = article.summary
    ? Math.max(1, Math.ceil(article.summary.split(" ").length / 200))
    : 3;

  return (
    <div
      className="feed-card"
      onClick={handleDoubleTap}
      style={{
        position: "relative",
        width: "100%",
        height: "100svh",
        overflow: "hidden",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
      }}
    >
      <div style={{
        position: "absolute", inset: 0,
        background: article.image_url
          ? `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, #0a0a0a 100%), url(https://wsrv.nl/?url=${encodeURIComponent(article.image_url)}&w=800&output=webp) center/cover no-repeat`
          : `radial-gradient(ellipse at 50% 0%, ${tagColor}40 0%, ${tagColor}10 40%, #0a0a0a 75%)`,
      }} />

      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.95) 100%)",
      }} />

      {tapped && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none", zIndex: 10,
          animation: "heartPop 0.8s ease forwards",
        }}>
          <span style={{ fontSize: "80px" }}>❤️</span>
        </div>
      )}

      <div style={{
        position: "relative", zIndex: 2,
        padding: "16px 20px 8px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
          background: tagColor, color: "#000",
          fontSize: "11px", fontWeight: 700,
          letterSpacing: "0.08em", padding: "4px 10px",
          borderRadius: "20px", fontFamily: "monospace",
          textTransform: "uppercase",
        }}>
          {article.tag}
        </span>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
          {readTime} min read
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        position: "relative", zIndex: 2,
        padding: "0 20px 100px",
        display: "flex", gap: "16px",
      }}>
        <div style={{ flex: 1 }}>
          <p style={{
            color: "rgba(255,255,255,0.5)", fontSize: "12px",
            marginBottom: "8px", fontFamily: "monospace",
          }}>
            {domain}
          </p>
          <h2 style={{
            color: "#fff", fontSize: "clamp(16px, 4vw, 22px)",
            fontWeight: 700, lineHeight: 1.3, marginBottom: "10px",
            fontFamily: "'Georgia', serif",
            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
          }}>
            {article.title}
          </h2>
          {article.summary && (
            <p style={{
              color: "rgba(255,255,255,0.65)", fontSize: "13px",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {article.summary}
            </p>
          )}
        </div>

        <div style={{
          display: "flex", flexDirection: "column",
          gap: "20px", alignItems: "center",
          paddingBottom: "8px", justifyContent: "flex-end",
        }}>
          <ActionBtn emoji={liked ? "❤️" : "🤍"} label="Like" active={liked} color={tagColor}
            onClick={(e) => { e.stopPropagation(); setLiked(!liked); onLike(article.url, article.tag); }} />
          <ActionBtn emoji={saved ? "🔖" : "📌"} label="Save" active={saved} color={tagColor}
            onClick={(e) => { e.stopPropagation(); setSaved(!saved); onSave(article.url, article.tag); }} />
          <ActionBtn emoji="📖" label="Read" active={false} color={tagColor}
            onClick={(e) => { e.stopPropagation(); onRead(article.url); }} />
          <ActionBtn emoji="⏭️" label="Skip" active={false} color="#666"
            onClick={(e) => { e.stopPropagation(); onSkip(article.url, article.tag); }} />
        </div>
      </div>

      <style>{`
        @keyframes heartPop {
          0%   { transform: scale(0); opacity: 1; }
          50%  { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function ActionBtn({ emoji, label, active, color, onClick }: {
  emoji: string; label: string; active: boolean;
  color: string; onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none", cursor: "pointer",
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: "4px", padding: "4px",
      transform: active ? "scale(1.2)" : "scale(1)",
      transition: "transform 0.2s",
    }}>
      <span style={{ fontSize: "28px", filter: active ? `drop-shadow(0 0 8px ${color})` : "none" }}>
        {emoji}
      </span>
      <span style={{
        color: active ? color : "rgba(255,255,255,0.5)",
        fontSize: "10px", fontFamily: "monospace",
      }}>
        {label}
      </span>
    </button>
  );
}
