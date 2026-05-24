/**
 * Registers Hebrew fonts with PDFKit for proper RTL rendering.
 *
 * NOTE: TTF files are NOT committed to the repo (disk-saving).
 * The build pipeline / runtime must download them on first use, or mount
 * them from a shared volume. Set FONT_DIR env var to override.
 *
 * Expected font files (place under FONT_DIR):
 *   - OpenSansHebrew-Regular.ttf
 *   - OpenSansHebrew-Bold.ttf
 *   - OpenSansHebrew-Italic.ttf
 *   - DavidLibre-Regular.ttf      (for halachic/religious text)
 *   - DavidLibre-Bold.ttf
 *   - FrankRuhlLibre-Regular.ttf  (newspaper style)
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type PDFDocument from "pdfkit";

export interface FontEntry {
  alias: string;
  filename: string;
  fallback?: string;
}

export const HEBREW_FONTS: FontEntry[] = [
  { alias: "Hebrew",         filename: "OpenSansHebrew-Regular.ttf" },
  { alias: "Hebrew-Bold",    filename: "OpenSansHebrew-Bold.ttf" },
  { alias: "Hebrew-Italic",  filename: "OpenSansHebrew-Italic.ttf" },
  { alias: "Hebrew-Serif",   filename: "DavidLibre-Regular.ttf",     fallback: "Hebrew" },
  { alias: "Hebrew-Serif-B", filename: "DavidLibre-Bold.ttf",        fallback: "Hebrew-Bold" },
  { alias: "Hebrew-News",    filename: "FrankRuhlLibre-Regular.ttf", fallback: "Hebrew-Serif" },
];

export interface RegisterOptions {
  /** directory containing the .ttf files (defaults to env FONT_DIR or ./fonts) */
  fontDir?: string;
  /** throw on missing font file; default: warn and skip */
  strict?: boolean;
}

export function registerHebrewFonts(
  doc: PDFKit.PDFDocument,
  opts: RegisterOptions = {}
): { registered: string[]; missing: string[] } {
  const fontDir = opts.fontDir ?? process.env.FONT_DIR ?? join(process.cwd(), "fonts");
  const registered: string[] = [];
  const missing: string[] = [];

  for (const entry of HEBREW_FONTS) {
    const path = join(fontDir, entry.filename);
    if (!existsSync(path)) {
      missing.push(entry.filename);
      if (opts.strict) {
        throw new Error(`Hebrew font missing: ${path}`);
      }
      continue;
    }
    doc.registerFont(entry.alias, path);
    registered.push(entry.alias);
  }

  // Set Hebrew as default if it loaded
  if (registered.includes("Hebrew")) {
    doc.font("Hebrew");
  }

  return { registered, missing };
}

/**
 * Convenience: write a single line of Hebrew with proper RTL alignment.
 * PDFKit ≥0.14 handles bidi internally when `features: ['rtla']` is set.
 */
export function writeHebrewLine(
  doc: PDFKit.PDFDocument,
  text: string,
  options: PDFKit.Mixins.TextOptions = {}
): void {
  doc.text(text, {
    align: "right",
    features: ["rtla", "rlig"],
    ...options,
  });
}
