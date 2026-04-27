"use client";
import { useState, useEffect } from "react";
import {
  getForgeProfile, getForgeTasks, saveForgeTask,
  updateForgeTask, getNewsCache, saveNewsCache,
  getWeakAreaBias, getForgeKeys, saveForgeKeys,
  ForgeTask, ForgeNewsItem,
} from "@/lib/forge";
import { getGroqKey } from "@/lib/api";

const CAT_ORDER = ["indian","crypto","forex","global"] as const;
const CAT_LABEL: Record<string,string> = {
  indian:"🇮🇳 Indian Markets", crypto:"🪙 Crypto",
  forex:"💱 Forex", global:"🌍 Global",
};

function NewsCard({ item }: { item: ForgeNewsItem }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      style={{ display:"block", textDecoration:"none", padding:"11px 13px", background:"#f7f7f8", border:"1px solid #e5e5ea", borderRadius:"10px", marginBottom:"8px" }}>
      <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:"0.82rem", color:"#111", lineHeight:1.4, marginBottom:4 }}>{item.title}</p>
      <p style={{ fontSize:"0.73rem", color:"#666", lineHeight:1.5, marginBottom:5 }}>{item.summary}</p>
      <span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#999" }}>{item.source}</span>
    </a>
  );
}

function TaskCard({ task, groqKey, onDone, onSkip }: {
  task: ForgeTask; groqKey: string;
  onDone: (score: number, feedback: string) => void;
  onSkip: () => void;
}) {
  const [answer, setAnswer] = useState(task.starterCode || "");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{score:number;feedback:string;correct:boolean}|null>(null);
  const typeIcon = { code:"⌨️", quiz:"❓", design:"🏗️", review:"📝", link:"🔗" }[task.type];

  async function handleSubmit() {
    if (!answer.trim() || checking) return;
    setChecking(true);
    try {
      const res = await fetch("/api/forge", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"check_answer", groqKey, answer, task }),
      });
      const data = await res.json();
      setResult(data);
      onDone(data.score, data.feedback);
    } catch(e:any) { setResult({ score:0, feedback:"Error: "+e.message, correct:false }); }
    finally { setChecking(false); }
  }

  return (
    <div style={{ background:"#f7f7f8", border:"1px solid #e5e5ea", borderRadius:"12px", padding:"15px", marginBottom:"12px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <span style={{ fontSize:"16px" }}>{typeIcon}</span>
        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.85rem", color:"#111", flex:1 }}>{task.title}</span>
        <span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"#6366f1", background:"rgba(99,102,241,0.1)", padding:"2px 8px", borderRadius:"20px" }}>{task.articleTag}</span>
      </div>
      <p style={{ fontSize:"0.78rem", color:"#444", lineHeight:1.6, marginBottom:12, whiteSpace:"pre-wrap" }}>{task.description}</p>
      {task.type === "link" ? (
        <a href={task.linkUrl} target="_blank" rel="noopener noreferrer"
          style={{ display:"inline-block", padding:"8px 16px", background:"#6366f1", color:"#fff", borderRadius:"8px", fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:"0.8rem", textDecoration:"none" }}>
          Open Resource →
        </a>
      ) : result ? (
        <div style={{ background:result.correct ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border:"1px solid "+(result.correct ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"), borderRadius:"10px", padding:"12px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ width:44, height:44, borderRadius:"50%", border:"2px solid "+(result.correct ? "#22c55e" : "#ef4444"), display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", fontWeight:700, color:result.correct ? "#22c55e" : "#ef4444" }}>{result.score}</div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.85rem" }}>{result.correct ? "Correct ✓" : "Needs work"}</span>
          </div>
          <p style={{ fontSize:"0.78rem", color:"#444", lineHeight:1.6 }}>{result.feedback}</p>
        </div>
      ) : (
        <>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)}
            placeholder={task.type === "code" ? "Write your code here..." : "Write your answer here..."}
            style={{ width:"100%", minHeight:task.type === "code" ? "150px" : "90px", padding:"10px 12px", background:"#fff", border:"1px solid #e5e5ea", borderRadius:"8px", fontFamily:"'DM Mono',monospace", fontSize:"0.78rem", color:"#111", resize:"vertical", outline:"none", lineHeight:1.6, boxSizing:"border-box" }} />
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <button onClick={handleSubmit} disabled={checking || !answer.trim()}
              style={{ flex:1, padding:"9px", background:"#6366f1", border:"none", borderRadius:"8px", color:"#fff", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.82rem", cursor:"pointer", opacity:checking || !answer.trim() ? 0.5 : 1 }}>
              {checking ? "Checking..." : "Submit →"}
            </button>
            <button onClick={onSkip}
              style={{ padding:"9px 14px", background:"none", border:"1px solid #e5e5ea", borderRadius:"8px", color:"#999", fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:"0.82rem", cursor:"pointer" }}>
              Skip
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function KeysSetup({ onSave }: { onSave: () => void }) {
  const existing = getForgeKeys();
  const [tavily, setTavily] = useState(existing.tavily || "");
  const [groq, setGroq] = useState(existing.groq || getGroqKey() || "");
  function handle() { saveForgeKeys({ tavily:tavily.trim(), groq:groq.trim() }); onSave(); }
  const inp: React.CSSProperties = { width:"100%", padding:"10px 12px", background:"#f7f7f8", border:"1px solid #e5e5ea", borderRadius:"8px", fontFamily:"'DM Mono',monospace", fontSize:"0.8rem", color:"#111", outline:"none", boxSizing:"border-box", marginBottom:12 };
  return (
    <div style={{ padding:"20px" }}>
      <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.95rem", marginBottom:4 }}>Setup FORGE</p>
      <p style={{ fontSize:"0.75rem", color:"#999", fontFamily:"'DM Mono',monospace", marginBottom:20 }}>Keys stored locally only.</p>
      <label style={{ fontSize:"0.75rem", color:"#666", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:6 }}>TAVILY API KEY</label>
      <input type="password" value={tavily} onChange={e => setTavily(e.target.value)} placeholder="tvly-..." style={inp} />
      <label style={{ fontSize:"0.75rem", color:"#666", fontFamily:"'DM Mono',monospace", display:"block", marginBottom:6 }}>GROQ API KEY</label>
      <input type="password" value={groq} onChange={e => setGroq(e.target.value)} placeholder="gsk_..." style={inp} />
      <button onClick={handle} disabled={!tavily.trim() || !groq.trim()}
        style={{ width:"100%", padding:"11px", background:"#6366f1", border:"none", borderRadius:"8px", color:"#fff", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.88rem", cursor:"pointer", opacity:!tavily.trim() || !groq.trim() ? 0.5 : 1 }}>
        Activate FORGE
      </button>
    </div>
  );
}
export function ForgeAvatar({ onClick, hasPending }: { onClick: () => void; hasPending: boolean }) {
  return (
    <button onClick={onClick}
      style={{ position:"fixed", bottom:"80px", left:"20px", zIndex:200, width:"52px", height:"52px", borderRadius:"50%", background:"#111", border:"2px solid #6366f1", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(99,102,241,0.3)" }}>
      <span style={{ fontSize:"22px" }}>⚒️</span>
      {hasPending && <div style={{ position:"absolute", top:2, right:2, width:10, height:10, background:"#f59e0b", borderRadius:"50%", border:"2px solid #111" }} />}
    </button>
  );
}

export default function ForgePanel({ onClose, articleContext }: { onClose: () => void; articleContext?: { title:string; tag:string; text:string; url:string }|null }) {
  const profile = getForgeProfile();

  useEffect(() => { setTasks(getForgeTasks()); }, []);

  useEffect(() => {
    if (!setupDone || tab !== "intel") return;
    const cached = getNewsCache();
    if (cached) { setNews(cached.items); return; }
    fetchNews();
  }, [tab, setupDone]);

  useEffect(() => {
    if (articleContext && setupDone) {
      setTab("tasks");
      const existing = getForgeTasks().find(t => t.articleUrl === articleContext.url && t.status === "pending");
      if (!existing) generateTask();
    }
  }, [articleContext]);

  async function fetchNews() {
    const k = getForgeKeys();
    if (!k.tavily) return;
    setNewsLoading(true); setNewsError("");
    try {
      const res = await fetch("/api/forge", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"news", tavilyKey:k.tavily }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      saveNewsCache(data.items);
      setNews(data.items);
    } catch(e:any) { setNewsError(e.message); }
    finally { setNewsLoading(false); }
  }

  async function generateTask() {
    if (!articleContext) return;
    const k = getForgeKeys();
    if (!k.groq) return;
    setGenerating(true);
    try {
      const bias = getWeakAreaBias(profile);
      const res = await fetch("/api/forge", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"generate_task", groqKey:k.groq, articleTitle:articleContext.title, articleTag:articleContext.tag, articleText:articleContext.text, weakArea:bias }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const task: ForgeTask = {
        id:"task_"+Date.now(),
        articleUrl:articleContext.url,
        articleTitle:articleContext.title,
        articleTag:articleContext.tag,
        status:"pending",
        createdAt:Date.now(),
        ...data.task,
      };
      saveForgeTask(task);
      setTasks(getForgeTasks());
    } catch(e:any) { console.error("Forge:",e.message); }
    finally { setGenerating(false); }
  }

  function handleDone(taskId:string, score:number, feedback:string) {
    updateForgeTask(taskId, { status:"done", score, feedback, completedAt:Date.now() });
    setTasks(getForgeTasks());
  }
  function handleSkip(taskId:string) {
    updateForgeTask(taskId, { status:"skipped" });
    setTasks(getForgeTasks());
  }

  const pending = tasks.filter(t => t.status === "pending");
  const done = tasks.filter(t => t.status === "done");

  const tabBtn = (t: string, label: string) => (
    <button onClick={() => setTab(t as any)}
      style={{ flex:1, padding:"8px", background:tab===t ? "#6366f1" : "none", color:tab===t ? "#fff" : "#999", border:"none", borderRadius:"8px", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:"0.78rem" }}>
      {label}
    </button>
  );

  if (!setupDone) {
    return (
      <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(10,10,11,0.7)", backdropFilter:"blur(8px)", display:"flex", alignItems:"flex-end" }} onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:"480px", margin:"0 auto", background:"#fff", borderRadius:"20px 20px 0 0", maxHeight:"78vh", overflowY:"auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:"1px solid #f0f0f2" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:"20px" }}>⚒️</span>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"0.95rem" }}>FORGE</span>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"20px", color:"#999" }}>×</button>
          </div>
          <KeysSetup onSave={() => { setKeys(getForgeKeys()); setSetupDone(true); }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(10,10,11,0.7)", backdropFilter:"blur(8px)", display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:"480px", margin:"0 auto", background:"#fff", borderRadius:"20px 20px 0 0", maxHeight:"82vh", display:"flex", flexDirection:"column" }}>

        <div style={{ padding:"16px 20px", borderBottom:"1px solid #f0f0f2", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:"20px" }}>⚒️</span>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"0.95rem" }}>FORGE</div>
              <div style={{ fontSize:"10px", color:"#999", fontFamily:"'DM Mono',monospace" }}>
                {done.length} done · {pending.length} pending · avg {done.length ? Math.round(done.reduce((a,t) => a+(t.score||0),0)/done.length) : 0}%
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"20px", color:"#999" }}>×</button>
        </div>

        <div style={{ display:"flex", gap:4, padding:"8px 16px", background:"#f7f7f8", flexShrink:0 }}>
          {tabBtn("intel","📡 Intel")}
          {tabBtn("tasks","⚒️ Tasks"+(pending.length > 0 ? " ("+pending.length+")" : ""))}
          {tabBtn("setup","⚙️ Setup")}
        </div>

        {tab === "intel" && (
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#999" }}>1hr cache</span>
              <button onClick={fetchNews} disabled={newsLoading}
                style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"#6366f1", background:"none", border:"none", cursor:"pointer", opacity:newsLoading ? 0.5 : 1 }}>
                {newsLoading ? "fetching..." : "↺ refresh"}
              </button>
            </div>
            {newsError && <p style={{ color:"#ef4444", fontSize:"0.78rem", marginBottom:12 }}>Error: {newsError}</p>}
            {newsLoading && !news.length && (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#999", fontFamily:"'DM Mono',monospace", fontSize:"0.8rem" }}>Fetching live intel...</div>
            )}
            {CAT_ORDER.map(cat => {
              const items = news.filter(n => n.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat} style={{ marginBottom:20 }}>
                  <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.82rem", marginBottom:10 }}>{CAT_LABEL[cat]}</p>
                  {items.map((item,i) => <NewsCard key={i} item={item} />)}
                </div>
              );
            })}
          </div>
        )}

        {tab === "tasks" && (
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
            {generating && (
              <div style={{ textAlign:"center", padding:"20px", background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:"10px", marginBottom:14 }}>
                <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.8rem", color:"#6366f1" }}>⚒️ Generating task...</p>
              </div>
            )}
            {articleContext && !generating && (
              <button onClick={generateTask}
                style={{ width:"100%", padding:"10px", background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:"10px", color:"#6366f1", fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:"0.82rem", cursor:"pointer", marginBottom:14 }}>
                ↺ Regenerate Task
              </button>
            )}
            {pending.length === 0 && done.length === 0 && !generating && (
              <div style={{ textAlign:"center", padding:"40px 20px", color:"#999" }}>
                <p style={{ fontSize:"2rem", marginBottom:8 }}>⚒️</p>
                <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:"0.88rem", marginBottom:4 }}>No tasks yet</p>
                <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.75rem" }}>Read an article — FORGE will generate a task</p>
              </div>
            )}
            {pending.map(task => (
              <TaskCard key={task.id} task={task} groqKey={keys.groq}
                onDone={(score,feedback) => handleDone(task.id,score,feedback)}
                onSkip={() => handleSkip(task.id)} />
            ))}
            {done.length > 0 && (
              <>
                <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:"#999", marginTop:16, marginBottom:10 }}>COMPLETED</p>
                {done.map(task => (
                  <div key={task.id} style={{ padding:"12px 14px", background:"#f7f7f8", border:"1px solid #e5e5ea", borderRadius:"10px", marginBottom:8, display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", border:"2px solid #22c55e", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:"0.82rem", color:"#22c55e", flexShrink:0 }}>{task.score}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:"0.8rem", color:"#111", marginBottom:2 }}>{task.title}</p>
                      <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"10px", color:"#999" }}>{task.articleTag} · {new Date(task.completedAt||0).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === "setup" && (
          <div style={{ flex:1, overflowY:"auto" }}>
            <KeysSetup onSave={() => { setKeys(getForgeKeys()); setSetupDone(true); setTab("intel"); }} />
            <div style={{ padding:"0 20px 20px" }}>
              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:"#999", marginBottom:10 }}>WEAK AREAS</p>
              {Object.entries(profile.weakAreas).sort((a,b) => b[1]-a[1]).map(([tag,count]) => (
                <div key={tag} style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background:"#f7f7f8", borderRadius:"8px", marginBottom:6 }}>
                  <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:"0.8rem" }}>{tag}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.78rem", color:"#ef4444" }}>{count} skipped</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
