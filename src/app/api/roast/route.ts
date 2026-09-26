import { NextRequest, NextResponse } from "next/server";
import { extractGithubRepo } from "@/lib/extractGithub";
import { extractPdfText, pagesAsSlideSummary } from "@/lib/extractPdf";
import { extractPptx } from "@/lib/extractPptx";
import { extractWebsite, normalizeUrl } from "@/lib/extractWebsite";
import {
  checkGlobalCap,
  GLOBAL_CAP_USER_MESSAGE,
} from "@/lib/globalCap";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { generateRoast, type RoastType } from "@/lib/roastEngine";
import { saveRoastSession } from "@/lib/roastSession";
import { captureScreenshot } from "@/lib/screenshot";
import { wittyErrorMessage, type RoastMode } from "@/lib/wittyErrors";

export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const MAX_DECK_BYTES = 8 * 1024 * 1024;

type Mode = RoastMode;

function modeToType(mode: Mode): RoastType {
  switch (mode) {
    case "website":
      return "website";
    case "resume":
      return "resume";
    case "pitch":
      return "pitch deck";
    case "code":
      return "codebase";
  }
}

function rateLimited(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    const retryAfter = Math.ceil((limit.resetAt - Date.now()) / 1000);
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "Easy, chef — you've hit the roast limit. Come back in a bit.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(retryAfter, 1)),
            "X-RateLimit-Remaining": "0",
          },
        }
      ),
    };
  }

  const global = checkGlobalCap();
  if (!global.allowed) {
    const retryAfter = Math.ceil((global.resetAt - Date.now()) / 1000);
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: GLOBAL_CAP_USER_MESSAGE, retryAfter },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(retryAfter, 1)),
            "X-Global-Cap": global.reason,
          },
        }
      ),
    };
  }

  return { ok: true as const, limit, ip };
}

async function handleWebsite(url: string) {
  const normalized = normalizeUrl(url);
  const [site, screenshot] = await Promise.all([
    extractWebsite(normalized),
    captureScreenshot(normalized).catch((err: unknown) => {
      console.warn("Screenshot failed, continuing text-only:", err);
      return null;
    }),
  ]);

  if (!site.summary || site.summary.length < 40) {
    throw new Error("Could not extract enough content from that URL");
  }

  const images = screenshot
    ? [{ base64: screenshot.base64, mediaType: screenshot.mediaType }]
    : undefined;

  const content = site.summary.slice(0, 12_000);
  const roast = await generateRoast({
    type: "website",
    content,
    images,
  });

  const roastId = saveRoastSession({
    type: "website",
    content,
    images,
    sourceLabel: site.title || site.url,
  });

  return {
    roast,
    roastId,
    meta: {
      url: site.url,
      title: site.title,
      hasScreenshot: Boolean(screenshot),
    },
  };
}

