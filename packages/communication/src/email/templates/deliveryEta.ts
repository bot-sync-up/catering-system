import { layout } from './_layout';

export const deliveryEtaTemplate = {
  id: 'deliveryEta',
  subject: 'המשלוח שלך בדרך — צפוי להגיע {{etaWindow}}',
  vars: ['brandName', 'firstName', 'orderNumber', 'etaWindow', 'driverName', 'driverPhone', 'trackingUrl', 'unsubscribeUrl'],
  text:
    'שלום {{firstName}},\n\n' +
    'ההזמנה #{{orderNumber}} בדרך אליך, צפויה להגיע {{etaWindow}}.\n' +
    'שליח: {{driverName}} ({{driverPhone}})\n' +
    'מעקב חי: {{trackingUrl}}',
  mjml: layout({
    title: 'משלוח בדרך',
    bodyMjml: `
    <mj-section background-color="#fff" padding="32px">
      <mj-column>
        <mj-text font-size="20px" font-weight="700">המשלוח שלך בדרך! 📦</mj-text>
        <mj-text>
          שלום {{firstName}}, ההזמנה <strong>#{{orderNumber}}</strong> בדרך אליך —<br/>
          <strong>זמן הגעה משוער:</strong> {{etaWindow}}<br/>
          <strong>שליח:</strong> {{driverName}} · {{driverPhone}}
        </mj-text>
        <mj-button href="{{trackingUrl}}">מעקב חי</mj-button>
      </mj-column>
    </mj-section>`,
  }),
};
