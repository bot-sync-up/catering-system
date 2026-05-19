/**
 * Shared MJML wrapper used by every Hebrew template. Forces RTL direction,
 * sets the brand color band, and includes the unsubscribe footer.
 */
export function layout(opts: { title: string; bodyMjml: string; brandColor?: string }): string {
  const brand = opts.brandColor ?? '#1f6feb';
  return `
<mjml>
  <mj-head>
    <mj-title>${opts.title}</mj-title>
    <mj-attributes>
      <mj-all font-family="Assistant, Arial, sans-serif" />
      <mj-text align="right" line-height="1.6" font-size="15px" color="#222" />
      <mj-button background-color="${brand}" color="#fff" font-size="16px" />
    </mj-attributes>
    <mj-style inline="inline">
      .rtl-body { direction: rtl !important; text-align: right !important; }
    </mj-style>
  </mj-head>
  <mj-body css-class="rtl-body" background-color="#f6f8fa">
    <mj-section background-color="${brand}" padding="24px">
      <mj-column>
        <mj-text align="right" color="#fff" font-size="22px" font-weight="700">{{brandName}}</mj-text>
      </mj-column>
    </mj-section>
    ${opts.bodyMjml}
    <mj-section background-color="#eef1f5" padding="16px">
      <mj-column>
        <mj-text align="right" font-size="12px" color="#666">
          הודעה זו נשלחה אליך מ-{{brandName}}. אם אינך מעוניין לקבל הודעות נוספות,
          <a href="{{unsubscribeUrl}}" style="color:#444">לחץ כאן להסרה</a>.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
}
