"use client"; // v2
import { useState, useEffect, useRef } from "react";
import { getProfile, saveProfile, computeEmotion, buildSystemPrompt, addConversation, getConversations, setLastActive, SageEmotion, updateGoalProgress, classifyIntent, SageCommand } from "@/lib/sage";
import { getGroqKey } from "@/lib/api";

interface SagePanelProps {
  onClose: () => void;
  emotion: SageEmotion;
  onFeedFilter?: (tag: string) => void;
  onSearch?: (query: string) => void;
  currentArticleText?: string;
}

export default function SagePanel({ onClose, emotion, onFeedFilter, onSearch, currentArticleText }: SagePanelProps) {
  const profile = getProfile();
  const [tab, setTab] = useState<"chat"|"goals">("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{role:string;text:string;isAction?:boolean}[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastCommand, setLastCommand] = useState<SageCommand|null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const convs = getConversations();
    if (convs.length === 0 && profile) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      const goal = profile.goals[0];
      const msg = goal
        ? `${greeting}, ${profile.name}. Focus: "${goal.text}" — ${goal.progress}% done. What do you need?`
        : `${greeting}, ${profile.name}. What do you need?`;
      setMessages([{ role: "sage", text: msg }]);
    } else {
      setMessages(convs.slice(-20).map(c => ({ role: c.role === "assistant" ? "sage" : c.role, text: c.content })));
    }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function executeCommand(cmd: SageCommand, userText: string) {
    setLastCommand(cmd);
    const key = getGroqKey();

    switch (cmd.intent) {
      case "FEED_FILTER": {
        const tag = cmd.params.tag || "AI";
        onFeedFilter?.(tag);
        addMsg("sage", `Filtering feed to ${tag} articles. ✓`, true);
        onClose();
        break;
      }
      case "SEARCH": {
        const q = cmd.params.query || userText;
        onSearch?.(q);
        addMsg("sage", `Searching for "${q}". ✓`, true);
        onClose();
        break;
      }
      case "GOAL_SHOW": {
        setTab("goals");
        addMsg("sage", "Here are your goals →", true);
        break;
      }
      case "GOAL_UPDATE": {
        const p = getProfile();
        if (!p) break;
        const progress = parseInt(cmd.params.progress || "0");
        const goalKeyword = cmd.params.goal?.toLowerCase() || "";
        const matched = p.goals.find(g => g.text.toLowerCase().includes(goalKeyword));
        if (matched) {
          updateGoalProgress(matched.id, progress);
          addMsg("sage", `Updated "${matched.text}" to ${progress}%. Keep going. ✓`, true);
          setTab("goals");
        } else {
          addMsg("sage", `Could not find a goal matching "${cmd.params.goal}". Check your goals tab.`, false);
        }
        break;
      }
      case "GHOSTREADER": {
        const action = cmd.params.action || "explain";
        if (!currentArticleText) {
          addMsg("sage", "Open an article first, then I can explain it.", false);
          break;
        }
        if (!key) { addMsg("sage", "Set your Groq API key first.", false); break; }
        setLoading(true);
        try {
          const systemMap: Record<string, string> = {
            explain: "Explain this article clearly in 3 short paragraphs.",
            summarise: "Summarise this article in 4-5 bullet points (use •).",
            eli5: "Explain this article like I am a complete beginner. Simple language only.",
          };
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: systemMap[action] || systemMap.explain },
                { role: "user", content: "Article:" + currentArticleText.slice(0, 4000) }
              ],
              max_tokens: 600, temperature: 0.5,
            }),
          });
          const data = await res.json();
          addMsg("sage", data.choices[0].message.content, false);
        } catch (e: any) {
          addMsg("sage", "Error: " + e.message, false);
        } finally { setLoading(false); }
        break;
      }
      case "CHAT":
      default: {
        if (!key) { addMsg("sage", "Set your Groq API key first.", false); break; }
        setLoading(true);
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: profile ? buildSystemPrompt(profile) : "You are SAGE, a sharp AI companion. Be direct and concise." },
                ...getConversations().slice(-6),
                { role: "user", content: userText },
              ],
              max_tokens: 200, temperature: 0.7,
            }),
          });
          const data = await res.json();
          const reply = data.choices[0].message.content;
          addConversation("assistant", reply);
          addMsg("sage", reply, false);
        } catch (e: any) {
          addMsg("sage", "Error: " + e.message, false);
        } finally { setLoading(false); }
        break;
      }
    }
  }

  function addMsg(role: string, text: string, isAction: boolean) {
    setMessages(prev => [...prev, { role, text, isAction }]);
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    addMsg("user", text, false);
    addConversation("user", text);
    setLastActive();

    const key = getGroqKey();
    if (!key) { addMsg("sage", "Set your Groq API key first.", false); return; }

    setLoading(true);
    try {
      const cmd = await classifyIntent(text, key);
      await executeCommand(cmd, text);
    } catch (e: any) {
      addMsg("sage", "Error: " + e.message, false);
      setLoading(false);
    }
  }

  const tabBtn = (t: string, label: string) => (
    <button onClick={() => setTab(t as any)} style={{ flex: 1, padding: "8px", background: tab === t ? "#6366f1" : "none", color: tab === t ? "#fff" : "#999", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.8rem" }}>{label}</button>
  );

  // Quick action chips
  const chips = [
    { label: "🎯 My goals", text: "show my goals" },
    { label: "🤖 AI feed", text: "show AI articles" },
    { label: "📚 Summarise", text: "summarise this article" },
    { label: "💡 Motivate me", text: "motivate me" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,10,11,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "#fff", borderRadius: "20px 20px 0 0", maxHeight: "78vh", display: "flex", flexDirection: "column", animation: "fadeUp 0.3s ease" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f2", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ fontSize: "22px" }}>👀</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "0.95rem" }}>SAGE</div>
              <div style={{ fontSize: "10px", color: "#999", fontFamily: "'DM Mono', monospace" }}>{emotion} · {profile?.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#999" }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", padding: "8px 16px", background: "#f7f7f8", flexShrink: 0 }}>
          {tabBtn("chat", "💬 Ask SAGE")}
          {tabBtn("goals", "🎯 Goals")}
        </div>

        {/* Chat */}
        {tab === "chat" && (
          <>
            {/* Quick chips */}
            <div style={{ display: "flex", gap: "8px", padding: "10px 16px", overflowX: "auto", flexShrink: 0, borderBottom: "1px solid #f0f0f2" }}>
              {chips.map(c => (
                <button key={c.label} onClick={() => { setInput(c.text); }} style={{ background: "none", border: "1px solid #e5e5ea", borderRadius: "20px", padding: "5px 12px", fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#555", cursor: "pointer", whiteSpace: "nowrap" }}>{c.label}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "84%", padding: "10px 14px",
                    borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: m.role === "user" ? "#6366f1" : m.isAction ? "rgba(99,102,241,0.08)" : "#f7f7f8",
                    color: m.role === "user" ? "#fff" : "#111",
                    fontSize: "0.85rem", lineHeight: 1.6,
                    fontFamily: m.role === "user" ? "'DM Mono', monospace" : "'Instrument Serif', serif",
                    border: m.role !== "user" ? "1px solid " + (m.isAction ? "rgba(99,102,241,0.2)" : "#e5e5ea") : "none",
                    whiteSpace: "pre-wrap",
                  }}>{m.text}</div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: "5px", padding: "4px 0" }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: "7px", height: "7px", background: "#6366f1", borderRadius: "50%", animation: "bounce 0.8s ease " + (i*0.15) + "s infinite alternate" }} />)}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: "12px 16px 24px", borderTop: "1px solid #f0f0f2", display: "flex", gap: "8px", flexShrink: 0 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Ask anything or give a command..."
                style={{ flex: 1, padding: "10px 14px", background: "#f7f7f8", border: "1px solid #e5e5ea", borderRadius: "10px", outline: "none", fontFamily: "'Syne', sans-serif", fontSize: "0.85rem" }}
              />
              <button onClick={handleSend} disabled={loading || !input.trim()} style={{ background: "#6366f1", border: "none", borderRadius: "10px", padding: "10px 16px", color: "#fff", cursor: "pointer", opacity: loading || !input.trim() ? 0.4 : 1, fontSize: "16px" }}>→</button>
            </div>
          </>
        )}

        {/* Goals */}
        {tab === "goals" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {!profile?.goals.length && <p style={{ color: "#999", fontSize: "0.85rem", fontFamily: "'DM Mono', monospace" }}>No goals set yet.</p>}
            {profile?.goals.map(g => (
              <div key={g.id} style={{ background: "#f7f7f8", border: "1px solid #e5e5ea", borderRadius: "12px", padding: "14px 16px" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.88rem", marginBottom: "8px" }}>{g.text}</div>
                <div style={{ height: "6px", background: "#e5e5ea", borderRadius: "3px", marginBottom: "10px" }}>
                  <div style={{ height: "100%", width: g.progress + "%", background: "#6366f1", borderRadius: "3px", transition: "width 0.3s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontFamily: "'DM Mono', monospace", color: "#999" }}>{g.progress}% complete</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[25,50,75,100].map(p => (
                      <button key={p} onClick={() => { updateGoalProgress(g.id, p); window.location.reload(); }} style={{ background: g.progress >= p ? "#6366f1" : "#e5e5ea", border: "none", borderRadius: "4px", padding: "3px 7px", fontSize: "10px", color: g.progress >= p ? "#fff" : "#999", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>{p}%</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}