import { layout } from './_layout';

export const eventReminderTemplate = {
  id: 'eventReminder',
  subject: 'תזכורת: {{eventName}} — {{eventDate}}',
  vars: ['brandName', 'firstName', 'eventName', 'eventDate', 'eventTime', 'eventLocation', 'calendarUrl', 'unsubscribeUrl'],
  text:
    'שלום {{firstName}},\n\n' +
    'תזכורת לאירוע "{{eventName}}":\n' +
    'תאריך: {{eventDate}} בשעה {{eventTime}}\n' +
    'מיקום: {{eventLocation}}\n' +
    'הוספה ליומן: {{calendarUrl}}',
  mjml: layout({
    title: 'תזכורת לאירוע',
    bodyMjml: `
    <mj-section background-color="#fff" padding="32px">
      <mj-column>
        <mj-text font-size="20px" font-weight="700">תזכורת: {{eventName}}</mj-text>
        <mj-text>
          שלום {{firstName}}, רק להזכיר —<br/>
          <strong>תאריך:</strong> {{eventDate}}<br/>
          <strong>שעה:</strong> {{eventTime}}<br/>
          <strong>מיקום:</strong> {{eventLocation}}
        </mj-text>
        <mj-button href="{{calendarUrl}}">הוספה ליומן</mj-button>
      </mj-column>
    </mj-section>`,
  }),
};
