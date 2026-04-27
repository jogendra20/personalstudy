"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchFeed, clearFeedCache, Article, getSavedArticles, toggleSaveArticle, isArticleSaved, getGroqKey, setGroqKey } from "@/lib/api";
import Sage from "@/components/sage";

const IconBookmark = ({ filled }: { filled?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
);
const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
);
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);
const IconDevto = () => (
  <svg width="12" height="12" viewBox="0 0 448 512" fill="currentColor"><path d="M120.12 208.29c-3.88-2.9-7.77-4.35-11.65-4.35H91.03v104.47h17.45c3.88 0 7.77-1.45 11.65-4.35 3.88-2.9 5.82-7.25 5.82-13.06v-69.65c-.01-5.8-1.96-10.16-5.83-13.06zM404.1 32H43.9C19.7 32 .06 51.59 0 75.8v360.4C.06 460.41 19.7 480 43.9 480h360.2c24.21 0 43.84-19.59 43.9-43.8V75.8c-.06-24.21-19.7-43.8-43.9-43.8zM154.2 291.19c0 18.81-11.61 47.31-48.36 47.25h-46.4V172.98h47.38c35.44 0 47.36 28.46 47.37 47.28zm100.68-88.66H201.6v38.42h32.57v29.57H201.6v38.41h53.29v29.57h-62.18c-11.16.29-20.44-8.53-20.72-19.69V193.7c-.27-11.15 8.56-20.41 19.71-20.69h63.19l-.01 29.52zm103.64 115.29c-13.2 30.75-36.85 24.63-47.44 0l-38.53-144.8h32.57l29.71 113.72 29.57-113.72h32.58z" /></svg>
);
const IconMedium = () => (
  <svg width="12" height="12" viewBox="0 0 640 512" fill="currentColor"><path d="M180.5,74.262C80.813,74.262,0,155.633,0,256S80.819,437.738,180.5,437.738,361,356.373,361,256,280.191,74.262,180.5,74.262Zm288.25,10.646c-49.845,0-90.245,76.619-90.245,171.095s40.406,171.1,90.251,171.1,90.251-76.619,90.251-171.1H559C559,161.5,518.6,84.908,468.752,84.908Zm139.506,17.821c-17.526,0-31.735,68.628-31.735,153.274s14.2,153.274,31.726,153.274S640,340.631,640,255.985,625.785,102.729,608.258,102.729Z" /></svg>
);
const IconCalendar = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);
const IconClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const IconNewspaper = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" /></svg>
);
const IconFlame = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
);

const TAG_COLORS: Record<string, string> = {
  "AI":"#c8ff40","ML":"#7c6fff","Python":"#ff6b35","Web Dev":"#40d9ff",
  "Programming":"#ff40a0","System Design":"#ffbe40","Trading":"#40ffbe",
  "DSA":"#ff9f40","DevOps":"#40c8ff","Linux":"#e0e040","Career":"#c840ff","Security":"#ff4040",
};
function getTagColor(tag: string) { return TAG_COLORS[tag] || "#888"; }

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso); const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 3600) return Math.floor(diff/60) + "m ago";
    if (diff < 86400) return Math.floor(diff/3600) + "h ago";
    if (diff < 604800) return Math.floor(diff/86400) + "d ago";
    return d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  } catch { return ""; }
}

function getStreak(): { count: number; today: boolean } {
  if (typeof window === "undefined") return { count:0, today:false };
  try {
    const data = JSON.parse(localStorage.getItem("onyx_streak") || "{}");
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now()-86400000).toDateString();
    if (data.last === today) return { count: data.count||1, today:true };
    if (data.last === yesterday) return { count: data.count||0, today:false };
    return { count:0, today:false };
  } catch { return { count:0, today:false }; }
}
function bumpStreak() {
  if (typeof window === "undefined") return;
  try {
    const today = new Date().toDateString();
    const existing = JSON.parse(localStorage.getItem("onyx_streak") || "{}");
    if (existing.last === today) return;
    const yesterday = new Date(Date.now()-86400000).toDateString();
    const count = existing.last === yesterday ? (existing.count||0)+1 : 1;
    localStorage.setItem("onyx_streak", JSON.stringify({ last:today, count }));
  } catch {}
}

