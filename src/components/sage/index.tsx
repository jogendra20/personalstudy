"use client";
import { useState, useEffect } from "react";
import { getProfile, computeEmotion, setLastActive, SageEmotion } from "@/lib/sage";
import SageAvatar from "./SageAvatar";
import SagePanel from "./SagePanel";
import SageOnboarding from "./SageOnboarding";

export default function Sage() {
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [emotion, setEmotion] = useState<SageEmotion>("curious");
  const [hasNotif, setHasNotif] = useState(false);

  useEffect(() => {
    const profile = getProfile();
    if (!profile || !profile.setupDone) {
      setShowOnboarding(true);
    } else {
      setEmotion(computeEmotion(profile));
      // Check if proactive message needed
      const lastActive = parseInt(localStorage.getItem("sage_last_active") || "0");
      const idleHours = (Date.now() - lastActive) / (1000 * 60 * 60);
      if (idleHours > 2) setHasNotif(true);
    }
    setReady(true);
    setLastActive();

    // Recompute emotion every 5 min
    const interval = setInterval(() => {
      const p = getProfile();
      if (p) setEmotion(computeEmotion(p));
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!ready) return null;

  return (
    <>
      {showOnboarding && (
        <SageOnboarding onDone={() => { setShowOnboarding(false); setEmotion("happy"); }} />
      )}
      {!showOnboarding && (
        <SageAvatar
          emotion={emotion}
          onClick={() => { setShowPanel(true); setHasNotif(false); }}
          hasNotif={hasNotif}
        />
      )}
      {showPanel && (
        <SagePanel emotion={emotion} onClose={() => setShowPanel(false)} />
      )}
    </>
  );
}