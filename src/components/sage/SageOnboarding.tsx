"use client";
import { useState } from "react";
import { saveProfile, SageGoal, SageProfile } from "@/lib/sage";

const TOPIC_MAP: Record<string, string[]> = {
  "AI Engineer":    ["AI","ML","Python","System Design"],
  "Web Developer":  ["Web Dev","JavaScript","React","Programming"],
  "Data Scientist": ["ML","Python","Data Science","AI"],
  "DSA / CP":       ["DSA","Algorithms","Programming"],
  "DevOps":         ["DevOps","Linux","Docker","Cloud"],
  "Trading":        ["Trading","Finance","Python"],
};

const INTERESTS = ["AI","ML","Python","DSA","Web Dev","Trading","Linux","Psychology","Career","Security","DevOps"];

export default function SageOnboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [career, setCareer] = useState("");
  const [goalText, setGoalText] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  function addGoal() {
    if (!goalText.trim() || goals.length >= 5) return;
    setGoals(prev => [...prev, goalText.trim()]);
    setGoalText("");
  }

  function finish() {
    const topicsFromCareer = TOPIC_MAP[career] || ["AI","Programming"];
    const allTopics = [...new Set([...topicsFromCareer, ...interests])];

    const sageGoals: SageGoal[] = goals.map((g, i) => ({
      id: `goal_${i}_${Date.now()}`,
      text: g,
      topics: topicsFromCareer,
      progress: 0,
      dailyAction: "Work on this goal today",
      createdAt: Date.now(),
    }));

    const profile: SageProfile = {
      name: name.trim() || "You",
      careerTarget: career,
      goals: sageGoals,
      interests: allTopics,
      setupDone: true,
      createdAt: Date.now(),
    };

    saveProfile(profile);
    onDone();
  }

  const input: React.CSSProperties = { width: "100%", padding: "12px 14px", background: "#f7f7f8", border: "1px solid #e5e5ea", borderRadius: "10px", fontSize: "0.95rem", outline: "none", fontFamily: "'Syne', sans-serif", boxSizing: "border-box" };
  const btn: React.CSSProperties = { background: "#6366f1", border: "none", borderRadius: "10px", padding: "12px 24px", color: "#fff", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem" };
  const chip = (active: boolean): React.CSSProperties => ({ padding: "6px 14px", borderRadius: "20px", border: active ? "1px solid #6366f1" : "1px solid #e5e5ea", background: active ? "rgba(99,102,241,0.1)" : "#fff", color: active ? "#6366f1" : "#555", cursor: "pointer", fontSize: "0.82rem", fontFamily: "'DM Mono', monospace" });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(10,10,11,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "32px 28px", width: "100%", maxWidth: "440px", maxHeight: "85vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <div style={{ width: "44px", height: "44px", background: "#6366f1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>👀</div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>Meet SAGE</div>
            <div style={{ fontSize: "0.78rem", color: "#999", fontFamily: "'DM Mono', monospace" }}>Self-Aware Goal Engine</div>
          </div>
        </div>

        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "0.9rem", color: "#555", lineHeight: 1.6, marginBottom: "8px" }}>SAGE tracks your goals, curates your feed, and checks in proactively. Takes 30 seconds to set up.</p>
            <div>
              <label style={{ fontSize: "0.8rem", fontFamily: "'DM Mono', monospace", color: "#999", marginBottom: "6px", display: "block" }}>Your name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Jogendra" style={input} />
            </div>
            <button onClick={() => setStep(1)} disabled={!name.trim()} style={{ ...btn, opacity: name.trim() ? 1 : 0.4 }}>Continue →</button>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "0.9rem", color: "#555", lineHeight: 1.6 }}>What are you working toward?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Object.keys(TOPIC_MAP).map(c => (
                <button key={c} onClick={() => setCareer(c)} style={{ ...chip(career === c), padding: "10px 16px", textAlign: "left", borderRadius: "10px" }}>{c}</button>
              ))}
              <input value={career} onChange={e => setCareer(e.target.value)} placeholder="Or type your own..." style={{ ...input, marginTop: "4px" }} />
            </div>
            <button onClick={() => setStep(2)} disabled={!career.trim()} style={{ ...btn, opacity: career.trim() ? 1 : 0.4 }}>Continue →</button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "0.9rem", color: "#555", lineHeight: 1.6 }}>Set up to 5 goals. Be specific.</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={goalText} onChange={e => setGoalText(e.target.value)} onKeyDown={e => e.key === "Enter" && addGoal()} placeholder="e.g. Learn DSA in 30 days" style={{ ...input, flex: 1 }} />
              <button onClick={addGoal} style={{ ...btn, padding: "12px 16px" }}>+</button>
            </div>
            {goals.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f7f7f8", borderRadius: "10px", fontSize: "0.85rem" }}>
                <span>{g}</span>
                <button onClick={() => setGoals(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: "16px" }}>×</button>
              </div>
            ))}
            <button onClick={() => setStep(3)} disabled={goals.length === 0} style={{ ...btn, opacity: goals.length > 0 ? 1 : 0.4 }}>Continue →</button>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "0.9rem", color: "#555", lineHeight: 1.6 }}>Pick your interests so SAGE curates your feed.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {INTERESTS.map(t => (
                <button key={t} onClick={() => setInterests(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} style={chip(interests.includes(t))}>{t}</button>
              ))}
            </div>
            <button onClick={finish} style={{ ...btn, marginTop: "8px" }}>Launch SAGE 🚀</button>
          </div>
        )}

        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: "0.82rem", fontFamily: "'DM Mono', monospace", marginTop: "12px" }}>← Back</button>
        )}
      </div>
    </div>
  );
}