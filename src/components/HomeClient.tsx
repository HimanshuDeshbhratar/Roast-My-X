"use client";

import { useRef, useState, type FormEvent } from "react";
import { toPng } from "html-to-image";
import FeedbackPanel from "@/components/FeedbackPanel";
import RoastCard from "@/components/RoastCard";
import type { FeedbackResult, RoastResult } from "@/lib/roastEngine";

type Mode = "website" | "resume" | "pitch" | "code";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "website", label: "Website", hint: "Paste a public URL" },
  { id: "resume", label: "Resume", hint: "Upload a PDF (max 5MB)" },
  { id: "pitch", label: "Pitch Deck", hint: "Upload PDF or PPTX (max 8MB)" },
  { id: "code", label: "Code", hint: "GitHub owner/repo or URL" },
];

const LOADING_COPY: Record<Mode, string> = {
  website: "Grabbing a screenshot, reading the page, sharpening the knives…",
  resume: "Reading your resume like a recruiter with trust issues…",
  pitch: "Flipping through slides, circling the buzzwords in red…",
  code: "Judging your README and commit messages…",
};

export default function HomeClient() {
  const [mode, setMode] = useState<Mode>("website");
  const [url, setUrl] = useState("");
  const [repo, setRepo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roast, setRoast] = useState<RoastResult | null>(null);
  const [roastId, setRoastId] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | undefined>();
  const [downloading, setDownloading] = useState(false);

  const [showEmailGate, setShowEmailGate] = useState(false);
  const [email, setEmail] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetOutput() {
    setRoast(null);
    setRoastId(null);
    setFeedback(null);
    setShowEmailGate(false);
    setError(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    resetOutput();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    resetOutput();

    setLoading(true);
    try {
      let res: Response;

      if (mode === "website") {
        const trimmed = url.trim();
        if (!trimmed) throw new Error("Paste a website URL to roast.");
        res = await fetch("/api/roast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "website", url: trimmed }),
        });
      } else if (mode === "code") {
        const trimmed = repo.trim();
        if (!trimmed) throw new Error("Paste a GitHub repo (owner/repo or URL).");
        res = await fetch("/api/roast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "code", repo: trimmed }),
        });
      } else {
        if (!file) {
          throw new Error(
            mode === "resume"
              ? "Choose a resume PDF to upload."
              : "Choose a PDF or PPTX pitch deck."
          );
        }
        const form = new FormData();
        form.set("mode", mode);
        form.set("file", file);
        res = await fetch("/api/roast", { method: "POST", body: form });
      }

      const data = (await res.json()) as {
        error?: string;
        roast?: RoastResult;
        roastId?: string;
        meta?: { url?: string; title?: string };
        retryAfter?: number;
      };

      if (!res.ok) {
        if (res.status === 429) {
          const mins = Math.ceil((data.retryAfter || 3600) / 60);
          throw new Error(
            `You've hit the roast limit (5/hour). Try again in ~${mins} min.`
          );
        }
        throw new Error(data.error || "Roast failed");
      }

      if (!data.roast) throw new Error("No roast returned");

      setRoast(data.roast);
      setRoastId(data.roastId || null);
      setSourceLabel(
        data.meta?.title ||
          data.meta?.url ||
          file?.name ||
          url.trim() ||
          repo.trim()
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!cardRef.current || !roast) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#14110f",
      });
      const link = document.createElement("a");
      link.download = "roast-my-x.png";
      link.href = dataUrl;
      link.click();
    } catch {
      setError("Could not generate image. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  function handleShare() {
    if (!roast) return;
    const site =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://roastmyx.app";
    const text = `${roast.headline}\n\nRoasted by Roast My X → ${site}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function handleFeedbackSubmit(e: FormEvent) {
    e.preventDefault();
    if (!roastId) {
      setError("Generate a roast first, then request feedback.");
      return;
    }
    setFeedbackLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), roastId }),
      });
      const data = (await res.json()) as {
        error?: string;
        feedback?: FeedbackResult;
        retryAfter?: number;
      };
      if (!res.ok) {
        if (res.status === 429) {
          const mins = Math.ceil((data.retryAfter || 3600) / 60);
          throw new Error(`Rate limited. Try again in ~${mins} min.`);
        }
        throw new Error(data.error || "Feedback failed");
      }
      if (!data.feedback) throw new Error("No feedback returned");
      setFeedback(data.feedback);
      setShowEmailGate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setFeedbackLoading(false);
    }
  }

  const activeHint = MODES.find((m) => m.id === mode)?.hint || "";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <header className="mb-10 text-center sm:mb-12">
        <p className="mb-3 font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ember)]">
          Roast My X
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
          Get roasted.
          <br />
          <span className="text-[var(--ink-soft)]">Then get better.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[var(--muted)]">
          Website, resume, pitch deck, or GitHub repo — one engine, a witty
          roast card, and optional real feedback.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Roast mode"
        className="mb-6 flex flex-wrap justify-center gap-2"
      >
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchMode(m.id)}
              className={[
                "rounded-lg px-3.5 py-2 text-sm font-medium transition",
                active
                  ? "bg-[var(--ember)] text-[var(--on-ember)]"
                  : "bg-[var(--chip)] text-[var(--ink-soft)] hover:bg-[var(--chip-hover)]",
              ].join(" ")}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5"
      >
        {mode === "website" ? (
          <>
            <label
              htmlFor="url"
              className="mb-2 block text-sm font-medium text-[var(--ink-soft)]"
            >
              Website URL
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="url"
                type="text"
                inputMode="url"
                autoComplete="url"
                placeholder="https://your-site.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--input)] px-4 py-3 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--ember)]"
              />
              <SubmitButton loading={loading} />
            </div>
          </>
        ) : null}

        {mode === "code" ? (
          <>
            <label
              htmlFor="repo"
              className="mb-2 block text-sm font-medium text-[var(--ink-soft)]"
            >
              GitHub repo
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="repo"
                type="text"
                placeholder="vercel/next.js or https://github.com/…"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--input)] px-4 py-3 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--ember)]"
              />
              <SubmitButton loading={loading} />
            </div>
          </>
        ) : null}

        {mode === "resume" || mode === "pitch" ? (
          <>
            <label
              htmlFor="file"
              className="mb-2 block text-sm font-medium text-[var(--ink-soft)]"
            >
              {mode === "resume" ? "Resume PDF" : "Pitch deck (PDF or PPTX)"}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={fileInputRef}
                id="file"
                type="file"
                accept={mode === "resume" ? "application/pdf,.pdf" : ".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"}
                disabled={loading}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="min-w-0 flex-1 text-sm text-[var(--ink-soft)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--chip)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--ink)] hover:file:bg-[var(--chip-hover)]"
              />
              <SubmitButton loading={loading} />
            </div>
            {file ? (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            ) : null}
          </>
        ) : null}

        <p className="mt-2.5 text-xs text-[var(--muted)]">
          {activeHint}. 5 free roasts per hour. Uploads are processed in memory
          and not retained.
        </p>
      </form>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-10 text-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--ember)] border-t-transparent"
            aria-hidden
          />
          <p className="text-sm text-[var(--muted)]">{LOADING_COPY[mode]}</p>
        </div>
      ) : null}

      {roast && !loading ? (
        <div className="mt-8 flex flex-col items-center gap-4">
          <RoastCard roast={roast} sourceLabel={sourceLabel} cardRef={cardRef} />
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-xl border border-[var(--border)] bg-[var(--chip)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--chip-hover)] disabled:opacity-60"
            >
              {downloading ? "Rendering…" : "Download image"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-[var(--bg)] transition hover:opacity-90"
            >
              Share to X
            </button>
          </div>

          {!feedback ? (
            <div className="mt-2 w-full max-w-[560px]">
              {!showEmailGate ? (
                <button
                  type="button"
                  onClick={() => setShowEmailGate(true)}
                  className="w-full rounded-xl border border-dashed border-[var(--ember)]/50 bg-[var(--real-talk-bg)] px-4 py-3 text-sm font-medium text-[var(--ink-soft)] transition hover:border-[var(--ember)] hover:text-[var(--ink)]"
                >
                  Get the real feedback instead →
                </button>
              ) : (
                <form
                  onSubmit={handleFeedbackSubmit}
                  className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4"
                >
                  <p className="mb-3 text-sm text-[var(--ink-soft)]">
                    Drop your email and we&apos;ll generate a serious, structured
                    critique — no jokes.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="email"
                      required
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={feedbackLoading}
                      className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--input)] px-4 py-3 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--ember)]"
                    />
                    <button
                      type="submit"
                      disabled={feedbackLoading}
                      className="rounded-xl bg-[var(--ember)] px-5 py-3 text-sm font-semibold text-[var(--on-ember)] transition hover:brightness-110 disabled:opacity-70"
                    >
                      {feedbackLoading ? "Writing…" : "Send feedback"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}

          <p className="max-w-sm text-center text-xs text-[var(--muted)]">
            Tip: download the image first, then attach it when you post — X
            intent can&apos;t auto-attach files.
          </p>
        </div>
      ) : null}

      {feedback && !loading ? (
        <div className="mt-6 flex flex-col items-center">
          <FeedbackPanel feedback={feedback} />
        </div>
      ) : null}
    </div>
  );
}

function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="rounded-xl bg-[var(--ember)] px-5 py-3 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--on-ember)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
    >
      {loading ? "Roasting…" : "Roast it"}
    </button>
  );
}
