"use client";

type ErrorCardProps = {
  headline: string;
  detail?: string;
  onRetry?: () => void;
};

/** On-brand failure card — same visual family as RoastCard. */
export default function ErrorCard({ headline, detail, onRetry }: ErrorCardProps) {
  return (
    <div
      role="alert"
      className="roast-card relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8"
      style={{ maxWidth: 560 }}
    >
      <div className="mb-5 flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--ember)]"
        />
        <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-[var(--ink)]">
          Roast My X
        </span>
        <span className="ml-auto text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Oven mishap
        </span>
      </div>

      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold leading-snug tracking-tight text-[var(--ink)] sm:text-2xl">
        {headline}
      </h2>

      {detail ? (
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
          {detail}
        </p>
      ) : null}

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-xl bg-[var(--ember)] px-4 py-2.5 text-sm font-semibold text-[var(--on-ember)] transition hover:brightness-110"
        >
          Try again
        </button>
      ) : null}

      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <p className="font-[family-name:var(--font-display)] text-xs font-medium text-[var(--ember)]">
          roastmyx.app
        </p>
      </div>
    </div>
  );
}
