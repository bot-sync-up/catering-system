// @syncup/voice-ordering — מערכת הזמנות קולית בעברית
export * from './types.js';

// Telephony
export { TwilioVoice } from './telephony/TwilioVoice.js';
export type { TwilioConfig } from './telephony/TwilioVoice.js';
export { Ip019Pbx } from './telephony/Ip019Pbx.js';
export type { Ip019Config, Ip019CallEvent } from './telephony/Ip019Pbx.js';
export { createWebhookServer } from './telephony/webhookHandler.js';
export type { WebhookDeps } from './telephony/webhookHandler.js';

// ASR
export { WhisperASR } from './asr/WhisperASR.js';
export type { WhisperConfig } from './asr/WhisperASR.js';
export { postProcessHebrewASR } from './asr/HebrewASRPostProcessor.js';
export { StreamingASR } from './asr/streamingASR.js';
export type { StreamingASRProvider, StreamingASROptions } from './asr/streamingASR.js';

// NLU
export { parseHebrewNumber } from './nlu/HebrewNumberParser.js';
export { parseHebrewDate } from './nlu/HebrewDateParser.js';
export { IntentClassifier } from './nlu/IntentClassifier.js';
export type { IntentClassifierConfig } from './nlu/IntentClassifier.js';
export { EntityExtractor } from './nlu/EntityExtractor.js';
export type { EntityExtractorConfig } from './nlu/EntityExtractor.js';
export { needsClarification } from './nlu/DisambiguationDialog.js';
export type { ClarificationQuestion } from './nlu/DisambiguationDialog.js';

// Dialog
export { orderDialogMachine, startOrderDialog, promptForState } from './dialog/OrderDialog.js';
export type { OrderContext, OrderEvent } from './dialog/OrderDialog.js';
export { statusDialogMachine, startStatusDialog } from './dialog/StatusDialog.js';
export { cancellationDialogMachine, startCancellationDialog } from './dialog/CancellationDialog.js';

// TTS
export { AzureTTSHebrew } from './tts/AzureTTSHebrew.js';
export type { AzureTTSConfig } from './tts/AzureTTSHebrew.js';
export { GoogleTTSHebrew } from './tts/GoogleTTSHebrew.js';
export type { GoogleTTSConfig } from './tts/GoogleTTSHebrew.js';
export { VOICE_PROFILES, profileFor } from './tts/voiceProfiles.js';
export type { VoiceProfileKey } from './tts/voiceProfiles.js';

// Call
export { CallSession } from './call/CallSession.js';
export type { CallSessionDeps } from './call/CallSession.js';
export { TurnTakingDetector } from './call/turnTakingDetector.js';
export type { TurnTakingOptions } from './call/turnTakingDetector.js';
export { decideEscalation } from './call/escalation.js';
export type { EscalationCriteria, EscalationDecision, EscalationConfig } from './call/escalation.js';

// Quality
export { CallRecorder } from './quality/CallRecorder.js';
export type { CallRecorderConfig } from './quality/CallRecorder.js';
export { CallScoring } from './quality/CallScoring.js';
export type { CallScoringConfig } from './quality/CallScoring.js';
export { disclosureText, HEBREW_DISCLOSURE } from './quality/recordingDisclosure.js';
export type { DisclosureConfig } from './quality/recordingDisclosure.js';

// IVR
export { MenuBuilder, DEFAULT_MAIN_MENU } from './ivr/MenuBuilder.js';
export type { IvrMenu, MenuItem } from './ivr/MenuBuilder.js';
export { buildTransferTwiML } from './ivr/transferToAgent.js';
export type { TransferOptions } from './ivr/transferToAgent.js';

// Outbound
export { EventReminderCall, buildReminderScript } from './outbound/EventReminderCall.js';
export type { ReminderPayload } from './outbound/EventReminderCall.js';
export { PaymentReminderCall, buildPaymentScript } from './outbound/PaymentReminderCall.js';
export type { PaymentReminderPayload } from './outbound/PaymentReminderCall.js';
export { SurveyCall, buildSurveyScript, classifyNPS } from './outbound/SurveyCall.js';
export type { SurveyPayload, NPSResponse } from './outbound/SurveyCall.js';