async function handleResume(file: File) {
  if (file.type && !file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Resume must be a PDF");
  }
  if (file.size > MAX_RESUME_BYTES) {
    throw new Error("PDF too large (max 5MB)");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractPdfText(buffer, { maxBytes: MAX_RESUME_BYTES });
  // Privacy: buffer goes out of scope — never written to disk
  const content = `Resume PDF text:\n\n${extracted.text}`;

  const roast = await generateRoast({ type: "resume", content });
  const roastId = saveRoastSession({
    type: "resume",
    content,
    sourceLabel: file.name,
  });

  return {
    roast,
    roastId,
    meta: { title: file.name, pages: extracted.pageCount },
  };
}

async function handlePitch(file: File) {
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf") || file.type.includes("pdf");
  const isPptx =
    name.endsWith(".pptx") ||
    file.type.includes("presentationml") ||
    file.type.includes("pptx");

  if (!isPdf && !isPptx) {
    throw new Error("Pitch deck must be a PDF or PPTX");
  }
  if (file.size > MAX_DECK_BYTES) {
    throw new Error("File too large (max 8MB)");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (isPptx) {
    const deck = await extractPptx(buffer);
    const content = `Pitch deck (PPTX, ${deck.slideCount} slides):\n\n${deck.text}`;
    const images = deck.images.length ? deck.images : undefined;
    const roast = await generateRoast({
      type: "pitch deck",
      content,
      images,
    });
    const roastId = saveRoastSession({
      type: "pitch deck",
      content,
      images,
      sourceLabel: file.name,
    });
    return {
      roast,
      roastId,
      meta: {
        title: file.name,
        slides: deck.slideCount,
        hasScreenshot: Boolean(images?.length),
      },
    };
  }

  const extracted = await extractPdfText(buffer, { maxBytes: MAX_DECK_BYTES });
  const content = `Pitch deck (PDF, ${extracted.pageCount} pages):\n\n${pagesAsSlideSummary(extracted.pages, "Slide")}`;
  const roast = await generateRoast({ type: "pitch deck", content });
  const roastId = saveRoastSession({
    type: "pitch deck",
    content,
    sourceLabel: file.name,
  });
  return {
    roast,
    roastId,
    meta: { title: file.name, slides: extracted.pageCount },
  };
}

async function handleCode(repo: string) {
  const gh = await extractGithubRepo(repo);
  const content = gh.summary;
  const roast = await generateRoast({ type: "codebase", content });
  const roastId = saveRoastSession({
    type: "codebase",
    content,
    sourceLabel: `${gh.owner}/${gh.repo}`,
  });
  return {
    roast,
    roastId,
    meta: {
      title: `${gh.owner}/${gh.repo}`,
      url: gh.url,
      stars: gh.stars,
      forks: gh.forks,
    },
  };
}

export async function POST(req: NextRequest) {
  const limited = rateLimited(req);
  if (!limited.ok) return limited.response;

  const contentType = req.headers.get("content-type") || "";
  let mode: Mode = "website";

  try {
    let url = "";
    let repo = "";
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const rawMode = String(form.get("mode") || "website");
      if (!["website", "resume", "pitch", "code"].includes(rawMode)) {
        return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
      }
      mode = rawMode as Mode;
      url = String(form.get("url") || "");
      repo = String(form.get("repo") || "");
      const f = form.get("file");
      if (f instanceof File) file = f;
    } else {
      const body = (await req.json()) as {
        mode?: string;
        url?: string;
        repo?: string;
      };
      const rawMode = body.mode || "website";
      if (!["website", "resume", "pitch", "code"].includes(rawMode)) {
        return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
      }
      mode = rawMode as Mode;
      url = body.url || "";
      repo = body.repo || "";
    }

    void modeToType(mode);

    let payload:
      | Awaited<ReturnType<typeof handleWebsite>>
      | Awaited<ReturnType<typeof handleResume>>
      | Awaited<ReturnType<typeof handlePitch>>
      | Awaited<ReturnType<typeof handleCode>>;

    if (mode === "website") {
      if (!url || url.length > 2048) {
        return NextResponse.json(
          {
            error: wittyErrorMessage(
              "website",
              url ? "URL too long" : "URL is required",
              400
            ),
          },
          { status: 400 }
        );
      }
      payload = await handleWebsite(url);
    } else if (mode === "resume") {
      if (!file) {
        return NextResponse.json(
          { error: wittyErrorMessage("resume", "PDF file is required", 400) },
          { status: 400 }
        );
      }
      payload = await handleResume(file);
    } else if (mode === "pitch") {
      if (!file) {
        return NextResponse.json(
          {
            error: wittyErrorMessage(
              "pitch",
              "PDF or PPTX file is required",
              400
            ),
          },
          { status: 400 }
        );
      }
      payload = await handlePitch(file);
    } else {
      if (!repo || repo.length > 512) {
        return NextResponse.json(
          {
            error: wittyErrorMessage(
              "code",
              repo ? "Repo string too long" : "GitHub repo is required",
              400
            ),
          },
          { status: 400 }
        );
      }
      payload = await handleCode(repo);
    }

    return NextResponse.json(payload, {
      headers: {
        "X-RateLimit-Remaining": String(limited.limit.remaining),
      },
    });
  } catch (err) {
    console.error("Roast failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate roast";

    const status =
      /invalid|required|too large|not allowed|private|must be|use owner|browser history/i.test(
        message
      )
        ? 400
        : /not found|enough content|enough text|enough repo/i.test(message)
          ? 422
          : 500;

    return NextResponse.json(
      { error: wittyErrorMessage(mode, message, status) },
      { status }
    );
  }
}
