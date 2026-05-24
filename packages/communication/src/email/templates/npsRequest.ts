import { layout } from './_layout';

export const npsRequestTemplate = {
  id: 'npsRequest',
  subject: 'דקה אחת — נשמח לדעת איך הייתה החוויה ב-{{brandName}}',
  vars: ['brandName', 'firstName', 'surveyBaseUrl', 'unsubscribeUrl'],
  text:
    'שלום {{firstName}},\n\n' +
    'נשמח לקבל ציון — באיזו מידה היית ממליץ/ה על {{brandName}} לחבר?\n' +
    'דרג 0 עד 10:\n' +
    '0: {{surveyBaseUrl}}?score=0\n' +
    '10: {{surveyBaseUrl}}?score=10',
  mjml: layout({
    title: 'סקר NPS',
    bodyMjml: `
    <mj-section background-color="#fff" padding="32px">
      <mj-column>
        <mj-text font-size="20px" font-weight="700">איך הייתה החוויה איתנו, {{firstName}}?</mj-text>
        <mj-text>
          באיזו מידה היית ממליץ/ה על {{brandName}} לחבר או קולגה?
          (0 = ממש לא, 10 = בהחלט)
        </mj-text>
        <mj-text align="center" font-size="14px">
          {{#each (range 0 10)}}
          <a href="{{../surveyBaseUrl}}?score={{this}}"
             style="display:inline-block;margin:4px;padding:10px 14px;border:1px solid #ccc;border-radius:6px;text-decoration:none;color:#222">
            {{this}}
          </a>
          {{/each}}
        </mj-text>
      </mj-column>
    </mj-section>`,
  }),
};
