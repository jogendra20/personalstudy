"use client";

import { useState, useEffect } from "react";

interface Story {
  id: string;
  label: string;
  emoji: string;
  url?: string;
  isBreaking?: boolean;
  tag?: string;
}

interface StoriesBarProps {
  onFilter: (tag: string | null) => void;
}

const DEFAULT_STORIES: Story[] = [
  { id: "all",            label: "For You",       emoji: "✨" },
  { id: "AI",             label: "AI",             emoji: "🤖", tag: "AI" },
  { id: "Trading",        label: "Trading",        emoji: "📈", tag: "Trading" },
  { id: "DSA",            label: "DSA",            emoji: "🧮", tag: "DSA" },
  { id: "Python",         label: "Python",         emoji: "🐍", tag: "Python" },
  { id: "System Design",  label: "System Design",  emoji: "🏗️", tag: "System Design" },
  { id: "Web Dev",        label: "Web Dev",        emoji: "🌐", tag: "Web Dev" },
  { id: "Security",       label: "Security",       emoji: "🔐", tag: "Security" },
  { id: "Career",         label: "Career",         emoji: "🎯", tag: "Career" },
];

export default function StoriesBar({ onFilter }: StoriesBarProps) {
  const [active, setActive]       = useState("all");
  const [stories, setStories]     = useState<Story[]>(DEFAULT_STORIES);
  const [breaking, setBreaking]   = useState<Story[]>([]);

  // Check for breaking news from ARJUN via Supabase
  useEffect(() => {
    checkBreakingNews();
  }, []);

  async function checkBreakingNews() {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
      if (!supabaseUrl || !supabaseKey) return;

      const res = await fetch(
        `${supabaseUrl}/rest/v1/breaking_news?order=created_at.desc&limit=3`,
        {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (!data.length) return;

      const breakingStories: Story[] = data.map((item: any) => ({
        id: item.id,
        label: item.symbol || "BREAKING",
        emoji: "🔴",
        url: item.url,
        isBreaking: true,
        tag: "Trading",
      }));

      setBreaking(breakingStories);
    } catch {}
  }

  function handleSelect(story: Story) {
    setActive(story.id);
    if (story.url) {
      window.open(story.url, "_blank");
      return;
    }
    onFilter(story.tag || null);
  }

  const allStories = [...breaking, ...stories];

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0,
      zIndex: 100,
      padding: "12px 0 8px",
      background: "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)",
      overflowX: "auto",
      scrollbarWidth: "none",
    }}>
      <div style={{
        display: "flex", gap: "16px",
        padding: "0 16px",
        width: "max-content",
      }}>
        {allStories.map(story => (
          <button
            key={story.id}
            onClick={() => handleSelect(story)}
            style={{
              background: "none", border: "none",
              cursor: "pointer", display: "flex",
              flexDirection: "column", alignItems: "center", gap: "6px",
              padding: "0",
            }}
          >
            {/* Circle */}
            <div style={{
              width: "52px", height: "52px",
              borderRadius: "50%",
              padding: "2px",
              background: active === story.id
                ? "linear-gradient(135deg, #00ff88, #00ccff)"
                : story.isBreaking
                  ? "linear-gradient(135deg, #ff4444, #ff8800)"
                  : "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: active === story.id
                ? "0 0 12px rgba(0,255,136,0.4)"
                : "none",
            }}>
              <div style={{
                width: "46px", height: "46px",
                borderRadius: "50%",
                background: "#1a1a1a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px",
              }}>
                {story.emoji}
              </div>
            </div>

            {/* Label */}
            <span style={{
              color: active === story.id
                ? "#00ff88"
                : story.isBreaking
                  ? "#ff4444"
                  : "rgba(255,255,255,0.6)",
              fontSize: "10px",
              fontFamily: "monospace",
              letterSpacing: "0.03em",
              maxWidth: "52px",
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: active === story.id ? 700 : 400,
            }}>
              {story.label}
            </span>

            {/* Breaking dot */}
            {story.isBreaking && (
              <div style={{
                position: "absolute",
                top: "0", right: "0",
                width: "10px", height: "10px",
                background: "#ff4444",
                borderRadius: "50%",
                border: "2px solid #0a0a0a",
                animation: "pulse 1.5s infinite",
              }} />
            )}
          </button>
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.2); }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