function SkeletonCard() {
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"14px", overflow:"hidden" }}>
      <div className="shimmer" style={{ height:"120px" }} />
      <div style={{ padding:"14px" }}>
        <div className="shimmer" style={{ height:"10px", width:"50px", borderRadius:"20px", marginBottom:"10px" }} />
        <div className="shimmer" style={{ height:"13px", borderRadius:"6px", marginBottom:"6px" }} />
        <div className="shimmer" style={{ height:"13px", width:"75%", borderRadius:"6px", marginBottom:"12px" }} />
        <div className="shimmer" style={{ height:"10px", width:"40px", borderRadius:"6px" }} />
      </div>
    </div>
  );
}

function ArticleCard({ article, onClick }: { article: Article; onClick: () => void }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(isArticleSaved(article.url)); }, [article.url]);
  function handleSave(e: React.MouseEvent) { e.stopPropagation(); setSaved(toggleSaveArticle(article)); }
  const tagColor = getTagColor(article.tag);
  return (
    <div onClick={onClick} className="animate-fade-up"
      style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"14px", overflow:"hidden", cursor:"pointer", transition:"border-color 0.2s, transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor="var(--border2)"; el.style.transform="translateY(-2px)"; el.style.boxShadow="0 4px 20px rgba(0,0,0,0.06)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor="var(--border)"; el.style.transform="translateY(0)"; el.style.boxShadow="none"; }}
    >
      {article.cover && (
        <div style={{ height:"120px", overflow:"hidden", background:"var(--surface2)" }}>
          <img src={article.cover} alt="" loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.85 }} onError={e => { (e.target as HTMLElement).style.display="none"; }} />
        </div>
      )}
      <div style={{ padding:"13px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"9px", flexWrap:"wrap" }}>
          <span style={{ fontSize:"9px", fontWeight:700, fontFamily:"'DM Mono',monospace", color:tagColor, background:tagColor+"18", border:"1px solid "+tagColor+"30", padding:"2px 7px", borderRadius:"20px", letterSpacing:"0.05em" }}>{article.tag}</span>
          <span style={{ fontSize:"9px", fontFamily:"'DM Mono',monospace", color:"var(--text3)", background:"var(--surface2)", border:"1px solid var(--border)", padding:"2px 7px", borderRadius:"20px", display:"flex", alignItems:"center", gap:"3px" }}>
            {article.source === "devto" ? <IconDevto /> : <IconMedium />}
            {article.source === "devto" ? "DEV" : "Medium"}
          </span>
        </div>
        <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:"0.88rem", fontWeight:600, lineHeight:1.4, color:"var(--text)", marginBottom:"10px", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{article.title}</h3>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            {article.publishedAt && <span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"var(--text3)", display:"flex", alignItems:"center", gap:"3px" }}><IconCalendar />{formatDate(article.publishedAt)}</span>}
            {article.readTime && <span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"var(--text3)", display:"flex", alignItems:"center", gap:"3px" }}><IconClock />{article.readTime}</span>}
          </div>
          <button onClick={handleSave} style={{ background:"none", border:"none", cursor:"pointer", color:saved?"var(--accent)":"var(--text3)", padding:"4px", display:"flex", alignItems:"center", transition:"color 0.2s" }}><IconBookmark filled={saved} /></button>
        </div>
      </div>
    </div>
  );
}

