import { extractText, getDocumentProxy } from "unpdf";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 14_000;

export type PdfExtract = {
  text: string;
  pageCount: number;
  pages: string[];
};

export async function extractPdfText(
  buffer: Buffer,
  options?: { maxBytes?: number }
): Promise<PdfExtract> {
  const maxBytes = options?.maxBytes ?? MAX_PDF_BYTES;
  if (buffer.byteLength > maxBytes) {
    throw new Error(`PDF too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)`);
  }
  if (buffer.byteLength < 100) {
    throw new Error("File is empty or invalid");
  }

  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text, totalPages } = await extractText(pdf, { mergePages: false });

  const pages = (Array.isArray(text) ? text : [text])
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const joined = pages.join("\n\n").slice(0, MAX_TEXT_CHARS);
  if (joined.length < 40) {
    throw new Error("Could not extract enough text from this PDF");
  }

  return {
    text: joined,
    pageCount: totalPages,
    pages,
  };
}

export function pagesAsSlideSummary(pages: string[], label = "Page"): string {
  return pages
    .slice(0, 40)
    .map((p, i) => `--- ${label} ${i + 1} ---\n${p.slice(0, 1200)}`)
    .join("\n\n")
    .slice(0, MAX_TEXT_CHARS);
}
