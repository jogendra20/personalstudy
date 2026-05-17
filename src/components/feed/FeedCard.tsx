"use client";

import { useState, useRef, useEffect } from "react";
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

const TAG_GRADIENTS: Record<string, string> = {
  "AI":            "linear-gradient(135deg, #001a0d, #003320)",
  "ML":            "linear-gradient(135deg, #001a33, #003366)",
  "Trading":       "linear-gradient(135deg, #1a0e00, #332200)",
  "DSA":           "linear-gradient(135deg, #1a0008, #330010)",
  "Python":        "linear-gradient(135deg, #001133, #002266)",
  "System Design": "linear-gradient(135deg, #110022, #220044)",
  "Web Dev":       "linear-gradient(135deg, #1a0800, #331500)",
  "DevOps":        "linear-gradient(135deg, #001a33, #003366)",
  "Security":      "linear-gradient(135deg, #1a0000, #330000)",
  "Career":        "linear-gradient(135deg, #1a1400, #332800)",
  "Psychology":    "linear-gradient(135deg, #1a0011, #330022)",
  "Programming":   "linear-gradient(135deg, #0a1a00, #143300)",
};

export default function FeedCard({
  article, onLike, onSkip, onSave, onRead, isActive
}: FeedCardProps) {
  const [liked, setLiked]       = useState(false);
  const [saved, setSaved]       = useState(false);
  const [tapped, setTapped]     = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [readProgress] = useState(Math.floor(Math.random() * 40));
  const lastTap = useRef(0);

  const tagColor    = TAG_COLORS[article.tag]    || "#ffffff";
  const tagGradient = TAG_GRADIENTS[article.tag] || "linear-gradient(135deg, #0a0a0a, #1a1a1a)";

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

  return (
    <div
      onClick={handleDoubleTap}
      style={{
        position: "relative",
        width: "100%",
        height: "100svh",
        background: tagGradient,
        display: "flex",
        flexDirection: "column",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        padding: "0 16px",
        overflowY: "auto",
      }}
    >
      {/* Subtle noise texture overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `radial-gradient(circle at 20% 50%, ${tagColor}08 0%, transparent 60%),
                          radial-gradient(circle at 80% 20%, ${tagColor}05 0%, transparent 50%)`,
        pointerEvents: "none",
      }} />

      {/* Double tap heart */}
      {tapped && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <span style={{
            fontSize: "80px",
            animation: "heartPop 0.8s ease forwards",
          }}>❤️</span>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        paddingTop: "56px", paddingBottom: "12px",
        position: "relative", zIndex: 2,
      }}>
        <span style={{
          background: tagColor,
          color: "#000",
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "0.1em",
          padding: "5px 12px",
          borderRadius: "20px",
          fontFamily: "monospace",
          textTransform: "uppercase",
          boxShadow: `0 0 12px ${tagColor}66`,
        }}>
          {article.tag}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: "11px",
            fontFamily: "monospace",
          }}>
            ⏱ {readTime} min
          </span>
        </div>
      </div>

      {/* IMAGE — sharp, contained, glowing */}
      <div style={{
        position: "relative", zIndex: 2,
        borderRadius: "16px",
        overflow: "hidden",
        height: "220px",
        flexShrink: 0,
        boxShadow: `0 0 0 1px ${tagColor}33, 0 8px 32px rgba(0,0,0,0.6), 0 0 60px ${tagColor}11`,
        background: `linear-gradient(135deg, #111, #1a1a1a)`,
      }}>
        {article.image_url ? (
          <>
            {!imgLoaded && (
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)`,
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
              }} />
            )}
            <img
              src={article.image_url}
              alt={article.title}
              onLoad={() => setImgLoaded(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: imgLoaded ? 1 : 0,
                transition: "opacity 0.4s ease",
              }}
            />
          </>
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "48px",
            background: tagGradient,
          }}>
            {article.tag === "Trading" ? "📈"
              : article.tag === "AI" ? "🤖"
              : article.tag === "DSA" ? "🧮"
              : article.tag === "Python" ? "🐍"
              : article.tag === "Security" ? "🔐"
              : "📚"}
          </div>
        )}

        {/* Source chip on image */}
        <div style={{
          position: "absolute", bottom: "10px", left: "10px",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          borderRadius: "8px",
          padding: "4px 8px",
          fontSize: "10px",
          color: "rgba(255,255,255,0.7)",
          fontFamily: "monospace",
        }}>
          {domain}
        </div>
      </div>

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 2,
        flex: 1, paddingTop: "16px",
      }}>
        <h2 style={{
          color: "#ffffff",
          fontSize: "clamp(18px, 4.5vw, 24px)",
          fontWeight: 800,
          lineHeight: 1.25,
          marginBottom: "10px",
          fontFamily: "'Georgia', serif",
          letterSpacing: "-0.02em",
        }}>
          {article.title}
        </h2>

        {article.summary && (
          <p style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: "13px",
            lineHeight: 1.6,
            marginBottom: "16px",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {article.summary}
          </p>
        )}

        {/* Read progress bar */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginBottom: "6px",
          }}>
            <span style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: "10px", fontFamily: "monospace",
            }}>
              READING PROGRESS
            </span>
            <span style={{
              color: tagColor,
              fontSize: "10px", fontFamily: "monospace",
            }}>
              {readProgress}%
            </span>
          </div>
          <div style={{
            height: "3px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "2px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${readProgress}%`,
              background: tagColor,
              borderRadius: "2px",
              boxShadow: `0 0 6px ${tagColor}`,
            }} />
          </div>
        </div>

        {/* READ CTA */}
        <button
          onClick={(e) => { e.stopPropagation(); onRead(article.url); }}
          style={{
            width: "100%",
            padding: "14px",
            background: `linear-gradient(135deg, ${tagColor}22, ${tagColor}11)`,
            border: `1px solid ${tagColor}44`,
            borderRadius: "12px",
            color: tagColor,
            fontSize: "14px",
            fontWeight: 700,
            fontFamily: "monospace",
            letterSpacing: "0.08em",
            cursor: "pointer",
            marginBottom: "16px",
            boxShadow: `0 0 20px ${tagColor}11`,
            transition: "all 0.2s",
          }}
        >
          READ ARTICLE →
        </button>

        {/* Action row */}
        <div style={{
          display: "flex",
          justifyContent: "space-around",
          paddingBottom: "32px",
        }}>
          <ActionBtn
            emoji={liked ? "❤️" : "🤍"}
            label="Like"
            active={liked}
            color={tagColor}
            onClick={(e) => {
              e.stopPropagation();
              setLiked(!liked);
              onLike(article.url, article.tag);
            }}
          />
          <ActionBtn
            emoji={saved ? "🔖" : "📌"}
            label="Save"
            active={saved}
            color={tagColor}
            onClick={(e) => {
              e.stopPropagation();
              setSaved(!saved);
              onSave(article.url, article.tag);
            }}
          />
          <ActionBtn
            emoji="⏭️"
            label="Skip"
            active={false}
            color="rgba(255,255,255,0.3)"
            onClick={(e) => {
              e.stopPropagation();
              onSkip(article.url, article.tag);
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes heartPop {
          0%   { transform: scale(0); opacity: 1; }
          50%  { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
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
      alignItems: "center", gap: "4px", padding: "8px 16px",
      borderRadius: "12px",
      transition: "all 0.2s",
    }}>
      <span style={{
        fontSize: "24px",
        filter: active ? `drop-shadow(0 0 8px ${color})` : "none",
        transform: active ? "scale(1.2)" : "scale(1)",
        transition: "all 0.2s",
      }}>
        {emoji}
      </span>
      <span style={{
        color: active ? color : "rgba(255,255,255,0.35)",
        fontSize: "10px", fontFamily: "monospace",
        letterSpacing: "0.05em",
      }}>
        {label}
      </span>
    </button>
  );
}