function TrendingStrip({ articles, onOpen }: { articles: Article[]; onOpen: (a: Article) => void }) {
  const saved = getSavedArticles();
  const counts: Record<string,number> = {};
  saved.forEach(a => { counts[a.url] = (counts[a.url]||0)+1; });
  const top = articles.map(a => ({ ...a, saves: counts[a.url]||0 })).sort((a,b) => b.saves-a.saves).slice(0,5);
  if (!top.length) return null;
  return (
    <div style={{ padding:"14px 20px 0", maxWidth:"640px", margin:"0 auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"10px" }}>
        <IconFlame />
        <span style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"var(--text3)", letterSpacing:"0.08em" }}>TRENDING</span>
      </div>
      <div style={{ display:"flex", gap:"8px", overflowX:"auto", paddingBottom:"4px" }}>
        {top.map((a,i) => (
          <div key={a.id} onClick={() => onOpen(a)}
            style={{ flexShrink:0, width:"180px", padding:"10px 12px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"10px", cursor:"pointer", transition:"border-color 0.2s" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor="var(--border2)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor="var(--border)"}
          >
            <span style={{ fontSize:"9px", fontFamily:"'DM Mono',monospace", color:"var(--text3)" }}>#{i+1}</span>
            <p style={{ fontSize:"0.78rem", fontFamily:"'Syne',sans-serif", fontWeight:600, lineHeight:1.35, color:"var(--text)", marginTop:"4px", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{a.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyBrief({ articles, onOpen, onClose }: { articles: Article[]; onOpen: (a: Article) => void; onClose: () => void }) {
  const top5 = articles.slice(0,5);
  const dateStr = new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" });
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"var(--bg)", overflowY:"auto" }}>
      <div style={{ maxWidth:"640px", margin:"0 auto", padding:"32px 20px 80px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"32px" }}>
          <div>
            <p style={{ fontSize:"11px", fontFamily:"'DM Mono',monospace", color:"var(--text3)", marginBottom:"6px", letterSpacing:"0.1em" }}>DAILY BRIEF — {dateStr.toUpperCase()}</p>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(1.6rem,5vw,2.4rem)", fontWeight:800, lineHeight:1.1, letterSpacing:"-0.03em" }}>Your Morning<br />Reading List</h1>
          </div>
          <button onClick={onClose} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"8px", padding:"8px", cursor:"pointer", color:"var(--text2)", display:"flex" }}><IconX /></button>
        </div>
        <div style={{ height:"2px", background:"var(--text)", marginBottom:"28px" }} />
        {top5[0] && (
          <div onClick={() => onOpen(top5[0])} style={{ cursor:"pointer", marginBottom:"24px", paddingBottom:"24px", borderBottom:"1px solid var(--border)" }}>
            {top5[0].cover && <div style={{ height:"220px", borderRadius:"12px", overflow:"hidden", marginBottom:"16px" }}><img src={top5[0].cover} alt="" loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => { (e.target as HTMLElement).style.display="none"; }} /></div>}
            <span style={{ fontSize:"9px", fontFamily:"'DM Mono',monospace", color:getTagColor(top5[0].tag), letterSpacing:"0.1em" }}>{top5[0].tag.toUpperCase()}</span>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"1.4rem", fontWeight:800, lineHeight:1.2, marginTop:"6px", marginBottom:"8px" }}>{top5[0].title}</h2>
            {top5[0].description && <p style={{ fontSize:"0.85rem", color:"var(--text2)", lineHeight:1.6 }}>{top5[0].description}</p>}
            <div style={{ display:"flex", gap:"10px", marginTop:"10px" }}>
              {top5[0].publishedAt && <span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"var(--text3)" }}>{formatDate(top5[0].publishedAt)}</span>}
              {top5[0].readTime && <span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"var(--text3)" }}>{top5[0].readTime}</span>}
            </div>
          </div>
        )}
        <div>
          {top5.slice(1).map((a,i) => (
            <div key={a.id} onClick={() => onOpen(a)} style={{ display:"flex", gap:"14px", padding:"16px 0", borderBottom:"1px solid var(--border)", cursor:"pointer" }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"1.5rem", fontWeight:800, color:"var(--border2)", minWidth:"28px", lineHeight:1 }}>{i+2}</span>
              <div style={{ flex:1 }}>
                <span style={{ fontSize:"9px", fontFamily:"'DM Mono',monospace", color:getTagColor(a.tag), letterSpacing:"0.08em" }}>{a.tag.toUpperCase()}</span>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"0.92rem", fontWeight:600, lineHeight:1.35, marginTop:"3px" }}>{a.title}</p>
                <div style={{ display:"flex", gap:"10px", marginTop:"6px" }}>
                  {a.publishedAt && <span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"var(--text3)" }}>{formatDate(a.publishedAt)}</span>}
                  {a.readTime && <span style={{ fontSize:"10px", fontFamily:"'DM Mono',monospace", color:"var(--text3)" }}>{a.readTime}</span>}
                </div>
              </div>
              {a.cover && <div style={{ width:"64px", height:"64px", borderRadius:"8px", overflow:"hidden", flexShrink:0 }}><img src={a.cover} alt="" loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => { (e.target as HTMLElement).style.display="none"; }} /></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setKey(getGroqKey()); }, []);
  function handleSave() { setGroqKey(key.trim()); setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 800); }
  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(10,10,11,0.85)", backdropFilter:"blur(12px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"var(--surface)", border:"1px solid var(--border2)", borderRadius:"20px 20px 0 0", padding:"28px 24px 40px", width:"100%", maxWidth:"480px", animation:"fadeUp 0.3s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"1.1rem", fontWeight:700 }}>Settings</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text2)" }}><IconX /></button>
        </div>
        <label style={{ display:"block", marginBottom:"8px", fontSize:"0.78rem", color:"var(--text2)", fontFamily:"'DM Mono',monospace" }}>GROQ API KEY</label>
        <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="gsk_..."
          style={{ width:"100%", padding:"12px 14px", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:"10px", color:"var(--text)", fontFamily:"'DM Mono',monospace", fontSize:"0.85rem", outline:"none", marginBottom:"20px" }} />
        <p style={{ fontSize:"0.75rem", color:"var(--text3)", marginBottom:"20px", lineHeight:1.5 }}>Required for Ghostreader. Free at console.groq.com — stored locally only.</p>
        <button onClick={handleSave} style={{ width:"100%", padding:"13px", background:saved?"var(--accent)":"var(--surface2)", border:"1px solid "+(saved?"var(--accent)":"var(--border2)"), borderRadius:"10px", color:saved?"#0a0a0b":"var(--text)", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"0.9rem", cursor:"pointer", transition:"all 0.2s" }}>{saved?"Saved ✓":"Save Key"}</button>
      </div>
    </div>
  );
}

