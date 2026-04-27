"use client";
import { getForgeKeys, saveForgeTask, getForgeTasks } from "@/lib/forge";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getGroqKey, setGroqKey, toggleSaveArticle, isArticleSaved, Article } from "@/lib/api";
import { Suspense } from "react";

interface ScrapedArticle {
  title: string; content: string; textContent: string;
  byline?: string; siteName?: string; isPaywalled?: boolean; freediumUrl?: string;
}
interface GhostMessage { role: "user" | "ghost"; text: string; }
type FontSize = "sm" | "md" | "lg";
const FONT_MAP: Record<FontSize, string> = { sm: "0.92rem", md: "1.05rem", lg: "1.22rem" };

const IconBack = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const IconBookmark = ({ filled }: { filled?: boolean }) => <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const IconGhost = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>;
const IconX = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconSend = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const IconCopy = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IconSun = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>;
const IconMoon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

function GhostreaderPanel({ initialHighlight, articleText, fullText, onClose, dark }: {
  initialHighlight: string; articleText: string; fullText: string; onClose: () => void; dark: boolean;
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
  const ghostBorder = dark ? "#2a2a2e" : "var(--border)";
  const ghostBg = dark ? "#111114" : "var(--surface2)";

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!initialHighlight) return;
    const key = getGroqKey();
    if (!key) { setNoKey(true); return; }
    sendMsg(initialHighlight, true);
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
    setInput(""); setLoading(true);
    const system = "You are Ghostreader — sharp concise reading companion. Explain clearly, define terms, give context. Be direct. Max 3 short paragraphs.";
    const ctx = articleText ? "Article context:\n" + articleText.slice(0, 1000) + "\n\n" : "";
    if (isFirst) convRef.current = [{ role: "user", content: ctx + "Highlighted: " + text + "\n\nExplain in context." }];
    else convRef.current.push({ role: "user", content: text });
    try {
      const reply = await callGroq(convRef.current, system);
      convRef.current.push({ role: "assistant", content: reply });
      setMessages(prev => [...prev, { role: "ghost", text: reply }]);
    } catch (e: any) {
      if (e.message !== "no key") setMessages(prev => [...prev, { role: "ghost", text: "Error: " + e.message }]);
    } finally { setLoading(false); }
  }

  async function handleSummarise() {
    setMessages(prev => [...prev, { role: "user", text: "Summarise this article" }]);
    setLoading(true);
    convRef.current = [{ role: "user", content: "Article:\n" + fullText.slice(0, 4000) + "\n\nSummarise in 4-5 bullet points (use \u2022)." }];
    try {
      const reply = await callGroq(convRef.current, "You are Ghostreader. Summarise using bullet points. Max 5 bullets.", 600);
      convRef.current.push({ role: "assistant", content: reply });
      setMessages(prev => [...prev, { role: "ghost", text: reply }]);
    } catch (e: any) {
      if (e.message !== "no key") setMessages(prev => [...prev, { role: "ghost", text: "Error: " + e.message }]);
    } finally { setLoading(false); }
  }

  function handleCopy(text: string, idx: number) {
    navigator.clipboard.writeText(text).then(() => { setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1500); });
  }

  function handleSaveKey() {
    if (!inlineKey.trim()) return;
    setGroqKey(inlineKey.trim()); setNoKey(false);
    if (initialHighlight) sendMsg(initialHighlight, true);
  }

  const chip: React.CSSProperties = { background: "none", border: "1px solid " + ghostBorder, borderRadius: "20px", padding: "5px 12px", fontSize: "11px", fontFamily: "'DM Mono', monospace", color: text2, cursor: "pointer", whiteSpace: "nowrap", opacity: loading ? 0.4 : 1 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(10,10,11,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "640px", margin: "0 auto", background: bg, border: "1px solid " + border, borderRadius: "20px 20px 0 0", maxHeight: "72vh", display: "flex", flexDirection: "column", animation: "fadeUp 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid " + ghostBorder, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", background: "var(--accent3)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><IconGhost /></div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: textCol }}>Ghostreader</div>
              <div style={{ fontSize: "10px", color: text2, fontFamily: "'DM Mono', monospace" }}>llama-3.3-70b</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: text2 }}><IconX /></button>
        </div>
        <div style={{ display: "flex", gap: "8px", padding: "10px 20px", borderBottom: "1px solid " + ghostBorder, flexShrink: 0, overflowX: "auto" }}>
          <button disabled={loading} onClick={handleSummarise} style={chip}>✦ Summarise</button>
          <button disabled={loading} onClick={() => sendMsg("Explain this article like I am a complete beginner.")} style={chip}>🎓 ELI5</button>
          <button disabled={loading} onClick={() => sendMsg("What are the 3 most important takeaways?")} style={chip}>🔑 Key points</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {noKey && (
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: "0.8rem", color: text2, marginBottom: "10px", lineHeight: 1.5 }}>Add your Groq API key. <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent3)" }}>console.groq.com</a></p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="password" value={inlineKey} onChange={e => setInlineKey(e.target.value)} placeholder="gsk_..." style={{ flex: 1, padding: "9px 12px", background: inputBg, border: "1px solid " + border, borderRadius: "8px", fontSize: "0.82rem", fontFamily: "monospace", outline: "none", color: textCol }} />
                <button onClick={handleSaveKey} style={{ background: "var(--accent3)", border: "none", borderRadius: "8px", padding: "9px 16px", color: "#fff", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.82rem" }}>Save</button>
              </div>
            </div>
          )}
          {messages.length === 0 && !noKey && <div style={{ textAlign: "center", padding: "24px 0", color: text2, fontSize: "0.82rem", fontFamily: "'DM Mono', monospace" }}>Highlight text or tap a quick action</div>}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "86%", padding: "10px 14px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? "var(--accent3)" : ghostBg, color: m.role === "user" ? "#fff" : textCol, fontSize: "0.85rem", lineHeight: 1.65, fontFamily: m.role === "user" ? "'DM Mono', monospace" : "'Instrument Serif', serif", border: m.role === "ghost" ? "1px solid " + ghostBorder : "none", whiteSpace: "pre-wrap" }}>{m.text}</div>
              {m.role === "ghost" && <button onClick={() => handleCopy(m.text, i)} style={{ marginTop: "4px", background: "none", border: "none", cursor: "pointer", color: text2, fontSize: "10px", fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: "4px", padding: "2px 4px" }}><IconCopy />{copiedIdx === i ? "copied!" : "copy"}</button>}
            </div>
          ))}
          {loading && <div style={{ display: "flex", gap: "5px", padding: "4px 0" }}>{[0,1,2].map(i => <div key={i} style={{ width: "7px", height: "7px", background: "var(--accent3)", borderRadius: "50%", animation: "bounce 0.8s ease " + (i*0.15) + "s infinite alternate" }} />)}</div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "12px 16px 20px", borderTop: "1px solid " + ghostBorder, flexShrink: 0, display: "flex", gap: "10px", alignItems: "center" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !loading && input.trim() && sendMsg(input.trim())} placeholder="Ask a follow-up..." style={{ flex: 1, background: inputBg, border: "1px solid " + border, borderRadius: "10px", padding: "10px 14px", color: textCol, fontFamily: "'Syne', sans-serif", fontSize: "0.85rem", outline: "none" }} />
          <button onClick={() => input.trim() && !loading && sendMsg(input.trim())} disabled={loading || !input.trim()} style={{ background: "var(--accent3)", border: "none", borderRadius: "10px", padding: "10px 14px", cursor: loading || !input.trim() ? "not-allowed" : "pointer", color: "#fff", display: "flex", alignItems: "center", opacity: loading || !input.trim() ? 0.4 : 1, transition: "opacity 0.2s" }}><IconSend /></button>
        </div>
      </div>
    </div>
  );
}

