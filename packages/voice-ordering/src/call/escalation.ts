// מנגנון העברה לנציג אנושי — קריטריונים, מסר חיבור, החזרת טלפון
export interface EscalationCriteria {
  failedAttempts: number;
  detectedAnger?: boolean;
  explicitRequest?: boolean;
  highValueOrder?: boolean;
  outsideBusinessHours?: boolean;
}

export interface EscalationDecision {
  shouldEscalate: boolean;
  reason: string;
  target?: string; // מספר נציג / שלוחה
  handoffMessage: string;
}

export interface EscalationConfig {
  maxFailedAttempts?: number;
  agentNumber: string;
  agentExtension?: string;
}

export function decideEscalation(
  criteria: EscalationCriteria,
  cfg: EscalationConfig
): EscalationDecision {
  if (criteria.explicitRequest) {
    return {
      shouldEscalate: true,
      reason: 'explicit-request',
      target: cfg.agentNumber,
      handoffMessage: 'בסדר גמור, מעביר אותך לנציג עכשיו. רגע אחד בבקשה.',
    };
  }
  if (criteria.detectedAnger) {
    return {
      shouldEscalate: true,
      reason: 'anger-detected',
      target: cfg.agentNumber,
      handoffMessage:
        'אני מבין שזה מתסכל. אני מעביר אותך לנציג בכיר שיוכל לעזור באופן אישי.',
    };
  }
  if (criteria.failedAttempts >= (cfg.maxFailedAttempts ?? 3)) {
    return {
      shouldEscalate: true,
      reason: 'too-many-attempts',
      target: cfg.agentNumber,
      handoffMessage: 'נראה שיש קושי. מעביר אותך לנציג שיסיים את ההזמנה איתך.',
    };
  }
  if (criteria.highValueOrder) {
    return {
      shouldEscalate: true,
      reason: 'high-value',
      target: cfg.agentExtension ?? cfg.agentNumber,
      handoffMessage:
        'בשמחה. כיוון שמדובר באירוע גדול, אעביר אותך למנהל אירועים שיסכם איתך את הפרטים.',
    };
  }
  if (criteria.outsideBusinessHours) {
    return {
      shouldEscalate: false,
      reason: 'after-hours-bot-only',
      handoffMessage: 'הנציגים שלנו זמינים מ-9 בבוקר עד 6 בערב. בינתיים אשמח לעזור.',
    };
  }
  return {
    shouldEscalate: false,
    reason: 'no-trigger',
    handoffMessage: '',
  };
}
