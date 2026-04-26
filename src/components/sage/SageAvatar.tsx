"use client";
import { SageEmotion } from "@/lib/sage";

const EMOTION_CONFIG: Record<SageEmotion, { bg: string; glow: string; animation: string; eyes: string }> = {
  curious:   { bg: "#6366f1", glow: "rgba(99,102,241,0.5)",  animation: "sageLook 2s ease infinite",    eyes: "👀" },
  happy:     { bg: "#22c55e", glow: "rgba(34,197,94,0.5)",   animation: "sagePulse 1.5s ease infinite",  eyes: "😊" },
  focused:   { bg: "#0ea5e9", glow: "rgba(14,165,233,0.5)",  animation: "sageBreath 3s ease infinite",   eyes: "🎯" },
  concerned: { bg: "#f59e0b", glow: "rgba(245,158,11,0.5)",  animation: "sageDim 2s ease infinite",      eyes: "😟" },
  motivated: { bg: "#ec4899", glow: "rgba(236,72,153,0.5)",  animation: "sageBounce 0.8s ease infinite", eyes: "⚡" },
  waiting:   { bg: "#8b5cf6", glow: "rgba(139,92,246,0.4)",  animation: "sageFloat 3s ease infinite",    eyes: "💭" },
  dormant:   { bg: "#374151", glow: "rgba(55,65,81,0.3)",    animation: "sageBreath 5s ease infinite",   eyes: "😴" },
};

export default function SageAvatar({ emotion, onClick, hasNotif }: {
  emotion: SageEmotion; onClick: () => void; hasNotif?: boolean;
}) {
  const cfg = EMOTION_CONFIG[emotion];
  return (
    <>
      <style>{`
        @keyframes sagePulse  { 0%,100%{transform:scale(1)}   50%{transform:scale(1.08)} }
        @keyframes sageBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes sageFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes sageBreath { 0%,100%{opacity:1} 50%{opacity:0.7} }
        @keyframes sageDim    { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes sageLook   { 0%,100%{transform:translateX(0)} 40%{transform:translateX(2px)} 60%{transform:translateX(-2px)} }
        @keyframes sageRing   { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.8);opacity:0} }
      `}</style>
      <div
        onClick={onClick}
        style={{
          position: "fixed", bottom: "24px", right: "20px", zIndex: 300,
          width: "52px", height: "52px",
          background: cfg.bg,
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "22px",
          cursor: "pointer",
          boxShadow: `0 4px 20px ${cfg.glow}, 0 2px 8px rgba(0,0,0,0.2)`,
          animation: cfg.animation,
          userSelect: "none",
          transition: "background 0.5s ease",
        }}
      >
        {cfg.eyes}
        {hasNotif && (
          <div style={{
            position: "absolute", top: "1px", right: "1px",
            width: "12px", height: "12px",
            background: "#ef4444", borderRadius: "50%",
            border: "2px solid #fff",
          }} />
        )}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: `2px solid ${cfg.bg}`,
          animation: "sageRing 2s ease infinite",
        }} />
      </div>
    </>
  );
}