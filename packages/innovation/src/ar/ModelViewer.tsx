/**
 * ModelViewer — wrapper דק סביב הקומפוננטה הסטנדרטית `<model-viewer>` של Google.
 *
 * הצרכן אחראי לטעון את הסקריפט פעם אחת:
 * ```html
 * <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>
 * ```
 * אנו לא טוענים אותו אוטומטית כדי לאפשר Self-hosting + CSP מותאם.
 */

import * as React from "react";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          ar?: boolean;
          "ar-modes"?: string;
          "camera-controls"?: boolean;
          "auto-rotate"?: boolean;
          poster?: string;
          "shadow-intensity"?: string;
          "environment-image"?: string;
          exposure?: string;
        },
        HTMLElement
      >;
    }
  }
}

export interface ModelViewerProps {
  /** URL ל-GLB / GLTF. */
  src: string;
  /** טקסט נגישות בעברית. */
  altHe: string;
  /** Poster לטעינה ראשונית. */
  posterUrl?: string;
  /** האם להפעיל AR (ברירת מחדל true). */
  ar?: boolean;
  /** מצבי AR לפי סדר עדיפויות. */
  arModes?: ("webxr" | "scene-viewer" | "quick-look")[];
  /** גובה בקיקסלים. */
  height?: number;
  /** רוחב. */
  width?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const ModelViewer: React.FC<ModelViewerProps> = ({
  src,
  altHe,
  posterUrl,
  ar = true,
  arModes = ["webxr", "scene-viewer", "quick-look"],
  height = 360,
  width = "100%",
  className,
  style,
}) => {
  return (
    <model-viewer
      src={src}
      alt={altHe}
      poster={posterUrl}
      ar={ar || undefined}
      ar-modes={arModes.join(" ")}
      camera-controls
      auto-rotate
      shadow-intensity="1"
      exposure="1"
      className={className}
      style={{ width, height, background: "#f5f5f5", borderRadius: 12, ...style }}
    />
  );
};
