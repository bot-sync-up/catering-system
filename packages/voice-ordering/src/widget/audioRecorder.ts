// audioRecorder — מקליט מהמיקרופון בדפדפן ושולח chunks ב-WebSocket
export interface AudioRecorderOptions {
  wsUrl: string;
  sampleRate?: number;
  onTranscript?: (text: string) => void;
  onAgentAudio?: (mp3: ArrayBuffer) => void;
  onError?: (err: Error) => void;
}

export class AudioRecorder {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;

  constructor(private opts: AudioRecorderOptions) {}

  async start(): Promise<void> {
    if (typeof navigator === 'undefined') throw new Error('Browser only');
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.ws = new WebSocket(this.opts.wsUrl);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onmessage = (evt) => {
      if (typeof evt.data === 'string') {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'transcript' && this.opts.onTranscript) {
            this.opts.onTranscript(msg.text);
          }
        } catch {
          // ignore
        }
      } else if (evt.data instanceof ArrayBuffer && this.opts.onAgentAudio) {
        this.opts.onAgentAudio(evt.data);
      }
    };

    this.ws.onerror = () => this.opts.onError?.(new Error('WebSocket error'));

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm;codecs=opus' });
    this.mediaRecorder.ondataavailable = async (evt) => {
      if (evt.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
        const buf = await evt.data.arrayBuffer();
        this.ws.send(buf);
      }
    };
    this.mediaRecorder.start(250); // 250ms chunks
  }

  stop(): void {
    this.mediaRecorder?.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ws?.close();
    this.mediaRecorder = null;
    this.stream = null;
    this.ws = null;
  }
}
