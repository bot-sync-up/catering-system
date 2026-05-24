# @syncup/voice-ordering

מערכת הזמנות קולית בעברית — חבילת TypeScript מודולרית למוקדי שירות, אולמי אירועים, וקייטרינג.

תומכת בטלפוניה (Twilio + מרכזיות ישראליות), זיהוי דיבור בעברית (Whisper),
חילוץ ישויות וכוונות עם Claude, מכונות מצבים דיאלוגיות (XState), TTS איכותי
(Azure/Google) והפעלה דרך widget באתר.

## מודולים

### Telephony — `src/telephony/`
- `TwilioVoice` — אינטגרציה מלאה ל-Twilio Voice API עם בניית TwiML.
- `Ip019Pbx` — אינטגרציה ל-IPSALES / מרכזיות IP019 ישראליות (REST + webhook).
- `webhookHandler` — Fastify server מאוחד לשני הספקים.

### ASR — `src/asr/`
- `WhisperASR` — OpenAI Whisper בעברית עם prompt דומיין.
- `HebrewASRPostProcessor` — נורמליזציה של מספרים ותאריכים, הסרת fillers.
- `streamingASR` — wrapper עם VAD מובנה ל-providers שונים.

### NLU עברית — `src/nlu/`
- `IntentClassifier` — סיווג ל-7 כוונות (ORDER_NEW, ORDER_STATUS, CANCEL...).
- `EntityExtractor` — חילוץ שם, סוג אירוע, תאריך, מספר אורחים, תפריט, אלרגיות, מיקום.
- `HebrewNumberParser` — "שלוש מאות חמישים" → 350.
- `HebrewDateParser` — "מחר", "בשבת הבאה", "בעוד שבועיים".
- `DisambiguationDialog` — מזהה עמימות ומציע שאלות הבהרה.

### Dialog — `src/dialog/`
מבוסס XState v5:
- `OrderDialog` — ברכה → זיהוי → סוג אירוע → תאריך → אורחים → תפריט → אישור → תשלום → פרידה.
- `StatusDialog` — בירור סטטוס הזמנה קיימת.
- `CancellationDialog` — ביטול עם בדיקת מדיניות החזר.

### TTS — `src/tts/`
- `AzureTTSHebrew` — קולות HilaNeural / AvriNeural עם SSML.
- `GoogleTTSHebrew` — fallback ל-Wavenet.
- `voiceProfiles` — formal/casual/cheerful/empathetic, slow/medium/fast.

### Call orchestration — `src/call/`
- `CallSession` — מארגן ASR + NLU + Dialog + TTS לזרימה אחת.
- `turnTakingDetector` — VAD פשוט לזיהוי גבולות תור.
- `escalation` — קריטריונים להעברה לנציג אנושי.

### Quality — `src/quality/`
- `CallRecorder` — שמירת MP3 + transcript JSON.
- `CallScoring` — ניקוד שיחה עם Claude (האם הלקוח היה מרוצה?).
- `recordingDisclosure` — גילוי נאות עברי לחוק הגנת הפרטיות.

### IVR — `src/ivr/`
- `MenuBuilder` — תפריטי DTMF כ-fallback.
- `transferToAgent` — TwiML להעברה.

### Outbound — `src/outbound/`
- `EventReminderCall` — תזכורת לאירוע.
- `PaymentReminderCall` — תזכורת תשלום.
- `SurveyCall` — סקר NPS אחרי האירוע.

### Web Voice Widget — `src/widget/`
- `audioRecorder` — לקוח WebRTC + WebSocket.
- `VoiceWidget.tsx` — רכיב React עם RTL מובנה.

## התקנה

```bash
npm install
npm test
```

## דוגמת שימוש מהירה

```ts
import {
  TwilioVoice,
  WhisperASR,
  IntentClassifier,
  EntityExtractor,
  AzureTTSHebrew,
  CallSession,
} from '@syncup/voice-ordering';

const session = new CallSession(callCtx, {
  asr: new WhisperASR({ apiKey: process.env.OPENAI_API_KEY! }),
  intent: new IntentClassifier({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  entities: new EntityExtractor({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  ttsPrimary: new AzureTTSHebrew({
    subscriptionKey: process.env.AZURE_SPEECH_KEY!,
    region: 'westeurope',
  }),
  escalation: { agentNumber: '+972500000000', maxFailedAttempts: 3 },
});

await session.start();
```

ראה גם:
- [VOICE-PROMPTS.md](docs/VOICE-PROMPTS.md) — מבנה הפרומפטים בעברית.
- [TELEPHONY-SETUP.md](docs/TELEPHONY-SETUP.md) — הגדרת Twilio / IPSALES.
- [docs/samples/](docs/samples/) — תמלילי שיחה לדוגמה.
