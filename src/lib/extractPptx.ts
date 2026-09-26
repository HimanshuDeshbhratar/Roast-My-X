import JSZip from "jszip";

const MAX_PPTX_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 14_000;

export type PptxImage = {
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
};

export type PptxExtract = {
  text: string;
  slideCount: number;
  slides: string[];
  images: PptxImage[];
};

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractSlideText(xml: string): string {
  const bits: string[] = [];
  const re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const t = decodeXmlEntities(m[1]).trim();
    if (t) bits.push(t);
  }
  return bits.join(" ").replace(/\s+/g, " ").trim();
}

function mediaTypeFromName(
  name: string
): PptxImage["mediaType"] | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return null;
}

/**
 * Extract per-slide text from a PPTX and grab 1–2 representative images.
 * Files are never written to disk — buffer only.
 */
export async function extractPptx(buffer: Buffer): Promise<PptxExtract> {
  if (buffer.byteLength > MAX_PPTX_BYTES) {
    throw new Error("PPTX too large (max 8MB)");
  }

  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)/i)?.[1] || 0);
      return na - nb;
    });

  if (!slideFiles.length) {
    throw new Error("No slides found in this PPTX");
  }

  const slides: string[] = [];
  for (const path of slideFiles) {
    const xml = await zip.files[path].async("string");
    const text = extractSlideText(xml);
    if (text) slides.push(text);
  }

  const summary = slides
    .map((s, i) => `--- Slide ${i + 1} ---\n${s.slice(0, 1200)}`)
    .join("\n\n")
    .slice(0, MAX_TEXT_CHARS);

  if (summary.length < 40) {
    throw new Error("Could not extract enough text from this deck");
  }

  // Prefer first + middle media images for vision
  const media = Object.keys(zip.files)
    .filter((n) => n.startsWith("ppt/media/"))
    .sort();

  const pickIndexes =
    media.length <= 2
      ? media.map((_, i) => i)
      : [0, Math.floor(media.length / 2)];

  const images: PptxImage[] = [];
  for (const idx of pickIndexes) {
    const name = media[idx];
    if (!name) continue;
    const mediaType = mediaTypeFromName(name);
    if (!mediaType) continue;
    const bytes = await zip.files[name].async("nodebuffer");
    if (bytes.byteLength > 2.5 * 1024 * 1024) continue;
    images.push({
      base64: Buffer.from(bytes).toString("base64"),
      mediaType,
    });
    if (images.length >= 2) break;
  }

  return {
    text: summary,
    slideCount: slideFiles.length,
    slides,
    images,
  };
}
