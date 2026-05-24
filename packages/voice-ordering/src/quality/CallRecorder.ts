// הקלטת שיחה — שמירת MP3 + transcript ב-JSON
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { DialogTurn } from '../types.js';

export interface CallRecorderConfig {
  outputDir: string;
}

export class CallRecorder {
  private chunks: Buffer[] = [];

  constructor(private cfg: CallRecorderConfig, public callSid: string) {}

  appendAudio(chunk: Buffer): void {
    this.chunks.push(chunk);
  }

  async save(transcript: DialogTurn[]): Promise<{ audioPath: string; transcriptPath: string }> {
    const dir = join(this.cfg.outputDir, this.callSid);
    await mkdir(dir, { recursive: true });
    const audioPath = join(dir, 'audio.mp3');
    const transcriptPath = join(dir, 'transcript.json');
    await mkdir(dirname(audioPath), { recursive: true });
    await writeFile(audioPath, Buffer.concat(this.chunks));
    await writeFile(transcriptPath, JSON.stringify({ callSid: this.callSid, transcript }, null, 2));
    return { audioPath, transcriptPath };
  }
}
