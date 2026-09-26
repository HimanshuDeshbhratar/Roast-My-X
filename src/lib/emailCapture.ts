import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type EmailCapture = {
  email: string;
  source?: string;
  createdAt: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * Free MVP email capture: append to data/emails.json.
 * On Vercel the filesystem is ephemeral — still fine for smoke tests;
 * swap for Supabase/Resend later via env.
 */
export async function captureEmail(
  email: string,
  source = "real-feedback"
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) {
    throw new Error("Invalid email address");
  }

  const entry: EmailCapture = {
    email: normalized,
    source,
    createdAt: new Date().toISOString(),
  };

  // Optional free webhook (Zapier/Make/n8n/Google Apps Script)
  const webhook = process.env.EMAIL_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(8_000),
    }).catch((err) => console.warn("Email webhook failed:", err));
  }

  try {
    const dir = path.join(process.cwd(), "data");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, "emails.json");
    let list: EmailCapture[] = [];
    try {
      const raw = await readFile(file, "utf8");
      list = JSON.parse(raw) as EmailCapture[];
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }
    if (!list.some((e) => e.email === normalized)) {
      list.push(entry);
      await writeFile(file, JSON.stringify(list, null, 2), "utf8");
    }
  } catch (err) {
    console.warn("Could not persist email to disk:", err);
  }
}
