"use client";

import { useState, useRef, useEffect } from "react";
import { Article, recordRead, recordSkip, recordLike, getTagAffinity } from "@/lib/algorithm";
import { optimizeImage, pollinationsCover } from "@/lib/imageProxy";

interface FeedCardProps {
  article: Article;
  onLike: (url: string, tag: string) => void;
  onSkip: (url: string, tag: string) => void;
  onSave: (url: string, tag: string) => void;
  onRead: (url: string) => void;
  isActive: boolean;
  loadImage?: boolean;
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

function minutesAgo(createdAt: string): string {
  const age = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(age / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function FeedCard({
  article, onLike, onSkip, onSave, onRead, isActive, loadImage = true
}: FeedCardProps) {
  const [liked, setLiked]           = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [saved, setSaved]           = useState(false);
  const [tapped, setTapped]         = useState(false);
  const [imgLoaded, setImgLoaded]   = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);
  const [giveUpImage, setGiveUpImage] = useState(false);
  const imgLoadedRef                = useRef(false);
  const [affinity, setAffinity]     = useState(1.0);
  const lastTap                     = useRef(0);
  const readStart                   = useRef<number>(0);

  useEffect(() => { imgLoadedRef.current = imgLoaded; }, [imgLoaded]);

  // wsrv.nl is a free, unmetered image proxy — great for cost, but on
  // an occasional slow moment (cold cache, high load) it can hang.
  // Stage 1: if the compressed version hasn't loaded within 3s, fall
  // back to the original uncompressed URL. Stage 2 (this effect firing
  // again once useOriginal flips true): if THAT also hangs another 3s,
  // give up cleanly and show the emoji placeholder instead of leaving
  // the shimmer stuck forever with nothing ever resolving.
  useEffect(() => {
    if (!loadImage || giveUpImage) return;
    const t = setTimeout(() => {
      if (imgLoadedRef.current) return;
      if (!useOriginal) {
        setUseOriginal(true);
      } else {
        setGiveUpImage(true);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [loadImage, useOriginal, giveUpImage]);

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

  const timeAgo  = minutesAgo(article.created_at);

  const cleanSummary = article.summary
    ? article.summary
        .replace(/[.\s]*Continue re(ading)?.*$/i, "")
        .replace(/[.\s]*Read more.*$/i, "")
        .replace(/[.\s]*Read on.*$/i, "")
        .replace(/\s+»\s*$/, "")
        .trim()
    : null;
  const trending = TAG_TRENDING[article.tag] || "Curated for you";
  const emoji    = TAG_EMOJI[article.tag] || "📚";
  const hasRealImage = Boolean(article.image_url);
  const imgSrc   = !loadImage || giveUpImage ? undefined
    : useOriginal && hasRealImage ? article.image_url
    : hasRealImage ? optimizeImage(article.image_url, 640, 70)
    : pollinationsCover(article.title, article.tag);

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
    if (transitioning) return;
    setTransitioning(true);
    recordRead(article.tag, article.url);
    setTimeout(() => onRead(article.url), 380);
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
      {/* Rotated category label — on outer wrapper */}
      <div style={{
        position: "absolute", left: "0", top: "25%",
        zIndex: 35,
        transform: "translateX(-38px) translateY(-50%) rotate(-90deg)",
        transformOrigin: "center center",
        display: "flex", alignItems: "center", gap: "8px",
        pointerEvents: "none",
      }}>
        <div style={{ width: "16px", height: "1px", background: "#D4AF37", opacity: 0.7 }} />
        <span style={{
          fontSize: "7px", fontWeight: 800,
          letterSpacing: "0.3em", color: "rgba(212,175,55,0.8)",
          textTransform: "uppercase", whiteSpace: "nowrap",
        }}>
          {article.tag}
        </span>
      </div>

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

      {/* Right-side action rail — like / save / read */}
      <div style={{
        position: "absolute", right: "12px", bottom: "220px",
        zIndex: 45, display: "flex", flexDirection: "column", gap: "14px",
      }}>
        <RailBtn
          active={liked}
          label={liked ? "Liked" : "Like"}
          onClick={(e) => {
            e.stopPropagation();
            setLiked(!liked);
            recordLike(article.tag);
            onLike(article.url, article.tag);
          }}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill={liked ? "#D4AF37" : "none"}
              stroke={liked ? "#D4AF37" : "#fff"} strokeWidth="2">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.318L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          }
        />
        <RailBtn
          active={saved}
          label={saved ? "Saved" : "Save"}
          onClick={(e) => {
            e.stopPropagation();
            setSaved(!saved);
            onSave(article.url, article.tag);
          }}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill={saved ? "#D4AF37" : "none"}
              stroke={saved ? "#D4AF37" : "#fff"} strokeWidth="2">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
            </svg>
          }
        />
        <RailBtn
          active={false}
          label="Read"
          onClick={(e) => { e.stopPropagation(); handleRead(); }}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="#fff" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          }
        />
      </div>

      {/* IMAGE */}
      <div style={{
        position: "relative",
        height: "420px", width: "100%",
        overflow: "hidden", flexShrink: 0,
      }}>
        {!imgLoaded && !giveUpImage && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, #f0ede6 25%, #e8e4db 50%, #f0ede6 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
          }} />
        )}

