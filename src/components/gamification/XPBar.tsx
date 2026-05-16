"use client";

import { useState, useEffect } from "react";
import {
  loadGameProfile,
  getLevelName,
  xpToNextLevel,
  getDailyQuest,
} from "@/lib/gamification";

interface XPBarProps {
  flash?: { amount: number; reason: string } | null;
}

export default function XPBar({ flash }: XPBarProps) {
  const [profile, setProfile] = useState(loadGameProfile());
  const [showFlash, setShowFlash] = useState(false);
  const [showQuest, setShowQuest] = useState(false);
  const quest = getDailyQuest();
  const { percent } = xpToNextLevel(profile.xp);

  useEffect(() => {
    setProfile(loadGameProfile());
  }, [flash]);

  useEffect(() => {
    if (flash) {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 2000);
    }
  }, [flash]);

  const levelName = getLevelName(profile.level);

  return (
    <>
      {/* XP Bar — fixed bottom */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 100,
        background: "linear-gradient(to top, rgba(0,0,0,0.95), transparent)",
        padding: "16px 20px 20px",
      }}>
        {/* XP Flash */}
        {showFlash && flash && (
          <div style={{
            textAlign: "center",
            marginBottom: "8px",
            animation: "flashUp 2s ease forwards",
          }}>
            <span style={{
              color: "#00ff88",
              fontFamily: "monospace",
              fontSize: "14px",
              fontWeight: 700,
              textShadow: "0 0 10px rgba(0,255,136,0.8)",
            }}>
              +{flash.amount} XP — {flash.reason}
            </span>
          </div>
        )}

        {/* Level + streak row */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "6px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              background: "linear-gradient(135deg, #00ff88, #00ccff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "13px",
            }}>
              Lv.{profile.level} {levelName}
            </span>
            <span style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "11px",
              fontFamily: "monospace",
            }}>
              {profile.xp} XP
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Streak */}
            {profile.streak > 0 && (
              <span style={{
                color: profile.streak >= 7 ? "#ff8800" : "#ffdd44",
                fontSize: "13px",
                fontFamily: "monospace",
                fontWeight: 700,
              }}>
                🔥 {profile.streak}d
              </span>
            )}

            {/* Daily quest button */}
            <button
              onClick={() => setShowQuest(!showQuest)}
              style={{
                background: quest.done
                  ? "rgba(0,255,136,0.15)"
                  : "rgba(255,255,255,0.08)",
                border: `1px solid ${quest.done ? "#00ff88" : "rgba(255,255,255,0.15)"}`,
                borderRadius: "20px",
                padding: "3px 10px",
                cursor: "pointer",
                color: quest.done ? "#00ff88" : "rgba(255,255,255,0.6)",
                fontSize: "11px",
                fontFamily: "monospace",
              }}
            >
              {quest.done ? "✅ Quest" : "🎯 Quest"}
            </button>
          </div>
        </div>

        {/* XP progress bar */}
        <div style={{
          height: "4px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "2px",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${percent}%`,
            background: "linear-gradient(90deg, #00ff88, #00ccff)",
            borderRadius: "2px",
            transition: "width 0.5s ease",
            boxShadow: "0 0 8px rgba(0,255,136,0.6)",
          }} />
        </div>

        {/* Daily Quest panel */}
        {showQuest && (
          <div style={{
            marginTop: "12px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            padding: "12px 16px",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "8px",
            }}>
              <span style={{
                color: "#fff", fontFamily: "monospace",
                fontSize: "12px", fontWeight: 700,
              }}>
                🎯 Daily Quest
              </span>
              <span style={{
                color: "#ffdd44", fontFamily: "monospace", fontSize: "11px",
              }}>
                +{quest.xpReward} XP
              </span>
            </div>
            <p style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "12px", marginBottom: "10px",
              fontFamily: "monospace",
            }}>
              {quest.description}
            </p>
            {/* Quest progress bar */}
            <div style={{
              height: "6px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "3px", overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${Math.min((quest.progress / quest.target) * 100, 100)}%`,
                background: quest.done
                  ? "#00ff88"
                  : "linear-gradient(90deg, #ffdd44, #ff8800)",
                borderRadius: "3px",
                transition: "width 0.4s ease",
              }} />
            </div>
            <p style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "10px", marginTop: "6px",
              fontFamily: "monospace", textAlign: "right",
            }}>
              {quest.progress}/{quest.target} {quest.done ? "— Complete! 🎉" : ""}
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes flashUp {
          0%   { opacity: 0; transform: translateY(10px); }
          20%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </>
  );
}
