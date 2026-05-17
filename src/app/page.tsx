"use client";

import { useState, useCallback } from "react";
import FeedScroll from "@/components/feed/FeedScroll";
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
  const [xpFlash, setXpFlash] = useState<XPFlash | null>(null);
  const [badges, setBadges]   = useState<BadgeToast[]>([]);

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

  return (
    <main style={{
      position: "relative",
      width: "100%",
      height: "100svh",
      overflow: "hidden",
      background: "#FAF9F5",
    }}>
      <FeedScroll onXP={handleXP} onBadge={handleBadge} />
      <XPBar flash={xpFlash} />

      <div style={{
        position: "fixed", top: "80px", right: "16px",
        zIndex: 200, display: "flex",
        flexDirection: "column", gap: "8px",
      }}>
        {badges.map(badge => (
          <div key={badge.id} style={{
            background: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: "12px",
            padding: "10px 16px",
            animation: "badgeIn 3s ease forwards",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}>
            <p style={{
              color: "#D4AF37", fontSize: "12px",
              fontWeight: 700, margin: 0,
            }}>
              🏆 Badge Unlocked!
            </p>
            <p style={{
              color: "#555", fontSize: "11px",
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
        body { background: #FAF9F5; overflow: hidden; }
      `}</style>
    </main>
  );
}
