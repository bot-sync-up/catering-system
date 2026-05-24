import { layout } from './_layout';

export const paymentReceiptTemplate = {
  id: 'paymentReceipt',
  subject: 'קבלה על תשלום #{{receiptNumber}} — {{brandName}}',
  vars: ['brandName', 'firstName', 'receiptNumber', 'amountFormatted', 'paymentMethod', 'paymentDate', 'pdfUrl', 'unsubscribeUrl'],
  text:
    'שלום {{firstName}},\n\n' +
    'קיבלנו את התשלום על סך {{amountFormatted}} ב-{{paymentDate}} ({{paymentMethod}}).\n' +
    'מספר קבלה: {{receiptNumber}}\n' +
    'להורדת קבלה: {{pdfUrl}}',
  mjml: layout({
    title: 'אישור תשלום',
    bodyMjml: `
    <mj-section background-color="#fff" padding="32px">
      <mj-column>
        <mj-text font-size="20px" font-weight="700">תודה, {{firstName}} — קיבלנו את התשלום!</mj-text>
        <mj-text>
          <strong>סכום:</strong> {{amountFormatted}}<br/>
          <strong>אמצעי תשלום:</strong> {{paymentMethod}}<br/>
          <strong>תאריך:</strong> {{paymentDate}}<br/>
          <strong>מספר קבלה:</strong> {{receiptNumber}}
        </mj-text>
        <mj-button href="{{pdfUrl}}">הורדת קבלה (PDF)</mj-button>
      </mj-column>
    </mj-section>`,
  }),
};