        {imgSrc ? (
          <img
            src={imgSrc}
            alt={article.title}
            loading={isActive ? "eager" : "lazy"}
            // @ts-ignore — fetchPriority isn't in the TS DOM lib yet on all versions, but is a real, valid HTML attribute
            fetchpriority={isActive ? "high" : "auto"}
            onLoad={() => setImgLoaded(true)}
            onError={() => {
              if (!useOriginal && hasRealImage) {
                setUseOriginal(true); // proxy failed — try the original directly
              } else {
                setGiveUpImage(true); // nothing left to try — show the emoji placeholder
              }
            }}
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
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #f0ede6, #e8e4db)",
            fontSize: "64px",
          }}>
            {emoji}
          </div>
        )}

        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0) 20%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.82) 100%)",
        }} />

        {/* Title overlay on image */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "0 20px 48px",
          zIndex: 5,
        }}>
          <div style={{
            fontSize: "9px", fontWeight: 800,
            letterSpacing: "0.25em", color: "#D4AF37",
            textTransform: "uppercase", marginBottom: "8px",
          }}>
            {article.tag}
          </div>
          <h2
            onClick={(e) => { e.stopPropagation(); handleRead(); }}
            style={{
              fontSize: "clamp(22px, 6vw, 32px)",
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              fontFamily: "'Georgia', serif",
              cursor: "pointer",
              margin: 0,
              textShadow: "0 2px 12px rgba(0,0,0,0.4)",
            }}
          >
            {article.title}
          </h2>
        </div>

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
          position: "absolute", top: "56px", right: "16px",
          zIndex: 6,
        }}>
          <div style={{
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(8px)",
            borderRadius: "8px", padding: "4px 10px",
            fontSize: "9px", color: "rgba(255,255,255,0.7)",
            fontWeight: 500, letterSpacing: "0.03em",
          }}>
            {domain}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{
        display: "flex", flexDirection: "column",
        padding: "20px 20px 100px",
        position: "relative", zIndex: 30,
        gap: "12px",
        background: "#FAF9F5",
        borderRadius: "24px 24px 0 0",
        marginTop: "-24px",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
      }}>

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#333" }}>{timeAgo}</span>
            <span style={{ fontSize: "8px", color: "#bbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>Ago</span>
          </div>
          <div style={{ width: "1px", height: "24px", background: "rgba(0,0,0,0.08)" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#D4AF37" }}>{readTime}</span>
            <span style={{ fontSize: "8px", color: "#bbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>Min Read</span>
          </div>
          <div style={{ width: "1px", height: "24px", background: "rgba(0,0,0,0.08)" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#D4AF37" }}>✦</span>
            <span style={{ fontSize: "8px", color: "#bbb", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{trending}</span>
          </div>
        </div>

        {/* Context */}
        {cleanSummary && (
          <p style={{
            fontSize: "13px", color: "#666",
            lineHeight: 1.7, margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            fontWeight: 300,
            letterSpacing: "0.01em",
          }}>
            {cleanSummary}
          </p>
        )}
      </div>

      {/* Transition overlay */}
      {transitioning && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "#FAF9F5",
          animation: "fadeInWhite 0.38s cubic-bezier(0.4,0,0.2,1) forwards",
          pointerEvents: "none",
        }} />
      )}

      <style>{`
        @keyframes fadeInWhite {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
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

function RailBtn({ active, onClick, icon, label }: {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: "4px",
      background: "none", border: "none", cursor: "pointer",
      padding: 0,
    }}>
      <div style={{
        width: "44px", height: "44px",
        borderRadius: "50%",
        background: active ? "rgba(212,175,55,0.22)" : "rgba(0,0,0,0.32)",
        backdropFilter: "blur(6px)",
        border: `1px solid ${active ? "#D4AF37" : "rgba(255,255,255,0.25)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: active ? "0 0 14px rgba(212,175,55,0.35)" : "0 2px 10px rgba(0,0,0,0.2)",
        transition: "all 0.2s",
      }}>
        {icon}
      </div>
      <span style={{
        fontSize: "8px", fontWeight: 700,
        color: active ? "#D4AF37" : "rgba(255,255,255,0.9)",
        textTransform: "uppercase", letterSpacing: "0.04em",
        textShadow: "0 1px 4px rgba(0,0,0,0.5)",
      }}>
        {label}
      </span>
    </button>
  );
}
