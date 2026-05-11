/**
 * registerHebrewFonts.ts
 *
 * Helper for pdfkit / @react-pdf/renderer / pdf-lib that loads Heebo + Frank Ruhl Libre
 * and configures RTL-friendly defaults.
 *
 * Usage (pdfkit):
 *   import PDFDocument from "pdfkit";
 *   import { registerHebrewFonts } from "@platform/fonts";
 *   const doc = new PDFDocument({ lang: "he" });
 *   registerHebrewFonts(doc);
 *   doc.font("Heebo").text("שלום עולם", { features: ["rtla"], align: "right" });
 */
import path from "node:path";
import fs from "node:fs";
import type PDFKit from "pdfkit";

const FONT_DIR = process.env.FONT_DIR ?? path.resolve(__dirname, "files");

const FILES = {
  "Heebo":              "Heebo-Regular.ttf",
  "Heebo-Bold":         "Heebo-Bold.ttf",
  "FrankRuhlLibre":     "FrankRuhlLibre-Regular.ttf",
  "FrankRuhlLibre-Bold":"FrankRuhlLibre-Bold.ttf",
} as const;

export function registerHebrewFonts(doc: PDFKit.PDFDocument): void {
  for (const [name, file] of Object.entries(FILES)) {
    const p = path.join(FONT_DIR, file);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing Hebrew font: ${p}. Run deployment/fonts/install.sh`);
    }
    doc.registerFont(name, p);
  }
  // RTL defaults
  (doc as any).options.bidi = true;
  doc.font("Heebo");
}

// Convenience for @react-pdf/renderer
export const REACT_PDF_FONTS = Object.entries(FILES).map(([family, file]) => ({
  family,
  src: path.join(FONT_DIR, file),
}));
