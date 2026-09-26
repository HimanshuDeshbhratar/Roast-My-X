"use client";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export type AnalyticsMode = "website" | "resume" | "deck" | "code";

export function toAnalyticsMode(
  mode: "website" | "resume" | "pitch" | "code"
): AnalyticsMode {
  return mode === "pitch" ? "deck" : mode;
}

function gtag(...args: unknown[]) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag(...args);
}

export function trackModeSelected(mode: AnalyticsMode) {
  gtag("event", "mode_selected", { mode });
}

export function trackRoastGenerated(mode: AnalyticsMode, success: boolean) {
  gtag("event", "roast_generated", {
    mode,
    success: success ? "success" : "failure",
  });
}

export function trackShareClicked(
  mode: AnalyticsMode,
  platform: "twitter" | "download"
) {
  gtag("event", "share_clicked", { mode, platform });
}

export function trackRealFeedbackRequested(mode: AnalyticsMode) {
  gtag("event", "real_feedback_requested", { mode });
}
