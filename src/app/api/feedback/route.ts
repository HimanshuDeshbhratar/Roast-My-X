import { NextRequest, NextResponse } from "next/server";
import { captureEmail } from "@/lib/emailCapture";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { generateFeedback } from "@/lib/roastEngine";
import { getRoastSession } from "@/lib/roastSession";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = checkRateLimit(ip);

  if (!limit.allowed) {
    const retryAfter = Math.ceil((limit.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later.", retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(retryAfter, 1)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  let body: { email?: string; roastId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const roastId = typeof body.roastId === "string" ? body.roastId.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!roastId) {
    return NextResponse.json(
      { error: "Missing roast session. Generate a roast first." },
      { status: 400 }
    );
  }

  const session = getRoastSession(roastId);
  if (!session) {
    return NextResponse.json(
      {
        error:
          "Roast session expired. Generate a new roast, then request feedback again.",
      },
      { status: 410 }
    );
  }

  try {
    await captureEmail(email, `feedback:${session.type}`);

    const feedback = await generateFeedback({
      type: session.type,
      content: session.content,
      images: session.images,
    });

    return NextResponse.json(
      { feedback, meta: { type: session.type, sourceLabel: session.sourceLabel } },
      {
        headers: { "X-RateLimit-Remaining": String(limit.remaining) },
      }
    );
  } catch (err) {
    console.error("Feedback failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate feedback";
    const status = /invalid email/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
