"use client";

import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

// React error boundaries must be class components — there's no hooks
// equivalent for componentDidCatch. This is a safety net: if anything
// anywhere in the feed throws during render, the person sees a
// recoverable screen instead of a blank white page with no way back.
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error("ONYX crashed:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: "" });
    if (typeof window !== "undefined") window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: "100svh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "16px",
          background: "#FAF9F5", padding: "24px", textAlign: "center",
        }}>
          <span style={{ fontSize: "40px" }}>⚠️</span>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "15px", color: "#333", maxWidth: "280px" }}>
            Something went wrong loading the feed.
          </p>
          <p style={{ fontFamily: "monospace", fontSize: "11px", color: "#999", maxWidth: "280px", wordBreak: "break-word" }}>
            {this.state.message}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "10px 24px", borderRadius: "999px", border: "none",
              background: "#111", color: "#fff", fontFamily: "'Inter', sans-serif",
              fontWeight: 600, fontSize: "13px", cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
