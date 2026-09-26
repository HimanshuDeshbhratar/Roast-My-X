import { randomUUID } from "crypto";
import type { RoastType } from "@/lib/roastEngine";

export type RoastSession = {
  id: string;
  type: RoastType;
  content: string;
  images?: Array<{
    base64: string;
    mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  }>;
  sourceLabel?: string;
  createdAt: number;
};

const TTL_MS = 60 * 60 * 1000; // 1 hour
const sessions = new Map<string, RoastSession>();

function prune(now = Date.now()) {
  for (const [id, s] of sessions.entries()) {
    if (now - s.createdAt > TTL_MS) sessions.delete(id);
  }
}

export function saveRoastSession(
  data: Omit<RoastSession, "id" | "createdAt">
): string {
  prune();
  const id = randomUUID();
  sessions.set(id, { ...data, id, createdAt: Date.now() });
  return id;
}

export function getRoastSession(id: string): RoastSession | null {
  prune();
  return sessions.get(id) ?? null;
}
