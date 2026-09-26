/**
 * Global roast generation caps (all users, all modes).
 * In-memory — resets on cold start; set GLOBAL_HOURLY_CAP / GLOBAL_DAILY_CAP via env.
 * Swap for Upstash/Vercel KV when you need multi-instance accuracy.
 */

type Counter = { count: number; resetAt: number };

const hourly: Counter = { count: 0, resetAt: 0 };
const daily: Counter = { count: 0, resetAt: 0 };

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function roll(bucket: Counter, windowMs: number, now: number) {
  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
}

export type GlobalCapResult =
  | { allowed: true; hourlyRemaining: number; dailyRemaining: number }
  | { allowed: false; reason: "hourly" | "daily"; resetAt: number };

export function checkGlobalCap(): GlobalCapResult {
  const now = Date.now();
  const hourlyMax = envInt("GLOBAL_HOURLY_CAP", 200);
  const dailyMax = envInt("GLOBAL_DAILY_CAP", 1500);

  roll(hourly, 60 * 60 * 1000, now);
  roll(daily, 24 * 60 * 60 * 1000, now);

  if (hourly.count >= hourlyMax) {
    return { allowed: false, reason: "hourly", resetAt: hourly.resetAt };
  }
  if (daily.count >= dailyMax) {
    return { allowed: false, reason: "daily", resetAt: daily.resetAt };
  }

  hourly.count += 1;
  daily.count += 1;

  return {
    allowed: true,
    hourlyRemaining: hourlyMax - hourly.count,
    dailyRemaining: dailyMax - daily.count,
  };
}

export const GLOBAL_CAP_USER_MESSAGE =
  "We're roasting so hard the oven's full. Try again in a bit.";