function ReadPageInner() {
  const router = useRouter();
  const [forgeTriggered, setForgeTriggered] = useState(false);
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
    try {
      const f = localStorage.getItem("onyx_fontsize") as FontSize;
      if (f) setFontSize(f);
      if (localStorage.getItem("onyx_dark") === "1") setDark(true);
    } catch {}
  }, []);

  useEffect(() => {
    function onScroll() {
      const el = document.documentElement;
      setProgress(el.scrollHeight > el.clientHeight ? Math.min(100, (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100) : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    try { const s = sessionStorage.getItem("onyx_article"); if (s) setMeta(JSON.parse(s)); } catch {}
    if (!url) { setError("No URL provided."); setLoading(false); return; }
    setSaved(isArticleSaved(url));
    try {
      const ck = "onyx_article_" + btoa(url).slice(0, 40);
      const cached = localStorage.getItem(ck);
      if (cached) { setArticle(JSON.parse(cached)); setLoading(false); return; }
    } catch {}
    fetch("/api/scrape?url=" + encodeURIComponent(url))
      .then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
      .then(data => {
        if (data.error) throw new Error(data.error);
        setArticle(data); setLoading(false); triggerForgeTask(meta, data.textContent || "");
        try { localStorage.setItem("onyx_article_" + btoa(url).slice(0, 40), JSON.stringify(data)); } catch {}
      })
      .catch(err => { setError(err.message || "Failed to load article."); setLoading(false); });
  }, [url]);

  function toggleDark() {
    const next = !dark; setDark(next);
    try { localStorage.setItem("onyx_dark", next ? "1" : "0"); } catch {}
  }

  function cycleFontSize() {
    const order: FontSize[] = ["sm", "md", "lg"];
    const next = order[(order.indexOf(fontSize) + 1) % 3];
    setFontSize(next);
    try { localStorage.setItem("onyx_fontsize", next); } catch {}
  }

  function handleSave() { if (!meta) return; setSaved(toggleSaveArticle(meta)); }

  function handleTextSelect() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (text.length < 10) return;
    setHighlight(text); setShowGhost(true);
  }

  const bg = dark ? "#0d0d0e" : "var(--bg)";
  const headerBg = dark ? "rgba(13,13,14,0.95)" : "rgba(255,255,255,0.95)";
  const borderCol = dark ? "#2a2a2e" : "var(--border)";
  const surface2 = dark ? "#18181b" : "var(--surface2)";
  const textCol = dark ? "#e8e8f0" : "var(--text)";
  const text2 = dark ? "#999aaa" : "var(--text2)";
  const text3 = dark ? "#666680" : "var(--text3)";
  const fSize = fontSize === "sm" ? "11px" : fontSize === "lg" ? "16px" : "13px";

  return (
    <div data-dark={dark ? "true" : "false"} style={{ minHeight: "100vh", background: bg, transition: "background 0.3s" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: "3px" }}>
        <div style={{ height: "100%", width: progress + "%", background: "var(--accent3)", transition: "width 0.1s linear" }} />
      </div>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: headerBg, backdropFilter: "blur(20px)", borderBottom: "1px solid " + borderCol, padding: "14px 20px" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => router.back()} style={{ background: surface2, border: "1px solid " + borderCol, borderRadius: "10px", padding: "8px 14px", cursor: "pointer", color: text2, fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}><IconBack /> Back</button>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={cycleFontSize} style={{ background: surface2, border: "1px solid " + borderCol, borderRadius: "10px", padding: "8px 12px", cursor: "pointer", color: text2, fontWeight: 700, fontSize: fSize, minWidth: "36px", textAlign: "center" as const }}>A</button>
            <button onClick={toggleDark} style={{ background: surface2, border: "1px solid " + borderCol, borderRadius: "10px", padding: "8px 12px", cursor: "pointer", color: text2, display: "flex", alignItems: "center" }}>{dark ? <IconSun /> : <IconMoon />}</button>
            <button onClick={() => { setHighlight(""); setShowGhost(true); }} style={{ background: surface2, border: "1px solid " + borderCol, borderRadius: "10px", padding: "8px 14px", cursor: "pointer", color: "var(--accent3)", fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}><IconGhost /> Ghost</button>
            {meta && <button onClick={handleSave} style={{ background: surface2, border: "1px solid " + (saved ? "var(--accent)" : borderCol), borderRadius: "10px", padding: "8px 12px", cursor: "pointer", color: saved ? "var(--accent)" : text2, display: "flex", alignItems: "center", transition: "all 0.2s" }}><IconBookmark filled={saved} /></button>}
          </div>
        </div>
      </header>

      {!loading && !error && article && (
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "10px 20px 0" }}>
          <p style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: text3, background: dark ? "#18181b" : "var(--surface)", border: "1px solid " + borderCol, borderRadius: "8px", padding: "6px 12px", display: "inline-block" }}>✦ Select any text → Ghostreader explains it</p>
        </div>
      )}

      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 20px 80px" }}>
        {loading ? (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {[75,100,90,100,85,60].map((w,i) => <div key={i} className="shimmer" style={{ height: i===0?"36px":"18px", width: w+"%", borderRadius:"6px", marginBottom:i===0?"20px":"10px" }} />)}
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: text2, marginBottom: "16px", fontSize: "0.9rem" }}>{error}</p>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent3)", fontFamily: "'DM Mono', monospace", fontSize: "0.82rem" }}>Open original article ↗</a>
          </div>
        ) : article ? (
          <div className="animate-fade-up">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", flexWrap: "wrap" as const }}>
              {article.siteName && <span style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: text3, background: dark?"#18181b":"var(--surface2)", border: "1px solid " + borderCol, padding: "3px 10px", borderRadius: "20px" }}>{article.siteName}</span>}
              {meta?.tag && <span style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#1a8917", background: "rgba(26,137,23,0.08)", border: "1px solid rgba(26,137,23,0.2)", padding: "3px 10px", borderRadius: "20px" }}>{meta.tag}</span>}
              {meta?.readTime && <span style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: text3 }}>{meta.readTime}</span>}
            </div>
            {article.isPaywalled && article.freediumUrl && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(107,70,193,0.08)", border: "1px solid rgba(107,70,193,0.25)", borderRadius: "10px", padding: "10px 14px", marginBottom: "20px" }}>
                <span style={{ fontSize: "0.82rem", color: text2, fontFamily: "'DM Mono', monospace" }}>⚠ Partial — paywalled</span>
                <a href={article.freediumUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", fontSize: "0.82rem", fontFamily: "'DM Mono', monospace", color: "var(--accent3)", fontWeight: 600, textDecoration: "none" }}>Read on Freedium ↗</a>
              </div>
            )}
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.6rem, 4vw, 2rem)", fontWeight: 700, lineHeight: 1.2, marginBottom: "12px", letterSpacing: "-0.01em", color: textCol }}>{article.title}</h1>
            {article.byline && <p style={{ fontSize: "0.85rem", color: text3, fontFamily: "'DM Mono', monospace", marginBottom: "8px" }}>{article.byline}</p>}
            <div style={{ height: "1px", background: borderCol, margin: "24px 0" }} />
            <div className="article-content" onMouseUp={handleTextSelect} onTouchEnd={handleTextSelect} style={{ fontSize: FONT_MAP[fontSize] }} dangerouslySetInnerHTML={{ __html: article.content }} />
            <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid " + borderCol }}>
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.82rem", fontFamily: "'DM Mono', monospace", color: text3 }}>View original article ↗</a>
            </div>
          </div>
        ) : null}
      </main>
      {showGhost && <GhostreaderPanel initialHighlight={highlight} articleText={article?.textContent || ""} fullText={article?.textContent || ""} onClose={() => { setShowGhost(false); setHighlight(""); }} dark={dark} />}
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "var(--text3)", fontFamily: "'DM Mono', monospace", fontSize: "0.85rem" }}>Loading...</div></div>}>
      <ReadPageInner />
    </Suspense>
  );
}

// Forge auto-task — injected
function triggerForgeTask(article: any, text: string) {
  try {
    const k = getForgeKeys();
    if (!k.groq) return;
    const existing = getForgeTasks().find((t: any) => t.articleUrl === article.url && t.status === "pending");
    if (existing) return;
    fetch("/api/forge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_task",
        groqKey: k.groq,
        articleTitle: article.title,
        articleTag: article.tag,
        articleText: text.slice(0, 2000),
        weakArea: "",
      }),
    }).then(r => r.json()).then(data => {
      if (data.task) {
        saveForgeTask({
          id: "task_" + Date.now(),
          articleUrl: article.url,
          articleTitle: article.title,
          articleTag: article.tag || "General",
          status: "pending",
          createdAt: Date.now(),
          ...data.task,
        });
      }
    }).catch(() => {});
  } catch {}
}
