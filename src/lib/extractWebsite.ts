const MAX_HTML_BYTES = 1.5 * 1024 * 1024; // 1.5MB
const MAX_BODY_WORDS = 800;
const FETCH_TIMEOUT_MS = 15_000;

export type WebsiteExtract = {
  url: string;
  title: string;
  metaDescription: string;
  headings: string[];
  bodyText: string;
  summary: string;
};

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function matchMeta(html: string, names: string[]): string {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>|<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["'][^>]*>`,
      "i"
    );
    const m = html.match(re);
    if (m?.[1] || m?.[2]) return (m[1] || m[2]).trim();
  }
  return "";
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const re = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null && headings.length < 20) {
    const text = stripTags(match[2]);
    if (text && text.length < 200) headings.push(text);
  }
  return headings;
}

function firstNWords(text: string, n: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, n).join(" ");
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("URL is required");

  let withProtocol = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    withProtocol = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are allowed");
  }

  // Block obvious private/local targets
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    throw new Error("Private/local URLs are not allowed");
  }

  return parsed.toString();
}

export async function extractWebsite(url: string): Promise<WebsiteExtract> {
  const normalized = normalizeUrl(url);

  const res = await fetch(normalized, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RoastMyX/1.0; +https://roastmyx.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch website (${res.status})`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (
    contentType &&
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml")
  ) {
    throw new Error("URL did not return HTML");
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Empty response body");
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      reader.cancel().catch(() => undefined);
      break;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total > MAX_HTML_BYTES ? MAX_HTML_BYTES : total);
  let offset = 0;
  for (const chunk of chunks) {
    const slice = chunk.subarray(
      0,
      Math.min(chunk.byteLength, merged.byteLength - offset)
    );
    merged.set(slice, offset);
    offset += slice.byteLength;
    if (offset >= merged.byteLength) break;
  }

  const html = decoder.decode(merged);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]).slice(0, 200) : "";
  const metaDescription = matchMeta(html, [
    "description",
    "og:description",
    "twitter:description",
  ]).slice(0, 500);
  const headings = extractHeadings(html);
  const bodyText = firstNWords(stripTags(html), MAX_BODY_WORDS);

  const summary = [
    `URL: ${normalized}`,
    title ? `Title: ${title}` : null,
    metaDescription ? `Meta description: ${metaDescription}` : null,
    headings.length
      ? `Headings:\n${headings.map((h) => `- ${h}`).join("\n")}`
      : null,
    bodyText ? `Page text (excerpt):\n${bodyText}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    url: normalized,
    title,
    metaDescription,
    headings,
    bodyText,
    summary,
  };
}
