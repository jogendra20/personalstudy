"use client";
import { useState, useEffect, useRef } from "react";
import { getProfile, saveProfile, computeEmotion, buildSystemPrompt, addConversation, getConversations, setLastActive, SageEmotion, updateGoalProgress } from "@/lib/sage";
import { getGroqKey } from "@/lib/api";

export default function SagePanel({ onClose, emotion }: { onClose: () => void; emotion: SageEmotion }) {
  const profile = getProfile();
  const [tab, setTab] = useState<"chat"|"goals"|"feed">("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{role:string;text:string}[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const convs = getConversations();
    if (convs.length === 0 && profile) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      const goal = profile.goals[0];
      const msg = goal
        ? `${greeting}, ${profile.name}. Goal in focus: "${goal.text}" — ${goal.progress}% done. What did you work on today?`
        : `${greeting}, ${profile.name}. I am watching your progress. What are you working on today?`;
      setMessages([{ role: "sage", text: msg }]);
    } else {
      setMessages(convs.map(c => ({ role: c.role, text: c.content })));
    }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMsg() {
    if (!input.trim() || loading || !profile) return;
    const text = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);
    addConversation("user", text);
    setLastActive();

    const key = getGroqKey();
    if (!key) {
      setMessages(prev => [...prev, { role: "sage", text: "Set your Groq API key in the feed reader first." }]);
      setLoading(false); return;
    }

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: buildSystemPrompt(profile) },
            ...getConversations().slice(-8),
            { role: "user", content: text },
          ],
          max_tokens: 200, temperature: 0.7,
        }),
      });
      const data = await res.json();
      const reply = data.choices[0].message.content;
      addConversation("assistant", reply);
      setMessages(prev => [...prev, { role: "sage", text: reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "sage", text: "Error: " + e.message }]);
    } finally { setLoading(false); }
  }

  const tabBtn = (t: string, label: string) => (
    <button onClick={() => setTab(t as any)} style={{ flex: 1, padding: "8px", background: tab === t ? "#6366f1" : "none", color: tab === t ? "#fff" : "#999", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.8rem" }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,10,11,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: "480px", margin: "0 auto", background: "#fff", borderRadius: "20px 20px 0 0", maxHeight: "75vh", display: "flex", flexDirection: "column", animation: "fadeUp 0.3s ease" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f2", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ fontSize: "22px" }}>👀</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "0.95rem" }}>SAGE</div>
              <div style={{ fontSize: "10px", color: "#999", fontFamily: "'DM Mono', monospace" }}>{emotion} · {profile?.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#999" }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", padding: "8px 16px", background: "#f7f7f8", flexShrink: 0 }}>
          {tabBtn("chat", "💬 Chat")}
          {tabBtn("goals", "🎯 Goals")}
          {tabBtn("feed", "📡 My Feed")}
        </div>

        {/* Chat tab */}
        {tab === "chat" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? "#6366f1" : "#f7f7f8", color: m.role === "user" ? "#fff" : "#111", fontSize: "0.85rem", lineHeight: 1.6, fontFamily: m.role === "user" ? "'DM Mono', monospace" : "'Instrument Serif', serif", border: m.role === "sage" ? "1px solid #e5e5ea" : "none", whiteSpace: "pre-wrap" }}>{m.text}</div>
                </div>
              ))}
              {loading && <div style={{ display: "flex", gap: "5px" }}>{[0,1,2].map(i => <div key={i} style={{ width: "7px", height: "7px", background: "#6366f1", borderRadius: "50%", animation: "bounce 0.8s ease " + (i*0.15) + "s infinite alternate" }} />)}</div>}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: "12px 16px 24px", borderTop: "1px solid #f0f0f2", display: "flex", gap: "8px", flexShrink: 0 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder="Talk to SAGE..." style={{ flex: 1, padding: "10px 14px", background: "#f7f7f8", border: "1px solid #e5e5ea", borderRadius: "10px", outline: "none", fontFamily: "'Syne', sans-serif", fontSize: "0.85rem" }} />
              <button onClick={sendMsg} disabled={loading || !input.trim()} style={{ background: "#6366f1", border: "none", borderRadius: "10px", padding: "10px 16px", color: "#fff", cursor: "pointer", opacity: loading || !input.trim() ? 0.4 : 1 }}>→</button>
            </div>
          </>
        )}

        {/* Goals tab */}
        {tab === "goals" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {profile?.goals.map(g => (
              <div key={g.id} style={{ background: "#f7f7f8", border: "1px solid #e5e5ea", borderRadius: "12px", padding: "14px 16px" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.88rem", marginBottom: "8px" }}>{g.text}</div>
                <div style={{ height: "6px", background: "#e5e5ea", borderRadius: "3px", marginBottom: "8px" }}>
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

        {/* Feed tab */}
        {tab === "feed" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            <p style={{ fontSize: "0.82rem", fontFamily: "'DM Mono', monospace", color: "#999", marginBottom: "16px" }}>
              SAGE curates this based on your goals. Topics: {profile?.interests.slice(0,5).join(", ")}
            </p>
            <p style={{ fontSize: "0.85rem", color: "#555", lineHeight: 1.6 }}>
              Personal feed coming in Phase 4. For now, use the main feed filtered to your interest tags.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}