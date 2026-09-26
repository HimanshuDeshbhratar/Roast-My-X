"use client";

import type { FeedbackResult } from "@/lib/roastEngine";

type Props = {
  feedback: FeedbackResult;
};

function Section({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ember)]">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-sm leading-relaxed text-[var(--ink-soft)] before:mr-2 before:text-[var(--ember)] before:content-['•']"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FeedbackPanel({ feedback }: Props) {
  return (
    <div className="w-full max-w-[560px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
      <p className="mb-3 font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ember)]">
        Real feedback
      </p>
      <p className="text-base leading-relaxed text-[var(--ink)]">
        {feedback.overview}
      </p>
      <div className="mt-6 space-y-5 border-t border-[var(--border)] pt-5">
        <Section title="What's working" items={feedback.whatsWorking} />
        <Section title="What's not" items={feedback.whatsNot} />
        <Section title="Concrete fixes" items={feedback.concreteFixes} />
      </div>
    </div>
  );
}
