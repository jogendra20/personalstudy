"use client";

import { useState, useCallback } from "react";
import FeedScroll from "@/components/feed/FeedScroll";
import StoriesBar from "@/components/feed/StoriesBar";
import XPBar from "@/components/gamification/XPBar";

interface XPFlash {
  amount: number;
  reason: string;
}

interface BadgeToast {
  name: string;
  id: number;
}

export default function Home() {
  const [xpFlash, setXpFlash]       = useState<XPFlash | null>(null);
  const [badges, setBadges]         = useState<BadgeToast[]>([]);
  const [tagFilter, setTagFilter]   = useState<string | null>(null);

  const handleXP = useCallback((amount: number, reason: string) => {
    setXpFlash({ amount, reason });
    setTimeout(() => setXpFlash(null), 2500);
  }, []);

  const handleBadge = useCallback((name: string) => {
    const id = Date.now();
    setBadges(prev => [...prev, { name, id }]);
    setTimeout(() => {
      setBadges(prev => prev.filter(b => b.id !== id));
    }, 3000);
  }, []);

  const handleFilter = useCallback((tag: string | null) => {
    setTagFilter(tag);
  }, []);

  return (
    <main style={{
      position: "relative",
      width: "100%",
      height: "100svh",
      overflow: "hidden",
      background: "#0a0a0a",
    }}>
      {/* Stories bar at top */}
      <StoriesBar onFilter={handleFilter} />

      {/* Main feed */}
      <FeedScroll onXP={handleXP} onBadge={handleBadge} />

      {/* XP bar at bottom */}
      <XPBar flash={xpFlash} />

      {/* Badge toasts */}
      <div style={{
        position: "fixed", top: "80px", right: "16px",
        zIndex: 200, display: "flex",
        flexDirection: "column", gap: "8px",
      }}>
        {badges.map(badge => (
          <div key={badge.id} style={{
            background: "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,204,255,0.15))",
            border: "1px solid rgba(0,255,136,0.3)",
            borderRadius: "12px",
            padding: "10px 16px",
            animation: "badgeIn 3s ease forwards",
            backdropFilter: "blur(10px)",
          }}>
            <p style={{
              color: "#00ff88",
              fontFamily: "monospace",
              fontSize: "12px",
              fontWeight: 700,
              margin: 0,
            }}>
              🏆 Badge Unlocked!
            </p>
            <p style={{
              color: "rgba(255,255,255,0.8)",
              fontFamily: "monospace",
              fontSize: "11px",
              margin: "2px 0 0",
            }}>
              {badge.name}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes badgeIn {
          0%   { opacity: 0; transform: translateX(20px); }
          15%  { opacity: 1; transform: translateX(0); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(20px); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; overflow: hidden; }
      `}</style>
    </main>
  );
}
