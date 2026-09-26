const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024; // 4MB

export type ScreenshotResult = {
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp";
};

function bufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

function detectMediaType(
  contentType: string | null,
  fallback: ScreenshotResult["mediaType"] = "image/png"
): ScreenshotResult["mediaType"] {
  if (!contentType) return fallback;
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return "image/jpeg";
  }
  if (contentType.includes("webp")) return "image/webp";
  return "image/png";
}

async function fetchImage(url: string): Promise<ScreenshotResult> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(25_000),
    headers: { "User-Agent": "RoastMyX/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Screenshot fetch failed (${res.status})`);
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_SCREENSHOT_BYTES) {
    throw new Error("Screenshot too large");
  }

  return {
    base64: bufferToBase64(buffer),
    mediaType: detectMediaType(res.headers.get("content-type")),
  };
}

/**
 * Capture a PNG/JPEG of the given URL.
 * Prefers ScreenshotOne if SCREENSHOTONE_ACCESS_KEY is set,
 * then Urlbox if URLBOX_API_KEY is set, else Microlink free tier.
 */
export async function captureScreenshot(targetUrl: string): Promise<ScreenshotResult> {
  const screenshotOneKey = process.env.SCREENSHOTONE_ACCESS_KEY;
  if (screenshotOneKey) {
    const params = new URLSearchParams({
      access_key: screenshotOneKey,
      url: targetUrl,
      viewport_width: "1280",
      viewport_height: "800",
      format: "png",
      block_ads: "true",
      block_cookie_banners: "true",
      delay: "1",
    });
    return fetchImage(`https://api.screenshotone.com/take?${params}`);
  }

  const urlboxKey = process.env.URLBOX_API_KEY;
  if (urlboxKey) {
    const params = new URLSearchParams({
      url: targetUrl,
      width: "1280",
      height: "800",
      format: "png",
      delay: "1000",
    });
    return fetchImage(
      `https://api.urlbox.io/v1/${urlboxKey}/png?${params.toString()}`
    );
  }

  // Microlink free tier — no API key required for light usage
  const microlink = new URL("https://api.microlink.io/");
  microlink.searchParams.set("url", targetUrl);
  microlink.searchParams.set("screenshot", "true");
  microlink.searchParams.set("meta", "false");
  microlink.searchParams.set("embed", "screenshot.url");
  microlink.searchParams.set("viewport.width", "1280");
  microlink.searchParams.set("viewport.height", "800");

  const metaRes = await fetch(microlink.toString(), {
    signal: AbortSignal.timeout(25_000),
    headers: { "User-Agent": "RoastMyX/1.0" },
  });

  if (!metaRes.ok) {
    throw new Error(`Microlink screenshot failed (${metaRes.status})`);
  }

  const meta = (await metaRes.json()) as {
    status?: string;
    data?: { screenshot?: { url?: string } };
  };

  const shotUrl = meta.data?.screenshot?.url;
  if (!shotUrl) {
    throw new Error("Screenshot service returned no image URL");
  }

  return fetchImage(shotUrl);
}
