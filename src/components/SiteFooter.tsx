export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] px-4 py-6 text-center text-xs text-[var(--muted)]">
      <p>
        Built for laughs (and better work).{" "}
        <a
          href="/terms"
          className="underline decoration-[var(--border)] underline-offset-2 transition hover:text-[var(--ink-soft)]"
        >
          Terms &amp; disclaimer
        </a>
      </p>
    </footer>
  );
}
