"use client";

import type { RefObject } from "react";
import type { RoastResult } from "@/lib/roastEngine";

type RoastCardProps = {
  roast: RoastResult;
  sourceLabel?: string;
  cardRef?: RefObject<HTMLDivElement | null>;
};

export default function RoastCard({
  roast,
  sourceLabel,
  cardRef,
}: RoastCardProps) {
  return (
    <div
      ref={cardRef}
      className="roast-card relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8"
      style={{ maxWidth: 560 }}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--ember)]"
          />
          <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-[var(--ink)]">
            Roast My X
          </span>
        </div>
        {sourceLabel ? (
          <span className="max-w-[55%] truncate text-xs text-[var(--muted)]">
            {sourceLabel}
          </span>
        ) : null}
      </div>

      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold leading-snug tracking-tight text-[var(--ink)] sm:text-2xl">
        {roast.headline}
      </h2>

      <ul className="mt-5 space-y-2.5 border-l-2 border-[var(--ember)] pl-4">
        {roast.punchlines.map((line, i) => (
          <li key={i} className="text-[0.95rem] leading-relaxed text-[var(--ink-soft)]">
            {line}
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl bg-[var(--real-talk-bg)] px-4 py-3.5">
        <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--ember-deep)]">
          Real talk
        </p>
        <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
          {roast.realTalk}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <p className="text-[0.7rem] leading-relaxed text-[var(--muted)]">
          Generated for entertainment. Be kind when you share.
        </p>
        <p className="shrink-0 font-[family-name:var(--font-display)] text-xs font-medium text-[var(--ember)]">
          roastmyx.app
        </p>
      </div>
    </div>
  );
}
