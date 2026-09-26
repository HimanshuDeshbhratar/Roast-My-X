export type RoastMode = "website" | "resume" | "pitch" | "code";

/** Map API / thrown errors into roast-voice copy for the UI. */
export function wittyErrorMessage(
  mode: RoastMode,
  raw: string,
  status?: number
): string {
  const msg = raw.toLowerCase();

  if (status === 429 || /rate limit|oven'?s full|global cap/i.test(msg)) {
    if (/oven|global|capacity|so hard/i.test(msg)) {
      return "We're roasting so hard the oven's full. Try again in a bit.";
    }
    return "Easy, chef — you've hit the roast limit. Come back in a bit.";
  }

  if (mode === "website") {
    if (/invalid url|url is required|url too long/i.test(msg)) {
      return "That URL looks half-baked. Paste a full public link and try again.";
    }
    if (
      /private|local|not allowed|failed to fetch|unreachable|timeout|could not extract|did not return html/i.test(
        msg
      )
    ) {
      return "This site's hiding harder than your ex. Try a different URL.";
    }
    return "This site's hiding harder than your ex. Try a different URL.";
  }

  if (mode === "resume") {
    if (/too large|max 5/i.test(msg)) {
      return "That resume's heavier than your job history. Keep it under 5MB.";
    }
    if (/must be a pdf|non-pdf|choose a resume/i.test(msg)) {
      return "PDFs only — Word docs don't get roasted here (yet).";
    }
    if (/corrupt|empty|invalid|enough text|extract/i.test(msg)) {
      return "This PDF's more scrambled than a Monday standup. Try another export.";
    }
    return "This PDF's more scrambled than a Monday standup. Try another export.";
  }

  if (mode === "pitch") {
    if (/too large|max 8/i.test(msg)) {
      return "That deck's carrying more baggage than the ask slide. Max 8MB.";
    }
    if (/must be a pdf or pptx|unsupported|choose a pdf/i.test(msg)) {
      return "PDF or PPTX only — Keynote exports welcome after they grow up.";
    }
    if (/no slides|enough text|extract/i.test(msg)) {
      return "Couldn't find a single slide worth roasting. Re-export and retry.";
    }
    return "Couldn't find a single slide worth roasting. Re-export and retry.";
  }

  // code / github
  if (/private|403|browser history/i.test(msg)) {
    return "That repo's more private than your browser history.";
  }
  if (/not found|404/i.test(msg)) {
    return "GitHub says that repo ghosted us. Check the spelling?";
  }
  if (/rate limit|GITHUB_TOKEN/i.test(msg)) {
    return "GitHub's tired of our questions. Try again shortly.";
  }
  if (/invalid|owner\/repo|required/i.test(msg)) {
    return "Need an owner/repo or a github.com link — not a cryptic incantation.";
  }

  return "The roast got cold. Try once more — if it keeps failing, blame the oven.";
}

/** Client-side file validation before upload. */
export function validateUpload(
  mode: "resume" | "pitch",
  file: File | null
): string | null {
  if (!file) {
    return mode === "resume"
      ? "Choose a resume PDF to upload."
      : "Choose a PDF or PPTX pitch deck.";
  }

  const name = file.name.toLowerCase();
  if (mode === "resume") {
    if (!name.endsWith(".pdf") && file.type && !file.type.includes("pdf")) {
      return "PDFs only — Word docs don't get roasted here (yet).";
    }
    if (file.size > 5 * 1024 * 1024) {
      return "That resume's heavier than your job history. Keep it under 5MB.";
    }
  } else {
    const ok =
      name.endsWith(".pdf") ||
      name.endsWith(".pptx") ||
      file.type.includes("pdf") ||
      file.type.includes("presentation");
    if (!ok) {
      return "PDF or PPTX only — Keynote exports welcome after they grow up.";
    }
    if (file.size > 8 * 1024 * 1024) {
      return "That deck's carrying more baggage than the ask slide. Max 8MB.";
    }
  }
  return null;
}
