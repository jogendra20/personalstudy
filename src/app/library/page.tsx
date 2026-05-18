"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSavedArticles, toggleSaveArticle, Article } from "@/lib/api";

function timeAgo(dateStr: string) {
  const age = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(age / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function LibraryPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    setArticles(getSavedArticles().reverse());
  }, []);

  function handleRemove(article: Article) {
    toggleSaveArticle(article);
    setArticles(prev => prev.filter(a => a.url !== article.url));
  }

  function handleRead(url: string) {
    window.location.href = `/read?url=${encodeURIComponent(url)}`;
  }

  return (
    <div style={{
      minHeight: "100svh",
      background: "#FAF9F5",
      fontFamily: "'Inter', sans-serif",
      animation: "pageIn 0.35s cubic-bezier(0.4,0,0.2,1) forwards",
    }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(250,249,245,0.95)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        padding: "16px 20px 12px",
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
      }}>
        <button onClick={() => router.back()} style={{
          background: "none", border: "none",
          cursor: "pointer", padding: "4px",
          display: "flex", alignItems: "center", gap: "6px",
          color: "#999", fontSize: "13px",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: "10px", fontWeight: 800,
            letterSpacing: "0.3em", color: "#D4AF37",
            textTransform: "uppercase",
          }}>ONYX</div>
          <div style={{
            fontSize: "13px", fontWeight: 700,
            color: "#111", letterSpacing: "-0.01em",
          }}>Library</div>
        </div>
        <div style={{ width: "28px" }} />
      </div>

      {/* Count */}
      <div style={{ padding: "20px 20px 8px" }}>
        <span style={{
          fontSize: "11px", color: "#bbb",
          fontWeight: 600, letterSpacing: "0.05em",
        }}>
          {articles.length} {articles.length === 1 ? "article" : "articles"} saved
        </span>
      </div>

      {/* Empty state */}
      {articles.length === 0 && (
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          minHeight: "50vh", gap: "12px",
          padding: "40px 20px",
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          <p style={{ color: "#ccc", fontSize: "14px", textAlign: "center", lineHeight: 1.6 }}>
            No saved articles yet.<br/>Tap the bookmark icon on any card.
          </p>
        </div>
      )}

      {/* Article list */}
      <div style={{ padding: "0 20px 120px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {articles.map((article) => (
          <div key={article.url} style={{
            background: "#fff",
            borderRadius: "16px",
            border: "1px solid rgba(0,0,0,0.06)",
            overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            animation: "pageIn 0.3s ease",
          }}>
            {/* Image */}
            {article.cover && (
              <div style={{ height: "140px", overflow: "hidden", position: "relative" }}>
                <img src={article.cover} alt={article.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 100%)",
                }} />
                <span style={{
                  position: "absolute", bottom: "10px", left: "12px",
                  fontSize: "8px", fontWeight: 800,
                  letterSpacing: "0.2em", color: "#D4AF37",
                  textTransform: "uppercase",
                }}>{article.tag}</span>
              </div>
            )}

            {/* Content */}
            <div style={{ padding: "14px 16px 16px" }}>
              {!article.cover && (
                <span style={{
                  fontSize: "8px", fontWeight: 800,
                  letterSpacing: "0.2em", color: "#D4AF37",
                  textTransform: "uppercase", display: "block",
                  marginBottom: "6px",
                }}>{article.tag}</span>
              )}
              <h3
                onClick={() => handleRead(article.url)}
                style={{
                  fontSize: "15px", fontWeight: 700,
                  color: "#111", lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                  fontFamily: "Georgia, serif",
                  cursor: "pointer", margin: "0 0 8px",
                }}
              >{article.title}</h3>
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "10px", color: "#bbb" }}>
                    {timeAgo(article.created_at || article.publishedAt || "")}
                  </span>
                  <span style={{ fontSize: "10px", color: "#ddd" }}>·</span>
                  <span style={{ fontSize: "10px", color: "#bbb" }}>{article.readTime}</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleRead(article.url)}
                    style={{
                      background: "#111", color: "#fff",
                      border: "none", borderRadius: "20px",
                      padding: "6px 14px", fontSize: "10px",
                      fontWeight: 700, letterSpacing: "0.06em",
                      textTransform: "uppercase", cursor: "pointer",
                    }}
                  >Read</button>
                  <button
                    onClick={() => handleRemove(article)}
                    style={{
                      background: "none", border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: "20px", padding: "6px 10px",
                      cursor: "pointer", color: "#ccc",
                      fontSize: "12px",
                    }}
                  >✕</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pageIn {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
