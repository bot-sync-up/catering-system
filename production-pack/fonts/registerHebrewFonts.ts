/**
 * registerHebrewFonts.ts
 *
 * Registers Hebrew fonts with pdfkit. Does NOT download TTFs — fonts ship with the app under
 * `assets/fonts/` (committed) or are loaded from an S3 path declared in env.
 *
 * Usage:
 *   import PDFDocument from "pdfkit";
 *   import { registerHebrewFonts } from "./registerHebrewFonts";
 *
 *   const doc = new PDFDocument({ size: "A4", layout: "portrait", lang: "he" });
 *   await registerHebrewFonts(doc);
 *   doc.font("Heebo").text("שלום עולם", { features: ["rtla"], align: "right" });
 *
 * Required files (paths configurable via env):
 *   assets/fonts/Heebo-Regular.ttf
 *   assets/fonts/Heebo-Bold.ttf
 *   assets/fonts/Heebo-Light.ttf
 *   assets/fonts/Assistant-Regular.ttf
 *   assets/fonts/Assistant-Bold.ttf
 *   assets/fonts/NotoSansHebrew-Regular.ttf   (fallback for rare glyphs / Nikkud)
 *
 * Why this file exists:
 *   - pdfkit does NOT handle complex script shaping out of the box. With a real Hebrew TTF and
 *     `features: ['rtla']` (RTL alternates), text renders correctly.
 *   - All text rendered RTL must also set `align: 'right'` or pdfkit will left-justify visually.
 *   - For mixed Hebrew + English + numbers, prefer Heebo (covers both scripts cleanly).
 */
import type PDFDocument from "pdfkit";
import { promises as fs } from "node:fs";
import path from "node:path";

export type HebrewFontName =
  | "Heebo"           // primary
  | "Heebo-Bold"
  | "Heebo-Light"
  | "Assistant"       // alt
  | "Assistant-Bold"
  | "NotoSansHebrew"; // fallback / Nikkud

interface FontSpec { name: HebrewFontName; file: string; }

const DEFAULT_DIR = process.env.FONTS_DIR
  || path.resolve(process.cwd(), "assets", "fonts");

const FONTS: FontSpec[] = [
  { name: "Heebo",           file: "Heebo-Regular.ttf" },
  { name: "Heebo-Bold",      file: "Heebo-Bold.ttf" },
  { name: "Heebo-Light",     file: "Heebo-Light.ttf" },
  { name: "Assistant",       file: "Assistant-Regular.ttf" },
  { name: "Assistant-Bold",  file: "Assistant-Bold.ttf" },
  { name: "NotoSansHebrew",  file: "NotoSansHebrew-Regular.ttf" },
];

let buffersCache: Map<HebrewFontName, Buffer> | null = null;

async function loadAll(dir = DEFAULT_DIR): Promise<Map<HebrewFontName, Buffer>> {
  if (buffersCache) return buffersCache;
  const map = new Map<HebrewFontName, Buffer>();
  await Promise.all(FONTS.map(async ({ name, file }) => {
    const full = path.join(dir, file);
    try {
      map.set(name, await fs.readFile(full));
    } catch (err) {
      throw new Error(
        `Hebrew font missing: ${full}. ` +
        `Ship TTFs under assets/fonts/ or set FONTS_DIR. ` +
        `Original error: ${(err as Error).message}`
      );
    }
  }));
  buffersCache = map;
  return map;
}

/**
 * Register all Hebrew fonts with the given pdfkit document.
 * Call once per document before any `doc.font(...)`.
 */
export async function registerHebrewFonts(doc: PDFKit.PDFDocument, dir?: string): Promise<void> {
  const buffers = await loadAll(dir);
  for (const [name, buf] of buffers) {
    doc.registerFont(name, buf);
  }
}

/**
 * Convenience: write an RTL paragraph with the right defaults.
 */
export function rtlText(
  doc: PDFKit.PDFDocument,
  text: string,
  opts: PDFKit.Mixins.TextOptions & { font?: HebrewFontName } = {}
): PDFKit.PDFDocument {
  const { font = "Heebo", ...rest } = opts;
  return doc.font(font).text(text, {
    align: "right",
    features: ["rtla"],
    ...rest,
  });
}

/** Clear the in-memory font cache (useful in tests). */
export function _resetFontCache() { buffersCache = null; }
