// VoiceWidget — רכיב React לאתר שמאפשר ללקוח לדבר עם הבוט בלי לחייג
import { useEffect, useRef, useState } from 'react';
import { AudioRecorder } from './audioRecorder.js';

export interface VoiceWidgetProps {
  wsUrl: string;
  greeting?: string;
  primaryColor?: string;
}

export function VoiceWidget({
  wsUrl,
  greeting = 'דברו איתי להזמנת אירוע',
  primaryColor = '#2563eb',
}: VoiceWidgetProps) {
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => recorderRef.current?.stop();
  }, []);

  const start = async () => {
    setError(null);
    try {
      const recorder = new AudioRecorder({
        wsUrl,
        onTranscript: (text) => setTranscript((prev) => [...prev, text]),
        onAgentAudio: (buf) => playAudio(buf),
        onError: (err) => setError(err.message),
      });
      await recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const playAudio = (buf: ArrayBuffer) => {
    const blob = new Blob([buf], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    if (audioElRef.current) {
      audioElRef.current.src = url;
      audioElRef.current.play().catch(() => {/* autoplay blocked */});
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          background: primaryColor,
          color: 'white',
          border: 'none',
          borderRadius: 32,
          padding: '12px 20px',
          fontSize: 16,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}
      >
        {greeting}
      </button>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        width: 320,
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        padding: 16,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>הזמנת אירוע</strong>
        <button onClick={() => { stop(); setOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          סגור
        </button>
      </div>
      <div style={{ minHeight: 120, maxHeight: 240, overflowY: 'auto', margin: '12px 0' }}>
        {transcript.length === 0 ? (
          <p style={{ color: '#666' }}>לחץ "התחל" ואני אקשיב.</p>
        ) : (
          transcript.map((t, i) => (
            <p key={i} style={{ margin: '4px 0' }}>{t}</p>
          ))
        )}
      </div>
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      <button
        onClick={recording ? stop : start}
        style={{
          width: '100%',
          background: recording ? '#dc2626' : primaryColor,
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        {recording ? 'עצור' : 'התחל לדבר'}
      </button>
      <audio ref={audioElRef} hidden />
    </div>
  );
}
