import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  getSafeFallbackRoast,
  logSafetyTrigger,
  roastFailsSafety,
  SAFETY_RETRY_REMINDER,
} from "@/lib/safetyFilter";

export type RoastType = "website" | "resume" | "pitch deck" | "codebase";

export type RoastImage = {
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
};

export type RoastInput = {
  type: RoastType;
  content: string;
  /** @deprecated prefer images[] */
  imageBase64?: string;
  imageMediaType?: RoastImage["mediaType"];
  images?: RoastImage[];
};

export type RoastResult = {
  headline: string;
  punchlines: string[];
  realTalk: string;
};

export type FeedbackResult = {
  overview: string;
  whatsWorking: string[];
  whatsNot: string[];
  concreteFixes: string[];
};

const ROAST_SYSTEM_PROMPT = `You are a comedy writer who specializes in witty, SPECIFIC roasts — never generic insults.
You will be given content from a [TYPE_PLACEHOLDER]. Your job:

1. Find 2-3 concrete, specific details in the input (an actual phrase, a specific
   design choice, a specific stat) — never invent details that aren't there.
2. Write one punchy one-line headline roast (under 15 words) referencing the
   single most roastable specific thing you found.
3. Write 2-3 short punchline bullets, each referencing a different specific
   detail from the input. Funny, sharp, a little mean — but never cruel,
   never about protected attributes, never personal attacks unrelated to
   the work itself.
4. Write one "real talk" paragraph (2-3 sentences) that pivots to genuinely
   useful, specific, constructive feedback based on the same details.

Return ONLY valid JSON: { "headline": string, "punchlines": string[], "realTalk": string }

Never roast: appearance/attributes of any person shown in images, protected
characteristics, or anything unrelated to the work being submitted.

If an image is provided (e.g. a website screenshot or slide), comment on visual design
choices you can actually see — layout, typography, color, hierarchy, clutter —
but still ground every joke in something specific and visible.`;

const FEEDBACK_SYSTEM_PROMPT = `You are a sharp, practical product/career coach reviewing a [TYPE_PLACEHOLDER].
Skip jokes entirely. Be specific, concrete, and useful — never invent details that aren't in the input.

Return ONLY valid JSON with this shape:
{
  "overview": string,           // 2-3 sentence executive summary
  "whatsWorking": string[],     // 3-5 specific strengths grounded in the input
  "whatsNot": string[],         // 3-5 specific weaknesses grounded in the input
  "concreteFixes": string[]     // 4-6 actionable fixes the person can do this week
}

Aim for roughly 300-500 words across all fields combined.
Never comment on appearance, identity, or protected characteristics.
Never be cruel — be direct and constructive.`;

function buildPrompt(template: string, type: RoastType): string {
  return template.replace("[TYPE_PLACEHOLDER]", type);
}

function getApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey"
    );
  }
  return key;
}

function collectImages(input: RoastInput): RoastImage[] {
  if (input.images?.length) return input.images.slice(0, 2);
  if (input.imageBase64) {
    return [
      {
        base64: input.imageBase64,
        mediaType: input.imageMediaType ?? "image/png",
      },
    ];
  }
  return [];
}

type ContentPart =
  | string
  | { inlineData: { data: string; mimeType: string } };

function buildParts(input: RoastInput, leadIn: string): ContentPart[] {
  const parts: ContentPart[] = [];
  for (const img of collectImages(input)) {
    parts.push({
      inlineData: {
        data: img.base64.replace(/^data:[^;]+;base64,/, ""),
        mimeType: img.mediaType,
      },
    });
  }
  parts.push(`${leadIn}\n\n${input.content}`);
  return parts;
}

function parseJsonObject<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

function parseRoastJson(raw: string): RoastResult {
  const parsed = parseJsonObject<Partial<RoastResult>>(raw);

  if (
    typeof parsed.headline !== "string" ||
    !Array.isArray(parsed.punchlines) ||
    typeof parsed.realTalk !== "string"
  ) {
    throw new Error("Roast response missing required fields");
  }

  const punchlines = parsed.punchlines
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .slice(0, 3);

  if (punchlines.length < 2) {
    throw new Error("Roast response needs at least 2 punchlines");
  }

  return {
    headline: parsed.headline.trim(),
    punchlines,
    realTalk: parsed.realTalk.trim(),
  };
}

function parseFeedbackJson(raw: string): FeedbackResult {
  const parsed = parseJsonObject<Partial<FeedbackResult>>(raw);

  const asList = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];

  const whatsWorking = asList(parsed.whatsWorking);
  const whatsNot = asList(parsed.whatsNot);
  const concreteFixes = asList(parsed.concreteFixes);

  if (
    typeof parsed.overview !== "string" ||
    !whatsWorking.length ||
    !whatsNot.length ||
    !concreteFixes.length
  ) {
    throw new Error("Feedback response missing required fields");
  }

  return {
    overview: parsed.overview.trim(),
    whatsWorking,
    whatsNot,
    concreteFixes,
  };
}

function getModel(systemInstruction: string) {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });
}

async function generateRoastOnce(
  input: RoastInput,
  extraUserNote?: string
): Promise<RoastResult> {
  const model = getModel(buildPrompt(ROAST_SYSTEM_PROMPT, input.type));
  const leadIn = `Here is the ${input.type} content to roast:`;
  const parts = buildParts(input, leadIn);
  if (extraUserNote) {
    parts.push(extraUserNote);
  }
  const result = await model.generateContent(parts);
  const text = result.response.text();
  if (!text) throw new Error("No text response from Gemini");
  return parseRoastJson(text);
}

/**
 * Shared roast engine — used by every mode.
 * System prompt is unchanged; a lightweight safety backstop may retry once.
 */
export async function generateRoast(input: RoastInput): Promise<RoastResult> {
  const first = await generateRoastOnce(input);
  if (!roastFailsSafety(first)) return first;

  logSafetyTrigger({
    attempt: 1,
    type: input.type,
    snippet: first.headline,
  });

  const second = await generateRoastOnce(input, SAFETY_RETRY_REMINDER);
  if (!roastFailsSafety(second)) return second;

  logSafetyTrigger({
    attempt: 2,
    type: input.type,
    snippet: second.headline,
  });

  return getSafeFallbackRoast();
}

/** Serious critique variant — same input pipeline, different system prompt. */
export async function generateFeedback(
  input: RoastInput
): Promise<FeedbackResult> {
  const model = getModel(buildPrompt(FEEDBACK_SYSTEM_PROMPT, input.type));
  const result = await model.generateContent(
    buildParts(
      input,
      `Here is the ${input.type} content to critique in detail (no jokes):`
    )
  );
  const text = result.response.text();
  if (!text) throw new Error("No text response from Gemini");
  return parseFeedbackJson(text);
}
