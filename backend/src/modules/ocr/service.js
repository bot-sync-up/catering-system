/**
 * OCR service — uses tesseract.js with Hebrew+English support.
 * Extracts vendor invoice fields: amount, date, invoice number, tax ID, vendor name (heuristic).
 */
let Tesseract;
try { Tesseract = require('tesseract.js'); } catch (_) { /* optional */ }

async function runOcrOnFile(filePath) {
  if (!Tesseract) {
    return { text: '', warning: 'tesseract.js not installed' };
  }
  const result = await Tesseract.recognize(filePath, 'heb+eng');
  return { text: result.data.text, confidence: result.data.confidence };
}

/**
 * Extract structured fields from OCR text using regex heuristics.
 * Hebrew labels: סכום | סה"כ | מע"מ | חשבונית | ח.פ. | ע.מ. | תאריך
 */
function extractInvoiceFields(text) {
  const out = {};
  if (!text) return out;

  // Total amount: prefer "סה"כ" / "total" / "סכום לתשלום"
  const totalRe = /(?:סה[״"]כ\s*(?:לתשלום)?|total|סכום\s*לתשלום)[^\d]{0,15}(\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d{1,2})?)/i;
  const totalMatch = text.match(totalRe);
  if (totalMatch) out.totalAmount = normalizeNumber(totalMatch[1]);

  // VAT
  const vatRe = /(?:מע[״"]מ|vat)[^\d]{0,12}(\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d{1,2})?)/i;
  const vatMatch = text.match(vatRe);
  if (vatMatch) out.vatAmount = normalizeNumber(vatMatch[1]);

  // Invoice number
  const invRe = /(?:חשבונית|invoice\s*(?:no|#)?|מס[׳']?\s*חשבונית)[^\d]{0,8}([A-Z0-9\-\/]{3,20})/i;
  const invMatch = text.match(invRe);
  if (invMatch) out.invoiceNumber = invMatch[1];

  // Tax ID (Israeli: 8-9 digits often labeled ח.פ. or ע.מ.)
  const taxRe = /(?:ח[.]?פ[.]?|ע[.]?מ[.]?|tax\s*id)[^\d]{0,8}(\d{8,9})/i;
  const taxMatch = text.match(taxRe);
  if (taxMatch) out.taxId = taxMatch[1];

  // Date
  const dateRe = /\b(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})\b/;
  const dateMatch = text.match(dateRe);
  if (dateMatch) out.date = dateMatch[1];

  // Vendor name (heuristic: first non-empty line)
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 2);
  if (firstLine) out.vendorGuess = firstLine.slice(0, 60);

  return out;
}

function normalizeNumber(s) {
  if (!s) return null;
  const cleaned = String(s).replace(/[\s₪]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

module.exports = { runOcrOnFile, extractInvoiceFields };
