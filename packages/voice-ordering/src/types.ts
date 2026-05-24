// טיפוסים משותפים למערכת ההזמנות הקולית

export type Locale = 'he-IL' | 'en-US';

export interface AudioChunk {
  data: Buffer;
  format: 'pcm16' | 'mulaw' | 'mp3' | 'wav';
  sampleRate: number;
  timestamp: number;
}

export interface TranscriptSegment {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
  isFinal: boolean;
  language?: string;
}

export type Intent =
  | 'ORDER_NEW'
  | 'ORDER_STATUS'
  | 'CANCEL'
  | 'COMPLAINT'
  | 'INFO'
  | 'HUMAN_HELP'
  | 'UNKNOWN';

export interface NLUResult {
  intent: Intent;
  confidence: number;
  entities: ExtractedEntities;
  rawText: string;
  needsClarification?: boolean;
  clarificationQuestion?: string;
}

export interface ExtractedEntities {
  customerName?: string;
  customerPhone?: string;
  eventType?: EventType;
  date?: string; // ISO yyyy-mm-dd
  time?: string; // HH:MM
  guestCount?: number;
  menuItems?: string[];
  allergies?: string[];
  location?: string;
  notes?: string;
}

export type EventType =
  | 'wedding'
  | 'bar_mitzvah'
  | 'bat_mitzvah'
  | 'brit'
  | 'engagement'
  | 'sheva_brachot'
  | 'corporate'
  | 'birthday'
  | 'other';

export interface CallContext {
  callSid: string;
  from: string;
  to: string;
  startedAt: Date;
  direction: 'inbound' | 'outbound';
  recordingEnabled: boolean;
  language: Locale;
}

export interface DialogContext {
  callSid: string;
  customerId?: string;
  order: Partial<ExtractedEntities>;
  history: DialogTurn[];
  attempts: Record<string, number>;
}

export interface DialogTurn {
  speaker: 'user' | 'bot';
  text: string;
  timestamp: number;
  intent?: Intent;
}

export interface TTSRequest {
  text: string;
  voice: VoiceProfile;
  ssml?: boolean;
}

export interface VoiceProfile {
  name: string; // 'HilaNeural' | 'AvriNeural' | ...
  gender: 'male' | 'female';
  rate: 'slow' | 'medium' | 'fast';
  style: 'formal' | 'casual' | 'cheerful' | 'empathetic';
  language: Locale;
}

export interface CallScore {
  overall: number; // 0-100
  customerSatisfaction: number;
  taskCompletion: number;
  agentClarity: number;
  notes: string;
  flagsForReview: string[];
}
