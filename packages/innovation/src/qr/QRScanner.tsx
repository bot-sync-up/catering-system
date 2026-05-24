/**
 * QRScanner — קומפוננטת React לסריקת QR מהמצלמה.
 *
 * הקומפוננטה היא wrapper דק סביב BarcodeDetector ה-native של הדפדפן.
 * בדפדפנים שאינם תומכים (Safari ישן) — מוצגת הודעת fallback בעברית.
 *
 * שימוש:
 * ```tsx
 * <QRScanner onScan={(code) => console.log(code)} />
 * ```
 */

import * as React from "react";

declare global {
  interface Window {
    BarcodeDetector?: {
      new (opts: { formats: string[] }): { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> };
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

export interface QRScannerProps {
  /** נקרא בכל קוד חדש שמזוהה (לא יקרא פעמיים ברצף עבור אותו קוד). */
  onScan: (code: string) => void;
  /** קוצב התדירות בין סריקות (ms). ברירת מחדל 400. */
  intervalMs?: number;
  /** רוחב הוידאו. */
  width?: number;
  height?: number;
  /** טקסט שיוצג כשהמצלמה נכשלת. */
  errorTextHe?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  intervalMs = 400,
  width = 320,
  height = 320,
  errorTextHe = "לא ניתן לגשת למצלמה. אנא ודא הרשאות.",
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [unsupported, setUnsupported] = React.useState(false);
  const lastCodeRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.BarcodeDetector) {
      setUnsupported(true);
      return;
    }
    let stream: MediaStream | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        intervalId = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            for (const c of codes) {
              if (c.rawValue && c.rawValue !== lastCodeRef.current) {
                lastCodeRef.current = c.rawValue;
                onScan(c.rawValue);
              }
            }
          } catch {
            // התעלם משגיאות סריקה — קצב מתפרץ
          }
        }, intervalMs);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onScan, intervalMs]);

  if (unsupported) {
    return (
      <div dir="rtl" style={{ padding: 16, color: "#a00" }}>
        הדפדפן אינו תומך בסריקת QR ישירה. השתמשו ב-Chrome / Edge עדכניים.
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <video
        ref={videoRef}
        width={width}
        height={height}
        muted
        playsInline
        style={{ borderRadius: 12, background: "#000" }}
      />
      {error && (
        <div style={{ marginTop: 8, color: "#a00" }}>
          {errorTextHe} ({error})
        </div>
      )}
    </div>
  );
};
