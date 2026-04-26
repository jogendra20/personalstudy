"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getGroqKey, setGroqKey, toggleSaveArticle, isArticleSaved, Article } from "@/lib/api";
import { Suspense } from "react";

interface ScrapedArticle {
  title: string;
  content: string;
  textContent: string;
  byline?: string;
  siteName?: string;
}

interface GhostMessage {
  role: "user" | "ghost";
  text: string;
}

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

// ─── Ghostreader ──────────────────────────────────────────────────────────────
function GhostreaderPanel({
  initialHighlight,
  articleText,
  onClose,
}: {
  initialHighlight: string;
  articleText: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<GhostMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const [inlineKey, setInlineKey] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  // Keep full conversation for follow-up context
  const conversationRef = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!initialHighlight) return;
    const key = getGroqKey();
    if (!key) { setNoKey(true); return; }
    sendMessage(`"${initialHighlight}"`, true);
  }, []);

  async function sendMessage(text: string, isFirst = false) {
    const key = getGroqKey();
    if (!key) { setNoKey(true); return; }

    const userMsg: GhostMessage = { role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const systemPrompt = `You are Ghostreader — a sharp, concise reading companion. When given highlighted text or a question, explain clearly: define terms, give context, connect concepts. Be direct, no fluff. Max 3 short paragraphs.`;

    // Build context: article excerpt + full conversation so far
    const articleContext = articleText
      ? `Article context:\n${articleText.slice(0, 1000)}\n\n`
      : "";

    // Add user turn to conversation history
    if (isFirst) {
      conversationRef.current = [
        { role: "user", content: `${articleContext}Highlighted text: ${text}\n\nExplain this in the context of the article.` }
      ];
    } else {
      conversationRef.current.push({ role: "user", content: text });
    }

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationRef.current,
          ],
          max_tokens: 512,
          temperature: 0.6,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Groq API error");
      }

      const data = await res.json();
      const reply = data.choices[0].message.content;
      // Add assistant turn to history
      conversationRef.current.push({ role: "assistant", content: reply });
      setMessages(prev => [...prev, { role: "ghost", text: reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "ghost", text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
  }

  function handleSaveInlineKey() {
    if (!inlineKey.trim()) return;
    setGroqKey(inlineKey.trim());
    setNoKey(false);
    if (initialHighlight) sendMessage(`"${initialHighlight}"`, true);
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

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {noKey && (
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text2)", marginBottom: "10px", lineHeight: 1.5 }}>
                Add your free Groq API key to enable Ghostreader.{" "}
                <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent3)" }}>
                  Get one at console.groq.com
                </a>
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="password"
                  value={inlineKey}
                  onChange={e => setInlineKey(e.target.value)}
                  placeholder="gsk_..."
                  style={{
                    flex: 1, padding: "9px 12px",
                    background: "var(--surface2)", border: "1px solid var(--border2)",
                    borderRadius: "8px", fontSize: "0.82rem",
                    fontFamily: "monospace", outline: "none", color: "var(--text)",
                  }}
                />
                <button
                  onClick={handleSaveInlineKey}
                  style={{
                    background: "var(--accent3)", border: "none",
                    borderRadius: "8px", padding: "9px 16px",
                    color: "#fff", cursor: "pointer",
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.82rem",
                  }}
                >Save</button>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
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
                whiteSpace: "pre-wrap",
              }}>
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: "5px", padding: "4px 0" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: "7px", height: "7px",
                  background: "var(--accent3)",
                  borderRadius: "50%",
                  animation: `bounce 0.8s ease ${i * 0.15}s infinite alternate`,
                }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

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
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              opacity: loading || !input.trim() ? 0.4 : 1,
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
    try {
      const stored = sessionStorage.getItem("onyx_article");
      if (stored) setMeta(JSON.parse(stored));
    } catch {}

    if (!url) { setError("No URL provided."); setLoading(false); return; }
    setSaved(isArticleSaved(url));

    // Check device cache first
    const cacheKey = "onyx_article_" + btoa(url).slice(0, 40);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setArticle(JSON.parse(cached));
        setLoading(false);
        return; // skip fetch
      }
    } catch {}

    fetch(`/api/scrape?url=${encodeURIComponent(url)}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        if (data.error) throw new Error(data.error);
        setArticle(data);
        setLoading(false);
        // Save to device cache for offline
        try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
      })
      .catch(err => {
        setError(err.message || "Failed to load article.");
        setLoading(false);
      });
  }, [url]);

  function handleSave() {
    if (!meta) return;
    setSaved(toggleSaveArticle(meta));
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
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.95)",
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
            <button
              onClick={() => { setHighlight(""); setShowGhost(true); }}
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

      {!loading && !error && article && (
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "10px 20px 0" }}>
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

      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 20px 80px" }}>
        {loading ? (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {[75, 100, 90, 100, 85, 60].map((w, i) => (
              <div key={i} className="shimmer" style={{ height: i === 0 ? "36px" : "18px", width: `${w}%`, borderRadius: "6px", marginBottom: i === 0 ? "20px" : "10px" }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: "var(--text2)", marginBottom: "16px", fontSize: "0.9rem" }}>{error}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent3)", fontFamily: "'DM Mono', monospace", fontSize: "0.82rem" }}
            >
              Open original article ↗
            </a>
          </div>
        ) : article ? (
          <div className="animate-fade-up">
            {/* Site + tag badges */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              {article.siteName && (
                <span style={{
                  fontSize: "11px", fontFamily: "'DM Mono', monospace",
                  color: "var(--text3)", background: "var(--surface2)",
                  border: "1px solid var(--border)", padding: "3px 10px", borderRadius: "20px",
                }}>
                  {article.siteName}
                </span>
              )}
              {meta?.tag && (
                <span style={{
                  fontSize: "11px", fontFamily: "'DM Mono', monospace",
                  color: "#1a8917", background: "rgba(26,137,23,0.08)",
                  border: "1px solid rgba(26,137,23,0.2)", padding: "3px 10px", borderRadius: "20px",
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

            {/* Title */}
            <h1 style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(1.6rem, 4vw, 2rem)",
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: "12px",
              letterSpacing: "-0.01em",
              color: "#111",
            }}>
              {article.title}
            </h1>

            {/* Byline */}
            {article.byline && (
              <p style={{ fontSize: "0.85rem", color: "var(--text3)", fontFamily: "'DM Mono', monospace", marginBottom: "8px" }}>
                {article.byline}
              </p>
            )}

            <div style={{ height: "1px", background: "var(--border)", margin: "24px 0" }} />

            {/* Body */}
            <div
              className="article-content"
              onMouseUp={handleTextSelect}
              onTouchEnd={handleTextSelect}
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.82rem", fontFamily: "'DM Mono', monospace", color: "var(--text3)" }}
              >
                View original article ↗
              </a>
            </div>
          </div>
        ) : null}
      </main>

      {showGhost && (
        <GhostreaderPanel
          initialHighlight={highlight}
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
