"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchFeed,
  Article,
  getSavedArticles,
  toggleSaveArticle,
  isArticleSaved,
  getGroqKey,
  setGroqKey,
} from "@/lib/api";

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconBookmark = ({ filled }: { filled?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconDevto = () => (
  <svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor">
    <path d="M120.12 208.29c-3.88-2.9-7.77-4.35-11.65-4.35H91.03v104.47h17.45c3.88 0 7.77-1.45 11.65-4.35 3.88-2.9 5.82-7.25 5.82-13.06v-69.65c-.01-5.8-1.96-10.16-5.83-13.06zM404.1 32H43.9C19.7 32 .06 51.59 0 75.8v360.4C.06 460.41 19.7 480 43.9 480h360.2c24.21 0 43.84-19.59 43.9-43.8V75.8c-.06-24.21-19.7-43.8-43.9-43.8zM154.2 291.19c0 18.81-11.61 47.31-48.36 47.25h-46.4V172.98h47.38c35.44 0 47.36 28.46 47.37 47.28zm100.68-88.66H201.6v38.42h32.57v29.57H201.6v38.41h53.29v29.57h-62.18c-11.16.29-20.44-8.53-20.72-19.69V193.7c-.27-11.15 8.56-20.41 19.71-20.69h63.19l-.01 29.52zm103.64 115.29c-13.2 30.75-36.85 24.63-47.44 0l-38.53-144.8h32.57l29.71 113.72 29.57-113.72h32.58z" />
  </svg>
);
const IconMedium = () => (
  <svg width="14" height="14" viewBox="0 0 640 512" fill="currentColor">
    <path d="M180.5,74.262C80.813,74.262,0,155.633,0,256S80.819,437.738,180.5,437.738,361,356.373,361,256,280.191,74.262,180.5,74.262Zm288.25,10.646c-49.845,0-90.245,76.619-90.245,171.095s40.406,171.1,90.251,171.1,90.251-76.619,90.251-171.1H559C559,161.5,518.6,84.908,468.752,84.908Zm139.506,17.821c-17.526,0-31.735,68.628-31.735,153.274s14.2,153.274,31.726,153.274S640,340.631,640,255.985,625.785,102.729,608.258,102.729Z" />
  </svg>
);

// ─── Tag colors ───────────────────────────────────────────────────────────────
const TAG_COLORS: Record<string, string> = {
  "AI":            "#c8ff40",
  "ML":            "#7c6fff",
  "Python":        "#ff6b35",
  "Web Dev":       "#40d9ff",
  "Programming":   "#ff40a0",
  "System Design": "#ffbe40",
  "Trading":       "#40ffbe",
  "DSA":           "#ff9f40",
  "DevOps":        "#40c8ff",
  "Linux":         "#e0e040",
  "Career":        "#c840ff",
  "Security":      "#ff4040",
};

function getTagColor(tag: string) {
  return TAG_COLORS[tag] || "#888";
}

// ─── Article Card ─────────────────────────────────────────────────────────────
function ArticleCard({ article, onClick }: { article: Article; onClick: () => void }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isArticleSaved(article.url));
  }, [article.url]);

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    const result = toggleSaveArticle(article);
    setSaved(result);
  }

  const tagColor = getTagColor(article.tag);

  return (
    <div
      onClick={onClick}
      className="animate-fade-up"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.2s, transform 0.2s",
        position: "relative",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Cover image */}
      {article.cover && (
        <div style={{ height: "140px", overflow: "hidden", background: "var(--surface2)" }}>
          <img
            src={article.cover}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
            onError={e => { (e.target as HTMLElement).style.display = "none"; }}
          />
        </div>
      )}

      <div style={{ padding: "16px" }}>
        {/* Tag + Source */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span style={{
            fontSize: "10px",
            fontWeight: 700,
            fontFamily: "'DM Mono', monospace",
            color: tagColor,
            background: `${tagColor}15`,
            border: `1px solid ${tagColor}30`,
            padding: "2px 8px",
            borderRadius: "20px",
            letterSpacing: "0.05em",
          }}>
            {article.tag}
          </span>
          <span style={{ color: "var(--text3)", display: "flex", alignItems: "center", gap: "4px" }}>
            {article.source === "devto" ? <IconDevto /> : <IconMedium />}
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "0.95rem",
          fontWeight: 600,
          lineHeight: 1.4,
          color: "var(--text)",
          marginBottom: "8px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {article.title}
        </h3>

        {/* Description */}
        {article.description && (
          <p style={{
            fontSize: "0.78rem",
            color: "var(--text2)",
            lineHeight: 1.5,
            marginBottom: "12px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {article.description}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: "11px",
            fontFamily: "'DM Mono', monospace",
            color: "var(--text3)",
          }}>
            {article.readTime}
          </span>
          <button
            onClick={handleSave}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: saved ? "var(--accent)" : "var(--text3)",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              transition: "color 0.2s",
            }}
          >
            <IconBookmark filled={saved} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKey(getGroqKey());
  }, []);

  function handleSave() {
    setGroqKey(key.trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(10,10,11,0.85)",
      backdropFilter: "blur(12px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border2)",
          borderRadius: "20px 20px 0 0",
          padding: "28px 24px 40px",
          width: "100%", maxWidth: "480px",
          animation: "fadeUp 0.3s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.1rem", fontWeight: 700 }}>Settings</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)" }}>
            <IconX />
          </button>
        </div>

        <label style={{ display: "block", marginBottom: "8px", fontSize: "0.78rem", color: "var(--text2)", fontFamily: "'DM Mono', monospace" }}>
          GROQ API KEY
        </label>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="gsk_..."
          style={{
            width: "100%", padding: "12px 14px",
            background: "var(--surface2)",
            border: "1px solid var(--border2)",
            borderRadius: "10px",
            color: "var(--text)",
            fontFamily: "'DM Mono', monospace",
            fontSize: "0.85rem",
            outline: "none",
            marginBottom: "20px",
          }}
        />
        <p style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: "20px", lineHeight: 1.5 }}>
          Required for Ghostreader AI explanations. Get a free key at console.groq.com — stored locally, never sent to any server.
        </p>
        <button
          onClick={handleSave}
          style={{
            width: "100%", padding: "13px",
            background: saved ? "var(--accent)" : "var(--surface2)",
            border: `1px solid ${saved ? "var(--accent)" : "var(--border2)"}`,
            borderRadius: "10px",
            color: saved ? "#0a0a0b" : "var(--text)",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {saved ? "Saved ✓" : "Save Key"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ALL_TAGS = ["All", "AI", "ML", "Python", "DSA", "System Design", "Web Dev", "Programming", "Trading", "DevOps", "Linux", "Career", "Security"];

export default function HomePage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [showSaved, setShowSaved] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setArticles([]);
    try {
      await fetchFeed((batch) => {
        setArticles(batch);
        setLoading(false); // show cards as soon as first batch arrives
      });
    } catch {
      setError("Failed to load feed. Check your connection.");
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function openArticle(article: Article) {
    sessionStorage.setItem("onyx_article", JSON.stringify(article));
    router.push(`/read?url=${encodeURIComponent(article.url)}`);
  }

  const displayed = showSaved
    ? getSavedArticles()
    : activeTag === "All"
      ? articles
      : articles.filter(a => a.tag === activeTag);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(10,10,11,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        padding: "16px 20px",
      }}>
        <div style={{ maxWidth: "640px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "28px", height: "28px",
              background: "var(--accent)",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "14px", fontWeight: 900, color: "#0a0a0b", fontFamily: "'Syne', sans-serif" }}>O</span>
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
              onyx
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={handleRefresh}
              style={{
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "7px", cursor: "pointer",
                color: "var(--text2)", display: "flex", alignItems: "center",
              }}
              className={refreshing ? "animate-spin" : ""}
            >
              <IconRefresh />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "7px", cursor: "pointer",
                color: "var(--text2)", display: "flex", alignItems: "center",
              }}
            >
              <IconSettings />
            </button>
          </div>
        </div>
      </header>

      {/* Tag filters */}
      <div style={{
        overflowX: "auto",
        padding: "14px 20px 0",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: "640px", margin: "0 auto", display: "flex", gap: "8px", paddingBottom: "14px" }}>
          {/* Saved toggle */}
          <button
            onClick={() => setShowSaved(!showSaved)}
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: "20px",
              border: `1px solid ${showSaved ? "var(--accent)" : "var(--border)"}`,
              background: showSaved ? "var(--accent)" : "transparent",
              color: showSaved ? "#0a0a0b" : "var(--text2)",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
              fontSize: "0.78rem",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: "5px",
            }}
          >
            <IconBookmark filled={showSaved} />
            Saved
          </button>

          {!showSaved && ALL_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: "20px",
                border: `1px solid ${activeTag === tag ? getTagColor(tag) : "var(--border)"}`,
                background: activeTag === tag ? `${getTagColor(tag)}18` : "transparent",
                color: activeTag === tag ? getTagColor(tag) : "var(--text2)",
                fontFamily: "'Syne', sans-serif",
                fontWeight: 600,
                fontSize: "0.78rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <main style={{ padding: "20px", maxWidth: "640px", margin: "0 auto" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                height: "180px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                opacity: 0.5,
                animation: "fadeIn 0.3s ease",
                animationDelay: `${i * 0.05}s`,
              }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text2)" }}>
            <p style={{ marginBottom: "16px" }}>{error}</p>
            <button onClick={load} style={{
              background: "var(--surface2)", border: "1px solid var(--border2)",
              borderRadius: "10px", padding: "10px 20px",
              color: "var(--text)", cursor: "pointer",
              fontFamily: "'Syne', sans-serif", fontWeight: 600,
            }}>
              Try Again
            </button>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text3)" }}>
            <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: "1.1rem", marginBottom: "8px" }}>
              {showSaved ? "No saved articles yet." : "No articles found."}
            </p>
            <p style={{ fontSize: "0.8rem" }}>
              {showSaved ? "Bookmark articles to read them later." : "Try another tag or refresh."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {displayed.map((article, i) => (
              <ArticleCard
                key={article.id + i}
                article={article}
                onClick={() => openArticle(article)}
              />
            ))}
          </div>
        )}
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
