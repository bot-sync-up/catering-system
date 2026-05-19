import { layout } from './_layout';

export const orderConfirmationTemplate = {
  id: 'orderConfirmation',
  subject: 'הזמנה #{{orderNumber}} התקבלה — {{brandName}}',
  vars: [
    'brandName',
    'firstName',
    'orderNumber',
    'orderDate',
    'items', // [{ name, qty, priceFormatted }]
    'subtotalFormatted',
    'taxFormatted',
    'totalFormatted',
    'trackingUrl',
    'unsubscribeUrl',
  ],
  text:
    'שלום {{firstName}},\n\n' +
    'תודה! הזמנה מספר {{orderNumber}} התקבלה בתאריך {{orderDate}}.\n' +
    'סה"כ לתשלום: {{totalFormatted}}\n' +
    'מעקב הזמנה: {{trackingUrl}}',
  mjml: layout({
    title: 'אישור הזמנה',
    bodyMjml: `
    <mj-section background-color="#fff" padding="32px">
      <mj-column>
        <mj-text font-size="20px" font-weight="700">תודה על ההזמנה, {{firstName}}!</mj-text>
        <mj-text>
          קיבלנו את הזמנה מספר <strong>#{{orderNumber}}</strong> בתאריך {{orderDate}}.
        </mj-text>
        <mj-table>
          <tr style="background:#f0f3f7;text-align:right">
            <th style="padding:8px">פריט</th><th>כמות</th><th>מחיר</th>
          </tr>
          {{#each items}}
          <tr style="text-align:right">
            <td style="padding:8px;border-bottom:1px solid #eee">{{this.name}}</td>
            <td style="border-bottom:1px solid #eee">{{this.qty}}</td>
            <td style="border-bottom:1px solid #eee">{{this.priceFormatted}}</td>
          </tr>
          {{/each}}
        </mj-table>
        <mj-text>
          סכום ביניים: {{subtotalFormatted}}<br/>
          מע"מ: {{taxFormatted}}<br/>
          <strong>סה"כ לתשלום: {{totalFormatted}}</strong>
        </mj-text>
        <mj-button href="{{trackingUrl}}">מעקב הזמנה</mj-button>
      </mj-column>
    </mj-section>`,
  }),
};
