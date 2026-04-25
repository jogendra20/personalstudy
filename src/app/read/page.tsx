"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  scrapeArticle,
  ScrapedArticle,
  askGhostreader,
  getGroqKey,
  toggleSaveArticle,
  isArticleSaved,
  Article,
} from "@/lib/api";
import { Suspense } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconBookmark = ({ filled }: { filled?: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
const IconGhost = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
  </svg>
);
const IconX = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ─── Ghostreader Panel ────────────────────────────────────────────────────────
interface GhostMessage {
  role: "user" | "ghost";
  text: string;
}

function GhostreaderPanel({
  highlight,
  articleText,
  onClose,
}: {
  highlight: string;
  articleText: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<GhostMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!highlight) return;
    const key = getGroqKey();
    if (!key) { setNoKey(true); return; }
    setNoKey(false);
    handleAsk(highlight, true);
  }, [highlight]);

  async function handleAsk(text: string, isHighlight = false) {
    const key = getGroqKey();
    if (!key) { setNoKey(true); return; }

    const userMsg: GhostMessage = { role: "user", text: isHighlight ? `"${text}"` : text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const context = isHighlight ? articleText : `${articleText}\n\nPrevious Q: ${highlight}`;
      const res = await askGhostreader(text, context, key);
      setMessages(prev => [...prev, { role: "ghost", text: res.explanation }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "ghost", text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (!input.trim() || loading) return;
    handleAsk(input.trim());
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(10,10,11,0.7)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "640px", margin: "0 auto",
          background: "var(--surface)",
          border: "1px solid var(--border2)",
          borderRadius: "20px 20px 0 0",
          maxHeight: "70vh",
          display: "flex", flexDirection: "column",
          animation: "fadeUp 0.3s ease",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px", height: "28px",
              background: "var(--accent3)",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff",
            }}>
              <IconGhost />
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>Ghostreader</div>
              <div style={{ fontSize: "10px", color: "var(--text3)", fontFamily: "'DM Mono', monospace" }}>llama-3.3-70b</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text2)" }}>
            <IconX />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {noKey && (
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "10px" }}>
                Add your free Groq API key to enable Ghostreader.
                Get one at <a href="https://console.groq.com" target="_blank" style={{ color: "var(--accent3)" }}>console.groq.com</a>
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="password"
                  placeholder="gsk_..."
                  id="inline-groq-key"
                  style={{
                    flex: 1, padding: "9px 12px",
                    background: "#f5f5f7", border: "1px solid #ddd",
                    borderRadius: "8px", fontSize: "0.82rem",
                    fontFamily: "monospace", outline: "none",
                  }}
                />
                <button
                  onClick={() => {
                    const el = document.getElementById("inline-groq-key") as HTMLInputElement;
                    if (el && el.value.trim()) {
                      localStorage.setItem("onyx_groq_key", el.value.trim());
                      setNoKey(false);
                    }
                  }}
                  style={{
                    background: "var(--accent3)", border: "none",
                    borderRadius: "8px", padding: "9px 16px",
                    color: "#fff", cursor: "pointer",
                    fontFamily: "Syne", fontWeight: 700, fontSize: "0.82rem",
                  }}
                >Save</button>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: m.role === "user" ? "var(--accent3)" : "var(--surface2)",
                color: m.role === "user" ? "#fff" : "var(--text)",
                fontSize: "0.85rem",
                lineHeight: 1.6,
                fontFamily: m.role === "user" ? "'DM Mono', monospace" : "'Instrument Serif', serif",
                border: m.role === "ghost" ? "1px solid var(--border)" : "none",
              }}>
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: "5px", padding: "4px 0" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: "6px", height: "6px",
                  background: "var(--accent3)",
                  borderRadius: "50%",
                  animation: `fadeIn 0.6s ease ${i * 0.2}s infinite alternate`,
                }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 16px 20px",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Ask a follow-up..."
            style={{
              flex: 1,
              background: "var(--surface2)",
              border: "1px solid var(--border2)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "var(--text)",
              fontFamily: "'Syne', sans-serif",
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            style={{
              background: "var(--accent3)",
              border: "none",
              borderRadius: "10px",
              padding: "10px 14px",
              cursor: "pointer",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              opacity: loading || !input.trim() ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <IconSend />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Read Page ────────────────────────────────────────────────────────────────
function ReadPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";

  const [article, setArticle] = useState<ScrapedArticle | null>(null);
  const [meta, setMeta] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [highlight, setHighlight] = useState("");
  const [showGhost, setShowGhost] = useState(false);

  useEffect(() => {
    // Restore meta from session
    try {
      const stored = sessionStorage.getItem("onyx_article");
      if (stored) setMeta(JSON.parse(stored));
    } catch { /* ignore */ }

    if (!url) { setError("No URL provided."); setLoading(false); return; }
    setSaved(isArticleSaved(url));

    fetch(`/api/scrape?url=${encodeURIComponent(url)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setArticle(data); setLoading(false); })
      .catch(() => {
        setArticle({
          title: meta?.title || "Article",
          content: `<iframe src="${url}" style="width:100%;height:80vh;border:none;border-radius:12px;" />`,
          textContent: "",
          siteName: url.includes("medium.com") ? "Medium" : "Dev.to",
        });
        setLoading(false);
      });
  }, [url]);

  function handleSave() {
    if (!meta) return;
    const result = toggleSaveArticle(meta);
    setSaved(result);
  }

  function handleTextSelect() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (text.length < 10) return;
    setHighlight(text);
    setShowGhost(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Top bar */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(10,10,11,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        padding: "14px 20px",
      }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: "10px", padding: "8px 14px",
              cursor: "pointer", color: "var(--text2)",
              fontFamily: "'Syne', sans-serif", fontWeight: 600,
              fontSize: "0.82rem",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <IconBack /> Back
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            {/* Ghost trigger */}
            <button
              onClick={() => setShowGhost(true)}
              title="Ask Ghostreader"
              style={{
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: "10px", padding: "8px 14px",
                cursor: "pointer", color: "var(--accent3)",
                fontFamily: "'Syne', sans-serif", fontWeight: 600,
                fontSize: "0.82rem",
                display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              <IconGhost /> Ghost
            </button>

            {/* Bookmark */}
            {meta && (
              <button
                onClick={handleSave}
                style={{
                  background: "var(--surface2)", border: `1px solid ${saved ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "10px", padding: "8px 12px",
                  cursor: "pointer", color: saved ? "var(--accent)" : "var(--text2)",
                  display: "flex", alignItems: "center",
                  transition: "all 0.2s",
                }}
              >
                <IconBookmark filled={saved} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Highlight hint */}
      {!loading && !error && article && (
        <div style={{
          maxWidth: "680px", margin: "0 auto",
          padding: "10px 20px 0",
        }}>
          <p style={{
            fontSize: "11px",
            fontFamily: "'DM Mono', monospace",
            color: "var(--text3)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "6px 12px",
            display: "inline-block",
          }}>
            ✦ Select any text → Ghostreader explains it
          </p>
        </div>
      )}

      {/* Article content */}
      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 20px 80px" }}>
        {loading ? (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ height: "36px", background: "var(--surface)", borderRadius: "8px", marginBottom: "16px", width: "75%" }} />
            <div style={{ height: "20px", background: "var(--surface)", borderRadius: "6px", marginBottom: "10px" }} />
            <div style={{ height: "20px", background: "var(--surface)", borderRadius: "6px", marginBottom: "10px", width: "90%" }} />
            <div style={{ height: "20px", background: "var(--surface)", borderRadius: "6px", marginBottom: "10px", width: "80%" }} />
            <div style={{ height: "20px", background: "var(--surface)", borderRadius: "6px", marginBottom: "10px" }} />
            <div style={{ height: "20px", background: "var(--surface)", borderRadius: "6px", width: "60%" }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text2)" }}>
            <p style={{ marginBottom: "16px" }}>{error}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--accent3)",
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.82rem",
              }}
            >
              Open original article ↗
            </a>
          </div>
        ) : article ? (
          <div className="animate-fade-up">
            {/* Article title */}
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(1.4rem, 4vw, 2rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: "16px",
              letterSpacing: "-0.02em",
            }}>
              {article.title}
            </h1>

            {/* Meta */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
              {article.siteName && (
                <span style={{
                  fontSize: "11px",
                  fontFamily: "'DM Mono', monospace",
                  color: "var(--text3)",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  padding: "3px 10px",
                  borderRadius: "20px",
                }}>
                  {article.siteName}
                </span>
              )}
              {meta?.tag && (
                <span style={{
                  fontSize: "11px",
                  fontFamily: "'DM Mono', monospace",
                  color: "#c8ff40",
                  background: "rgba(200,255,64,0.08)",
                  border: "1px solid rgba(200,255,64,0.2)",
                  padding: "3px 10px",
                  borderRadius: "20px",
                }}>
                  {meta.tag}
                </span>
              )}
              {meta?.readTime && (
                <span style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "var(--text3)" }}>
                  {meta.readTime}
                </span>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "var(--border)", marginBottom: "32px" }} />

            {/* Body */}
            <div
              className="article-content"
              onMouseUp={handleTextSelect}
              onTouchEnd={handleTextSelect}
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* Footer link */}
            <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.82rem",
                  fontFamily: "'DM Mono', monospace",
                  color: "var(--text3)",
                }}
              >
                View original article ↗
              </a>
            </div>
          </div>
        ) : null}
      </main>

      {showGhost && (
        <GhostreaderPanel
          highlight={highlight}
          articleText={article?.textContent || ""}
          onClose={() => { setShowGhost(false); setHighlight(""); }}
        />
      )}
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text3)", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem" }}>Loading...</div>
      </div>
    }>
      <ReadPageInner />
    </Suspense>
  );
}
