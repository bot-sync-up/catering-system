import { layout } from './_layout';

export const monthInvoiceTemplate = {
  id: 'monthInvoice',
  subject: 'חשבונית לחודש {{monthName}} {{year}} — {{brandName}}',
  vars: ['brandName', 'firstName', 'monthName', 'year', 'invoiceNumber', 'totalFormatted', 'dueDate', 'pdfUrl', 'payUrl', 'unsubscribeUrl'],
  text:
    'שלום {{firstName}},\n\n' +
    'מצורפת חשבונית לחודש {{monthName}} {{year}}.\n' +
    'מספר חשבונית: {{invoiceNumber}}\n' +
    'סכום לתשלום: {{totalFormatted}}\n' +
    'תאריך פירעון: {{dueDate}}\n' +
    'PDF: {{pdfUrl}}\n' +
    'תשלום מקוון: {{payUrl}}',
  mjml: layout({
    title: 'חשבונית חודשית',
    bodyMjml: `
    <mj-section background-color="#fff" padding="32px">
      <mj-column>
        <mj-text font-size="20px" font-weight="700">חשבונית לחודש {{monthName}} {{year}}</mj-text>
        <mj-text>
          שלום {{firstName}}, מצורפת החשבונית החודשית.<br/>
          <strong>מספר:</strong> {{invoiceNumber}}<br/>
          <strong>סכום לתשלום:</strong> {{totalFormatted}}<br/>
          <strong>תאריך פירעון:</strong> {{dueDate}}
        </mj-text>
        <mj-button href="{{payUrl}}">תשלום מקוון</mj-button>
        <mj-text align="center" font-size="13px">
          <a href="{{pdfUrl}}">הורדת PDF</a>
        </mj-text>
      </mj-column>
    </mj-section>`,
  }),
};
