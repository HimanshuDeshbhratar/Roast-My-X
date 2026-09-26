import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Disclaimer — Roast My X",
  description: "Terms of use and disclaimer for Roast My X.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="text-sm text-[var(--muted)] transition hover:text-[var(--ink-soft)]"
      >
        ← Back to Roast My X
      </Link>

      <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
        Terms &amp; disclaimer
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Last updated: March 26, 2026</p>

      <div className="mt-8 space-y-6 text-[0.95rem] leading-relaxed text-[var(--ink-soft)]">
        <section>
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
            Entertainment, not advice
          </h2>
          <p>
            Roast My X is an entertainment product. Roasts and feedback are
            AI-generated for fun and inspiration. They are not professional
            legal, career, design, investment, or technical advice. Don&apos;t
            treat them as gospel — treat them as a sharp second opinion.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
            What you may submit
          </h2>
          <p>
            You must only submit content you have the right to submit: your own
            website, resume, pitch deck, or repository, or other publicly
            available content you are allowed to share. Don&apos;t upload other
            people&apos;s private documents or confidential materials.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
            Uploads are not retained
          </h2>
          <p>
            Uploaded files (resumes, decks, etc.) are processed in memory to
            generate a roast and are not retained on our servers after
            processing. We may store emails you voluntarily provide when
            requesting real feedback, so we can contact you and improve the
            product.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
            No warranty / liability
          </h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any
            kind. We are not liable for how generated content is used, shared,
            interpreted, or relied upon — including screenshots posted to social
            media. You are responsible for what you choose to share.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
            Contact / report abuse
          </h2>
          <p>
            Questions or concerns? Email{" "}
            <a
              href="mailto:hello@roastmyx.app"
              className="text-[var(--ember)] underline underline-offset-2"
            >
              hello@roastmyx.app
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
