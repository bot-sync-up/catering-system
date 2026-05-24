/**
 * watermark.ts
 *
 * Injects a "DEMO MODE" watermark across every page of a demo tenant.
 * Server returns the config; client renders an overlay component.
 *
 * Goal: prospects can never confuse the demo with production.
 */

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  text_secondary?: string;
  position: "top-right" | "top-left" | "top-center" | "footer-banner";
  color: string;
  background: string;
  opacity: number;
  z_index: number;
  show_countdown: boolean;
  delete_at?: string; // ISO timestamp
}

export const DEFAULT_WATERMARK: WatermarkConfig = {
  enabled: true,
  text: "DEMO MODE",
  text_secondary: "סביבת הדגמה — נמחקת אוטומטית",
  position: "top-right",
  color: "#FFD23F",
  background: "rgba(15, 27, 45, 0.92)",
  opacity: 0.95,
  z_index: 2147483646,
  show_countdown: true,
};

/**
 * Compute the time remaining until tenant deletion, in human Hebrew.
 */
export function countdownText(deleteAt: Date, now: Date = new Date()): string {
  const ms = deleteAt.getTime() - now.getTime();
  if (ms <= 0) return "פג תוקף";

  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);

  if (days >= 1) return `נמחק בעוד ${days} ימים`;
  if (hours >= 1) return `נמחק בעוד ${hours} שעות`;

  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `נמחק בעוד ${minutes} דקות`;
}

/**
 * HTML snippet injected into every server-rendered page via response transformer.
 */
export function watermarkHtml(cfg: WatermarkConfig): string {
  if (!cfg.enabled) return "";

  const countdown =
    cfg.show_countdown && cfg.delete_at
      ? `<div class="watermark-countdown">${countdownText(new Date(cfg.delete_at))}</div>`
      : "";

  return `
<div id="syncup-demo-watermark" dir="rtl"
  style="position:fixed;${positionCss(cfg.position)};
  background:${cfg.background};color:${cfg.color};
  padding:8px 14px;border-radius:8px;font-weight:700;
  font-family:'Heebo',sans-serif;font-size:13px;
  z-index:${cfg.z_index};opacity:${cfg.opacity};
  pointer-events:none;user-select:none;
  box-shadow:0 2px 12px rgba(0,0,0,0.25);">
  <div>${cfg.text}</div>
  ${cfg.text_secondary ? `<div style="font-size:11px;font-weight:400;margin-top:2px;">${cfg.text_secondary}</div>` : ""}
  ${countdown}
</div>`;
}

function positionCss(position: WatermarkConfig["position"]): string {
  switch (position) {
    case "top-right":
      return "top:16px;right:16px;";
    case "top-left":
      return "top:16px;left:16px;";
    case "top-center":
      return "top:16px;left:50%;transform:translateX(-50%);";
    case "footer-banner":
      return "bottom:0;left:0;right:0;border-radius:0;text-align:center;";
  }
}

/**
 * Watermark for PDF exports (invoices, receipts) — diagonal grey across page.
 */
export function pdfWatermarkSpec(): {
  text: string;
  angle: number;
  opacity: number;
  font_size: number;
} {
  return {
    text: "DEMO — סביבת הדגמה — אסור לשימוש בפועל",
    angle: -35,
    opacity: 0.15,
    font_size: 64,
  };
}

/**
 * Watermark for emails sent from demo tenant — prepended banner.
 */
export function emailBanner(): string {
  return `
<div style="background:#FFD23F;color:#0F1B2D;padding:12px 16px;
  font-family:Arial,sans-serif;font-size:13px;text-align:center;direction:rtl;">
  <strong>הודעה זו נשלחה מסביבת הדגמה של Sync Up.</strong>
  אין לפעול לפיה. סביבה זו נמחקת אוטומטית בתום תקופת הניסיון.
</div>`;
}
