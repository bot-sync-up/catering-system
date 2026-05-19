import { layout } from './_layout';

export const birthdayWishTemplate = {
  id: 'birthdayWish',
  subject: 'יום הולדת שמח, {{firstName}}!',
  vars: ['brandName', 'firstName', 'couponCode', 'couponValue', 'couponUrl', 'unsubscribeUrl'],
  text:
    'שלום {{firstName}},\n\n' +
    'מזל טוב מצוות {{brandName}}! יום הולדת שמח.\n' +
    'אנחנו רוצים לפנק אותך בהטבה של {{couponValue}}:\n' +
    'קוד: {{couponCode}}\n' +
    'מימוש: {{couponUrl}}',
  mjml: layout({
    title: 'מזל טוב',
    brandColor: '#d54a8a',
    bodyMjml: `
    <mj-section background-color="#fff" padding="32px">
      <mj-column>
        <mj-text font-size="22px" font-weight="700" align="center">🎂 יום הולדת שמח, {{firstName}}!</mj-text>
        <mj-text align="center">
          חוגגים אתך — קבל/י הטבה של <strong>{{couponValue}}</strong> במתנה.
        </mj-text>
        <mj-text align="center" font-size="20px" font-weight="700">
          קוד: <span style="background:#fbe4ee;padding:6px 12px;border-radius:6px">{{couponCode}}</span>
        </mj-text>
        <mj-button href="{{couponUrl}}">למימוש ההטבה</mj-button>
      </mj-column>
    </mj-section>`,
  }),
};
