"use client";
import { useState, useEffect } from "react";

const HASH = "d89b5b705b378e75697425824164cc29a7194ebdb58b4f739a5d5a296c1a1c23";
const KEY = "onyx_auth";

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored === HASH) setUnlocked(true);
    setChecking(false);
  }, []);

  async function handleSubmit() {
    const h = await sha256(input.trim());
    if (h === HASH) {
      localStorage.setItem(KEY, HASH);
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
      setTimeout(() => setError(false), 2000);
    }
  }

  if (checking) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0e", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
        <div style={{ width: "52px", height: "52px", background: "#6366f1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>O</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "#fff", marginBottom: "6px" }}>onyx</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", color: "#555" }}>private</div>
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Password"
            autoFocus
            style={{ width: "100%", padding: "14px 16px", background: "#18181b", border: "1px solid " + (error ? "#ef4444" : "#2a2a2e"), borderRadius: "12px", color: "#fff", fontFamily: "'Syne', sans-serif", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
          />
          {error && <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", color: "#ef4444", textAlign: "center" }}>Wrong password</p>}
          <button
            onClick={handleSubmit}
            style={{ width: "100%", padding: "14px", background: "#6366f1", border: "none", borderRadius: "12px", color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}