const ALL_TAGS = ["All","AI","ML","Python","DSA","System Design","Web Dev","Programming","Trading","DevOps","Linux","Career","Security","Psychology"];

export default function HomePage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const ts = parseInt(localStorage.getItem("onyx_feed_ts") || "0");
      const raw = localStorage.getItem("onyx_feed_cache");
      if (raw && Date.now() - ts < 5 * 60 * 1000) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    // Start as false if cache exists — no spinner on reopen
    if (typeof window === "undefined") return true;
    try {
      const ts = parseInt(localStorage.getItem("onyx_feed_ts") || "0");
      const raw = localStorage.getItem("onyx_feed_cache");
      if (raw && Date.now() - ts < 5 * 60 * 1000) return false;
    } catch {}
    return true;
  });
  const [error, setError] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [showSaved, setShowSaved] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [streak, setStreak] = useState({ count:0, today:false });
  const pillRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  const [pillStyle, setPillStyle] = useState({ left:0, width:0 });
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true); setError(""); setArticles([]);
    try { await fetchFeed((batch) => { setArticles(batch); setLoading(false); }, forceRefresh); }
    catch { setError("Failed to load feed."); setLoading(false); }
  }, []);

  useEffect(() => { load(); setStreak(getStreak()); }, [load]);

  useEffect(() => {
    if (activeButtonRef.current && pillRef.current) {
      const btn = activeButtonRef.current;
      const container = pillRef.current;
      const btnRect = btn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setPillStyle({ left: btnRect.left - containerRect.left + container.scrollLeft, width: btnRect.width });
    }
  }, [activeTag, showSaved]);

  useEffect(() => { if (showSearch && searchRef.current) searchRef.current.focus(); }, [showSearch]);

  async function handleRefresh() { setRefreshing(true); clearFeedCache(); await load(true); setRefreshing(false); }

  function openArticle(article: Article) { bumpStreak(); setStreak(getStreak());
    sessionStorage.setItem("onyx_article", JSON.stringify(article));
    router.push("/read?url=" + encodeURIComponent(article.url));
  }

  const savedArticles = getSavedArticles();
  const savedCount = savedArticles.length;
  const tagCounts: Record<string,number> = {};
  articles.forEach(a => { tagCounts[a.tag] = (tagCounts[a.tag]||0)+1; });

  let displayed = showSaved ? savedArticles : activeTag === "All" ? articles : articles.filter(a => a.tag === activeTag);
  if (search.trim()) {
    const q = search.toLowerCase();
    displayed = displayed.filter(a => a.title.toLowerCase().includes(q) || (a.description||"").toLowerCase().includes(q) || a.tag.toLowerCase().includes(q));
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>
      <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(255,255,255,0.95)", backdropFilter:"blur(20px)", borderBottom:"1px solid var(--border)", padding:"14px 20px" }}>
        <div style={{ maxWidth:"640px", margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <div style={{ width:"28px", height:"28px", background:"var(--accent)", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:"14px", fontWeight:900, color:"#0a0a0b", fontFamily:"'Syne',sans-serif" }}>O</span>
              </div>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"1.1rem", letterSpacing:"-0.02em" }}>onyx</span>
              {streak.count > 0 && (
                <span style={{ display:"flex", alignItems:"center", gap:"3px", fontSize:"11px", fontFamily:"'DM Mono',monospace", color:streak.today?"#ff6b35":"var(--text3)", background:streak.today?"rgba(255,107,53,0.1)":"var(--surface2)", border:"1px solid "+(streak.today?"rgba(255,107,53,0.3)":"var(--border)"), padding:"2px 8px", borderRadius:"20px" }}>
                  <IconFlame />{streak.count}d
                </span>
              )}
            </div>
            <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
              <button onClick={() => setShowSearch(!showSearch)} style={{ background:showSearch?"var(--accent)":"var(--surface2)", border:"1px solid "+(showSearch?"var(--accent)":"var(--border)"), borderRadius:"8px", padding:"7px", cursor:"pointer", color:showSearch?"#0a0a0b":"var(--text2)", display:"flex", alignItems:"center" }}><IconSearch /></button>
              <button onClick={() => setShowBrief(true)} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"8px", padding:"7px", cursor:"pointer", color:"var(--text2)", display:"flex", alignItems:"center" }}><IconNewspaper /></button>
              <button onClick={handleRefresh} className={refreshing?"animate-spin":""} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"8px", padding:"7px", cursor:"pointer", color:"var(--text2)", display:"flex", alignItems:"center" }}><IconRefresh /></button>
              <button onClick={() => setShowSettings(true)} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"8px", padding:"7px", cursor:"pointer", color:"var(--text2)", display:"flex", alignItems:"center" }}><IconSettings /></button>
            </div>
          </div>
          {showSearch && (
            <div style={{ marginTop:"12px", position:"relative" }}>
              <div style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", color:"var(--text3)" }}><IconSearch /></div>
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles, tags..."
                style={{ width:"100%", padding:"10px 12px 10px 36px", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:"10px", color:"var(--text)", fontFamily:"'Syne',sans-serif", fontSize:"0.88rem", outline:"none" }} />
              {search && <button onClick={() => setSearch("")} style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text3)" }}><IconX /></button>}
            </div>
          )}
        </div>
      </header>

      <div style={{ borderBottom:"1px solid var(--border)", background:"var(--bg)" }}>
        <div style={{ maxWidth:"640px", margin:"0 auto", padding:"12px 20px 0", overflowX:"auto" }}>
          <div ref={pillRef} style={{ display:"flex", gap:"4px", paddingBottom:"12px", position:"relative", width:"max-content", minWidth:"100%" }}>
            <div style={{ position:"absolute", bottom:"12px", height:"32px", background:"var(--text)", borderRadius:"20px", transition:"left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1)", left:pillStyle.left, width:pillStyle.width, pointerEvents:"none", zIndex:0 }} />
            <button ref={showSaved ? activeButtonRef : undefined} onClick={() => { setShowSaved(true); setActiveTag("All"); }}
              style={{ flexShrink:0, padding:"6px 12px", borderRadius:"20px", border:"none", background:"transparent", color:showSaved?"var(--bg)":"var(--text2)", fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:"0.78rem", cursor:"pointer", position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:"5px" }}>
              <IconBookmark filled={showSaved} />Saved
              {savedCount > 0 && <span style={{ background:showSaved?"rgba(255,255,255,0.25)":"var(--surface2)", color:showSaved?"#fff":"var(--text3)", fontSize:"9px", fontFamily:"'DM Mono',monospace", padding:"1px 5px", borderRadius:"10px" }}>{savedCount}</span>}
            </button>
            {ALL_TAGS.map(tag => {
              const isActive = !showSaved && activeTag === tag;
              const count = tag === "All" ? articles.length : (tagCounts[tag]||0);
              return (
                <button key={tag} ref={isActive ? activeButtonRef : undefined} onClick={() => { setActiveTag(tag); setShowSaved(false); }}
                  style={{ flexShrink:0, padding:"6px 12px", borderRadius:"20px", border:"none", background:"transparent", color:isActive?"var(--bg)":"var(--text2)", fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:"0.78rem", cursor:"pointer", position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:"4px" }}>
                  {tag}
                  {count > 0 && <span style={{ background:isActive?"rgba(255,255,255,0.25)":"var(--surface2)", color:isActive?"#fff":"var(--text3)", fontSize:"9px", fontFamily:"'DM Mono',monospace", padding:"1px 5px", borderRadius:"10px" }}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!showSaved && !search && articles.length > 0 && <TrendingStrip articles={articles} onOpen={openArticle} />}

      <main style={{ padding:"16px 20px 80px", maxWidth:"640px", margin:"0 auto" }}>
        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginTop:"16px" }}>
            {Array.from({ length:6 }).map((_,i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--text2)" }}>
            <p style={{ marginBottom:"16px" }}>{error}</p>
            <button onClick={() => load()} style={{ background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:"10px", padding:"10px 20px", color:"var(--text)", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:600 }}>Try Again</button>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px" }}>
            {showSaved ? (
              <>
                <div style={{ fontSize:"2.5rem", marginBottom:"16px" }}>🔖</div>
                <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:"1.2rem", marginBottom:"8px", color:"var(--text)" }}>Nothing saved yet</p>
                <p style={{ fontSize:"0.82rem", color:"var(--text3)", marginBottom:"24px" }}>Tap the bookmark on any article to save it for later</p>
                <button onClick={() => setShowSaved(false)} style={{ background:"var(--text)", color:"var(--bg)", border:"none", borderRadius:"10px", padding:"10px 20px", fontFamily:"'Syne',sans-serif", fontWeight:700, cursor:"pointer", fontSize:"0.88rem" }}>Browse Articles</button>
              </>
            ) : search ? (
              <>
                <div style={{ fontSize:"2rem", marginBottom:"12px" }}>🔍</div>
                <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:"1.1rem", color:"var(--text)" }}>No results for "{search}"</p>
                <p style={{ fontSize:"0.8rem", color:"var(--text3)", marginTop:"6px" }}>Try a different keyword or tag</p>
              </>
            ) : (
              <>
                <p style={{ fontFamily:"'Instrument Serif',serif", fontSize:"1.1rem", marginBottom:"8px", color:"var(--text)" }}>No articles found</p>
                <p style={{ fontSize:"0.8rem", color:"var(--text3)" }}>Try another tag or refresh</p>
              </>
            )}
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginTop:"16px" }}>
            {displayed.map((article,i) => <ArticleCard key={article.id+i} article={article} onClick={() => openArticle(article)} />)}
          </div>
        )}
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showBrief && <DailyBrief articles={articles} onOpen={(a) => { setShowBrief(false); openArticle(a); }} onClose={() => setShowBrief(false)} />}
      <Sage
        onFeedFilter={(tag) => setActiveTag(tag)}
        onSearch={(q) => { setSearch(q); setShowSearch(true); }}
      />
    </div>
  );
}
