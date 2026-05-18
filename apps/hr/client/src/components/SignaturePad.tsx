import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

interface Props {
  onSign: (svg: string) => void;
  width?: number;
  height?: number;
}

export default function SignaturePad({ onSign, width = 500, height = 180 }: Props) {
  const ref = useRef<SignatureCanvas>(null);

  const clear = () => ref.current?.clear();
  const save = () => {
    if (!ref.current || ref.current.isEmpty()) {
      alert("אנא חתום לפני שמירה");
      return;
    }
    // שמירה כ-PNG base64 (יכול להיות גם SVG ע"י toData())
    const dataUrl = ref.current.getCanvas().toDataURL("image/png");
    onSign(dataUrl);
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }} className="label">חתימה (גרור עכבר/אצבע):</div>
      <SignatureCanvas
        ref={ref}
        canvasProps={{
          width, height,
          className: "sig-pad",
          style: { width: "100%", maxWidth: width, height },
        }}
        penColor="#000"
      />
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button type="button" className="btn secondary" onClick={clear}>נקה</button>
        <button type="button" className="btn success" onClick={save}>שמור חתימה</button>
      </div>
    </div>
  );
}
