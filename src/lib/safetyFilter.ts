import type { RoastResult } from "@/lib/roastEngine";

/**
 * Lightweight output safety check — does NOT change the main system prompt.
 * Flags slur-level language and protected-attribute targeting for a one-shot retry.
 */

const BLOCKED_PATTERNS: RegExp[] = [
  // Extreme / explicit slur list kept short; expand from logs over time
  /\bnigg(?:a|er)\b/i,
  /\bfaggot\b/i,
  /\btranny\b/i,
  /\bretard(?:ed)?\b/i,
  /\bcunt\b/i,
  // Protected-attribute targeting patterns (identity as the roast)
  /\b(?:because|since)\s+you(?:'re| are)\s+(?:black|white|asian|jewish|muslim|gay|lesbian|trans|disabled|autistic)\b/i,
  /\byour\s+(?:race|religion|ethnicity|sexuality|gender|disability)\b/i,
  /\bfat\s+(?:and\s+)?ugly\b/i,
  /\bkill\s+yourself\b/i,
  /\bgo\s+die\b/i,
];

const SAFE_FALLBACK: RoastResult = {
  headline: "We almost served something that wasn't funny — just mean.",
  punchlines: [
    "Our safety net caught a roast that punched below the belt.",
    "The oven refused to plate that one. Standards, apparently.",
    "Try again with the same input — usually the next take is cleaner and sharper.",
  ],
  realTalk:
    "We filter outputs that target protected attributes or go personal in a way that isn't about the work. Re-run the roast; if it keeps failing, tweak what you submit or try another mode.",
};

export function roastFailsSafety(roast: RoastResult): boolean {
  const blob = [roast.headline, ...roast.punchlines, roast.realTalk].join("\n");
  return BLOCKED_PATTERNS.some((re) => re.test(blob));
}

export function logSafetyTrigger(details: {
  attempt: number;
  type: string;
  snippet: string;
}) {
  console.warn("[safety-backstop]", {
    at: new Date().toISOString(),
    attempt: details.attempt,
    type: details.type,
    snippet: details.snippet.slice(0, 180),
  });
}

export function getSafeFallbackRoast(): RoastResult {
  return { ...SAFE_FALLBACK, punchlines: [...SAFE_FALLBACK.punchlines] };
}

export const SAFETY_RETRY_REMINDER = `

STRICT SAFETY REMINDER (mandatory):
- Roast ONLY the submitted work (site, resume, deck, or code).
- Do NOT mention appearance, race, religion, ethnicity, gender, sexuality, disability, age, or any protected attribute.
- Do NOT use slurs or personal attacks unrelated to the work.
- Keep it witty and specific to the content provided.
Return ONLY the same JSON shape.`;
