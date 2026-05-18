"use client";

import { useState, useCallback, useRef } from "react";
import FeedScroll from "@/components/feed/FeedScroll";

interface BadgeToast {
  name: string;
  id: number;
}

export default function Home() {
  const [badges, setBadges] = useState<BadgeToast[]>([]);
  const [navTab, setNavTab] = useState("home");
  const [showGhost, setShowGhost] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const handleXP = useCallback((amount: number, reason: string) => {
    console.log(`+${amount} XP: ${reason}`);
  }, []);

  const handleBadge = useCallback((name: string) => {
    const id = Date.now();
    setBadges(prev => [...prev, { name, id }]);
    setTimeout(() => {
      setBadges(prev => prev.filter(b => b.id !== id));
    }, 3000);
  }, []);

  return (
    <main style={{
      position: "relative",
      width: "100%",
      height: "100svh",
      overflow: "hidden",
      background: "#FAF9F5",
    }}>
      <FeedScroll onXP={handleXP} onBadge={handleBadge} scrollRef={feedRef} />

      <div style={{
        position: "fixed", top: "80px", right: "16px",
        zIndex: 200, display: "flex",
        flexDirection: "column", gap: "8px",
      }}>
        {badges.map(badge => (
          <div key={badge.id} style={{
            background: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: "12px", padding: "10px 16px",
            animation: "badgeIn 3s ease forwards",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}>
            <p style={{ color: "#D4AF37", fontSize: "12px", fontWeight: 700, margin: 0 }}>
              🏆 Badge Unlocked!
            </p>
            <p style={{ color: "#555", fontSize: "11px", margin: "2px 0 0" }}>
              {badge.name}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeUp {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes badgeIn {
          0%   { opacity: 0; transform: translateX(20px); }
          15%  { opacity: 1; transform: translateX(0); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(20px); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FAF9F5; overflow: hidden; }
      `}</style>
      {/* Ghost Panel */}
      {showGhost && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(10,10,11,0.75)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "flex-end",
        }} onClick={() => setShowGhost(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: "640px", margin: "0 auto",
            background: "#18181b",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px 24px 0 0",
            padding: "20px 20px 40px",
            animation: "fadeUp 0.3s ease",
          }}>
            <div style={{
              width: "36px", height: "4px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "2px", margin: "0 auto 20px",
            }} />
            <div style={{
              fontSize: "11px", fontWeight: 800,
              letterSpacing: "0.2em", color: "#D4AF37",
              textTransform: "uppercase", marginBottom: "8px",
              fontFamily: "'Inter', sans-serif",
            }}>Ghostreader</div>
            <p style={{
              fontSize: "13px", color: "rgba(255,255,255,0.5)",
              fontFamily: "'Inter', sans-serif", lineHeight: 1.6,
            }}>
              Open any article and tap Ghost in the reader toolbar, or highlight any text while reading to activate Ghostreader.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 100, padding: "0 16px 28px",
        pointerEvents: "none",
      }}>
        <div style={{
          background: "rgba(10,10,11,0.92)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center",
          justifyContent: "space-around",
          padding: "12px 8px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          pointerEvents: "all",
        }}>
          {[
            { id: "home", label: "Home", icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            )},
            { id: "library", label: "Library", icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            )},
            { id: "discover", label: "Discover", icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            )},
            { id: "ghost", label: "Ghost", icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>
              </svg>
            )},
            { id: "profile", label: "Profile", icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )},
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => {
                setNavTab(id);
                if (id === "home") {
                  feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                }
                if (id === "ghost") {
                  setShowGhost(true);
                  setNavTab("home");
                }
              }}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: "4px",
                background: "none", border: "none",
                cursor: "pointer", padding: "4px 12px",
                color: navTab === id ? "#D4AF37" : "rgba(255,255,255,0.35)",
                transition: "color 0.2s",
                position: "relative",
              }}
            >
              {icon}
              <span style={{
                fontSize: "9px", fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase",
                fontFamily: "'Inter', sans-serif",
              }}>{label}</span>
              {navTab === id && (
                <div style={{
                  position: "absolute", bottom: "-8px",
                  width: "4px", height: "4px",
                  borderRadius: "50%", background: "#D4AF37",
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

    </main>
  );
}
