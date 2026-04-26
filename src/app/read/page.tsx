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
  isPaywalled?: boolean;
  freediumUrl?: string;
}

interface GhostMessage {
  role: "user" | "ghost";
  text: string;
}

type FontSize = "sm" | "md" | "lg";
type Theme = "light" | "dark";

const FONT_MAP: Record<FontSize, string> = { sm: "0.92rem", md: "1.05rem", lg: "1.22rem" };

const IconBack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
);
const IconBookmark = ({ filled }: { filled?: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
);
const IconGhost = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" /></svg>
);
const IconX = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
);
const IconCopy = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /></svg>
);
const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
);
function GhostreaderPanel({ initialHighlight, articleText, fullText, onClose, dark }: {
  initialHighlight: string; articleText: string; fullText: string;
  onClose: () => void; dark: boolean;
}) {
  const [messages, setMessages] = useState<GhostMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const [inlineKey, setInlineKey] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const convRef = useRef<{ role: string; content: string }[]>([]);

  const bg = dark ? "#18181b" : "var(--surface)";
  const border = dark ? "#2a2a2e" : "var(--border2)";
  const inputBg = dark ? "#111114" : "var(--surface2)";
  const textCol = dark ? "#e8e8f0" : "var(--text)";
  const text2 = dark ? "#999aaa" : "var(--text2)";
  const ghostBg = dark ? "#111114" : "var(--surface2)";
  const ghostBorder = dark ? "#2a2a2e" : "var(--border)";

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!initialHighlight) return;
    const key = getGroqKey();
    if (!key) { setNoKey(true); return; }
    sendMsg(`"${initialHighlight}"`, true);
  }, []);

  async function callGroq(msgs: { role: string; content: string }[], system: string, tokens = 512) {
    const key = getGroqKey();
    if (!key) { setNoKey(true); throw new Error("no key"); }
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: system }, ...msgs], max_tokens: tokens, temperature: 0.6 }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "Groq error"); }
    const data = await res.json();
    return data.choices[0].message.content as string;
  }

  async function sendMsg(text: string, isFirst = false) {
    setMessages(prev => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);
    const system = "You are Ghostreader — sharp, concise reading companion. Explain clearly, define terms, give context. Be direct. Max 3 short paragraphs.";
    const ctx = articleText ? `Article context:\n${articleText.slice(0, 1000)}\n\n` : "";
    if (isFirst) {
      convRef.current = [{ role: "user", content: `${ctx}Highlighted: ${text}\n\nExplain in context of article.` }];
    } else {
      convRef.current.push({ role: "user", content: text });
    }
    try {
      const reply = await callGroq(convRef.current, system);
      convRef.current.push({ role: "assistant", content: reply });
      setMessages(prev => [...prev, { role: "ghost", text: reply }]);
    } catch (e: any) {
      if (e.message !== "no key") setMessages(prev => [...prev, { role: "ghost", text: `Error: ${e.message}` }]);
    } finally { setLoading(false); }
  }

  async function handleSummarise() {
    setMessages(prev => [...prev, { role: "user", text: "Summarise this article" }]);
    setLoading(true);
    convRef.current = [{ role: "user", content: `Article:\n${fullText.slice(0, 4000)}\n\nSummarise in 4-5 bullet points (use •). Cover main argument and key takeaways.` }];
    try {
      const reply = await callGroq(convRef.current, "You are Ghostreader. Summarise articles clearly using bullet points (•). Max 5 bullets.", 600);
      convRef.current.push({ role: "assistant", content: reply });
      setMessages(prev => [...prev, { role: "ghost", text: reply }]);
    } catch (e: any) {
      if (e.message !== "no key") setMessages(prev => [...prev, { role: "ghost", text: `Error: ${e.message}` }]);
    } finally { setLoading(false); }
  }

  function handleCopy(text: string, idx: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  }

  function handleSaveKey() {
    if (!inlineKey.trim()) return;
    setGroqKey(inlineKey.trim());
    setNoKey(false);
    if (initialHighlight) sendMsg(`"${initialHighlight}"`, true);
  }

  const chipStyle = { background: "none", border: `1px solid ${ghostBorder}`, borderRadius: "20px", padding: "5px 12px", fontSize: "11px", fontFamily: "'DM Mono', monospace", color: text2, cursor: "pointer", whiteSpace: "nowrap" as const, opacity: loading ? 0.4 : 1 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(10,10,11,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "640px", margin: "0 auto", background: bg, border: `1px solid ${border}`, borderRadius: "20px 20px 0 0", maxHeight: "72vh", display: "flex", flexDirection: "column", animation: "fadeUp 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${ghostBorder}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", background: "var(--accent3)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><IconGhost /></div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: textCol }}>Ghostreader</div>
              <div style={{ fontSize: "10px", color: text2, fontFamily: "'DM Mono', monospace" }}>llama-3.3-70b</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: text2 }}><IconX /></button>
        </div>
        <div style={{ display: "flex", gap: "8px", padding: "10px 20px", borderBottom: `1px solid ${ghostBorder}`, flexShrink: 0, overflowX: "auto" }}>
          <button disabled={loading} onClick={handleSummarise} style={chipStyle}>✦ Summarise</button>
          <button disabled={loading} onClick={() => sendMsg("Explain this like I am 5")} style={chipStyle}>🎓 ELI5</button>
          <button disabled={loading} onClick={() => sendMsg("What are the key points?")} style={chipStyle}>🔑 Key points</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {noKey && (
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: "0.8rem", color: text2, marginBottom: "10px" }}>Add Groq API key:</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="password" value={inlineKey} onChange={e => setInlineKey(e.target.value)} placeholder="gsk_..." style={{ flex: 1, padding: "9px 12px", background: inputBg, border: `1px solid ${border}`, borderRadius: "8px", color: textCol }} />
                <button onClick={handleSaveKey} style={{ background: "var(--accent3)", border: "none", borderRadius: "8px", padding: "9px 16px", color: "#fff" }}>Save</button>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "86%", padding: "10px 14px", borderRadius: "12px", background: m.role === "user" ? "var(--accent3)" : ghostBg, color: m.role === "user" ? "#fff" : textCol, fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <div style={{ color: text2, fontSize: "12px" }}>Ghost is thinking...</div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "12px 16px 20px", borderTop: `1px solid ${ghostBorder}`, display: "flex", gap: "10px" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg(input)} placeholder="Ask follow-up..." style={{ flex: 1, background: inputBg, border: `1px solid ${border}`, borderRadius: "10px", padding: "10px", color: textCol }} />
          <button onClick={() => sendMsg(input)} style={{ background: "var(--accent3)", border: "none", borderRadius: "10px", padding: "10px", color: "#fff" }}><IconSend /></button>
        </div>
      </div>
    </div>
  );
}
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
  const [progress, setProgress] = useState(0);
  const [fontSize, setFontSize] = useState<FontSize>("md");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const f = localStorage.getItem("onyx_fontsize") as FontSize;
    if (f) setFontSize(f);
    if (localStorage.getItem("onyx_dark") === "1") setDark(true);
    
    function onScroll() {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (el.scrollTop / total) * 100 : 0);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!url) { setError("No URL."); setLoading(false); return; }
    setSaved(isArticleSaved(url));
    fetch(`/api/scrape?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => { setArticle(data); setLoading(false); })
      .catch(() => { setError("Failed to load."); setLoading(false); });
  }, [url]);

  const bg = dark ? "#0d0d0e" : "#ffffff";
  const textCol = dark ? "#e8e8f0" : "#111114";

  return (
    <div style={{ minHeight: "100vh", background: bg, color: textCol }}>
      <div style={{ position: "fixed", top: 0, height: "3px", width: `${progress}%`, background: "var(--accent3)", zIndex: 100 }} />
      <header style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee" }}>
        <button onClick={() => router.back()}>Back</button>
        <button onClick={() => setShowGhost(true)}><IconGhost /> Ghost</button>
      </header>
      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 20px" }}>
        {loading ? <p>Loading...</p> : article && (
          <div onMouseUp={() => {
            const s = window.getSelection()?.toString();
            if (s && s.length > 10) { setHighlight(s); setShowGhost(true); }
          }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "20px" }}>{article.title}</h1>
            <div dangerouslySetInnerHTML={{ __html: article.content }} style={{ fontSize: FONT_MAP[fontSize], lineHeight: 1.6 }} />
          </div>
        )}
      </main>
      {showGhost && <GhostreaderPanel initialHighlight={highlight} articleText={article?.textContent || ""} fullText={article?.textContent || ""} onClose={() => setShowGhost(false)} dark={dark} />}
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReadPageInner />
    </Suspense>
  );
}
