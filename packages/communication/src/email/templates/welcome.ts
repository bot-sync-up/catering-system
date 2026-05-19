import { layout } from './_layout';

export const welcomeTemplate = {
  id: 'welcome',
  subject: 'ברוכים הבאים ל-{{brandName}}, {{firstName}}!',
  vars: ['brandName', 'firstName', 'ctaUrl', 'unsubscribeUrl'],
  text:
    'שלום {{firstName}},\n\n' +
    'ברוכים הבאים ל-{{brandName}}! אנחנו שמחים שהצטרפת.\n' +
    'לכניסה לחשבון: {{ctaUrl}}\n\n' +
    'להסרה מרשימת התפוצה: {{unsubscribeUrl}}',
  mjml: layout({
    title: 'ברוכים הבאים',
    bodyMjml: `
    <mj-section background-color="#fff" padding="32px">
      <mj-column>
        <mj-text font-size="20px" font-weight="700">שלום {{firstName}},</mj-text>
        <mj-text>
          ברוכים הבאים ל-{{brandName}}! אנחנו שמחים שהצטרפת אלינו.
          תוכלו להתחיל לעבוד מיד עם כל הכלים שלנו.
        </mj-text>
        <mj-button href="{{ctaUrl}}">כניסה לחשבון</mj-button>
        <mj-text font-size="13px" color="#666">
          אם יש שאלות — אפשר להשיב למייל הזה. אנחנו כאן.
        </mj-text>
      </mj-column>
    </mj-section>`,
  }),
};
