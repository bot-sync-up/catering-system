import sharp from 'sharp';

/**
 * Render every page of a PDF buffer to a JPEG image suitable for
 * Claude Vision. We rely on Sharp+libvips' built-in PDF rasterizer
 * (compiled with poppler in standard sharp builds). For environments
 * without poppler, swap in `pdf-to-img` or a PDFium binding.
 *
 * Returns one Buffer per page.
 */
export async function pdfToImages(pdf: Buffer, dpi = 200): Promise<Buffer[]> {
  // sharp pdf input requires `pages: -1` for all pages
  const meta = await sharp(pdf, { density: dpi, pages: -1 }).metadata();
  const pageCount = meta.pages ?? 1;
  const out: Buffer[] = [];
  for (let p = 0; p < pageCount; p++) {
    const buf = await sharp(pdf, { density: dpi, page: p })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    out.push(buf);
  }
  return out;
}
