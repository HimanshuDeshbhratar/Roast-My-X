import RoastCard from "@/components/RoastCard";
import type { RoastResult } from "@/lib/roastEngine";

const EXAMPLES: { label: string; roast: RoastResult }[] = [
  {
    label: "vercel/next.js",
    roast: {
      headline:
        "Next.js: shipping canary builds faster than your router can drop Server Actions.",
      punchlines: [
        "The README promises simplicity while the commit log reads like a thriller about caching.",
        "Stars in the six figures, and still someone opened an issue titled 'please document everything'.",
        "Language breakdown says TypeScript, JavaScript, and 'pray the RSC boundary holds'.",
      ],
      realTalk:
        "Lead with one clear mental model in the README before the feature laundry list. Call out the three paths most beginners take, then deep-link the rest — your docs will feel less like a scavenger hunt.",
    },
  },
  {
    label: "example.com",
    roast: {
      headline:
        "Nothing screams peak web design like repeating your only heading twice.",
      punchlines: [
        "You used 'Example Domain' three times on a page with twelve total words.",
        "The 'Learn more' link for a page that contains zero information to learn from.",
        "Default browser styling so bold it almost counts as a design system.",
      ],
      realTalk:
        "If this is a placeholder, replace the looped headings with a real value prop and a single primary CTA. Even temporary pages convert better with hierarchy and one next step.",
    },
  },
];

/** Static showcase — not a live generator. */
export default function ExampleShowcase() {
  return (
    <section className="mb-10 w-full" aria-label="Example roasts">
      <div className="mb-4 text-center">
        <p className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ember)]">
          See an example
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Proof of what you get before you feed the oven.
        </p>
      </div>
      <div className="flex flex-col items-center gap-5 sm:gap-6">
        {EXAMPLES.map((ex) => (
          <div key={ex.label} className="w-full max-w-[560px] opacity-95">
            <RoastCard roast={ex.roast} sourceLabel={ex.label} />
          </div>
        ))}
      </div>
    </section>
  );
}
