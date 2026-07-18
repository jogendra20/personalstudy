"use client";

import { useState, useCallback, useRef } from "react";
import FeedScroll from "@/components/feed/FeedScroll";
import ErrorBoundary from "@/components/ErrorBoundary";

interface BadgeToast {
  name: string;
  id: number;
}

export default function Home() {
  const [badges, setBadges] = useState<BadgeToast[]>([]);
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
      <ErrorBoundary>
        <FeedScroll onXP={handleXP} onBadge={handleBadge} scrollRef={feedRef} />
      </ErrorBoundary>

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

    </main>
  );
}
