// אינטגרציה עם מרכזיות ישראליות (IP019 / IPSALES) — REST + Module API webhook
// בהתבסס על reference_ipsales.md: ללא Media Streams, רק בקרת שיחות + DTMF
import { request } from 'node:https';

export interface Ip019Config {
  baseUrl: string; // לדוגמה https://app.ipsales.co.il
  tenant: string;
  apiKey: string;
}

export interface Ip019CallEvent {
  callId: string;
  event: 'ringing' | 'answered' | 'dtmf' | 'hangup';
  from: string;
  to: string;
  dtmf?: string;
}

export class Ip019Pbx {
  constructor(private cfg: Ip019Config) {}

  /** ניתוב שיחה לתסריט / יעד פנימי */
  async routeCall(callId: string, target: string): Promise<void> {
    await this.post(`/api/v1/calls/${callId}/route`, { target });
  }

  /** הפעלת אודיו מוקלט מראש (תפריט IVR בעברית) */
  async playPrompt(callId: string, audioUrl: string): Promise<void> {
    await this.post(`/api/v1/calls/${callId}/play`, { url: audioUrl });
  }

  /** העברה לשלוחה / נציג */
  async transfer(callId: string, extension: string): Promise<void> {
    await this.post(`/api/v1/calls/${callId}/transfer`, { extension });
  }

  async hangup(callId: string): Promise<void> {
    await this.post(`/api/v1/calls/${callId}/hangup`, {});
  }

  /** ממיר את ה-webhook של המרכזייה למבנה אחיד */
  parseWebhook(body: Record<string, unknown>): Ip019CallEvent {
    return {
      callId: String(body.call_id ?? body.CallId ?? ''),
      event: (body.event as Ip019CallEvent['event']) ?? 'ringing',
      from: String(body.from ?? ''),
      to: String(body.to ?? ''),
      dtmf: body.dtmf ? String(body.dtmf) : undefined,
    };
  }

  private post(path: string, body: unknown): Promise<void> {
    const url = new URL(path, this.cfg.baseUrl);
    const payload = JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = request(
        {
          method: 'POST',
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname + url.search,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'X-Tenant': this.cfg.tenant,
            'X-Api-Key': this.cfg.apiKey,
          },
        },
        (res) => {
          res.resume();
          res.on('end', () =>
            res.statusCode && res.statusCode < 400
              ? resolve()
              : reject(new Error(`IP019 ${res.statusCode}`))
          );
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }
}
