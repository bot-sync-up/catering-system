import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * סטוריז לדמו של חבילת Innovation.
 *
 * אנו לא מייבאים ישירות מהחבילה כדי להימנע מתלות build בזמן storybook —
 * הקומפוננטות שמוצגות כאן הן wrappers ויזואליים שמדמים את ההתנהגות.
 */

// QR Preview
const QRPreview: React.FC<{ subject: string; entityId: string }> = ({ subject, entityId }) => (
  <div dir="rtl" style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #eee", padding: 12, borderRadius: 8, maxWidth: 360 }}>
    <div style={{ width: 96, height: 96, background: `repeating-conic-gradient(#000 0 25%, #fff 0 50%) 0 0/24px 24px`, borderRadius: 4 }} />
    <div>
      <div style={{ fontWeight: 600 }}>{subject}: {entityId}</div>
      <div style={{ color: "#666", fontSize: 12 }}>https://s.syncup.co.il/...</div>
    </div>
  </div>
);

// Plate Quality
const PlateQualityView: React.FC<{ scores: { presentation: number; portion: number; plating: number; freshness: number } }> = ({ scores }) => {
  const avg = (scores.presentation + scores.portion + scores.plating + scores.freshness) / 4;
  const alert = avg < 7;
  return (
    <div dir="rtl" style={{ border: `2px solid ${alert ? "#dc3545" : "#198754"}`, padding: 16, borderRadius: 10, maxWidth: 360 }}>
      <h3 style={{ margin: 0 }}>איכות הגשה</h3>
      <div style={{ fontSize: 32, fontWeight: 700, margin: "8px 0" }}>{avg.toFixed(1)}/10</div>
      <ul style={{ paddingInlineStart: 18, margin: 0 }}>
        <li>פרזנטציה: {scores.presentation}</li>
        <li>מנה: {scores.portion}</li>
        <li>פלייטינג: {scores.plating}</li>
        <li>טריות: {scores.freshness}</li>
      </ul>
      {alert && <div style={{ color: "#dc3545", marginTop: 8 }}>הוצאה התראה לשף הראשי</div>}
    </div>
  );
};

// Passkey Setup
const PasskeyMockup: React.FC<{ state: "idle" | "ready" | "codes" }> = ({ state }) => (
  <div dir="rtl" style={{ maxWidth: 480, border: "1px solid #eee", padding: 16, borderRadius: 10 }}>
    <h3>הגדרת Passkey</h3>
    <p>Passkey מחליף סיסמה. הצמידו אצבע ל-Touch ID או הסתכלו במצלמה.</p>
    <input placeholder="שם למכשיר" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
    <button style={{ marginTop: 10, padding: "10px 18px", background: "#0d6efd", color: "white", border: 0, borderRadius: 6 }}>
      {state === "ready" ? "ממתין למכשיר..." : "הוסף Passkey"}
    </button>
    {state === "codes" && (
      <div style={{ marginTop: 16, background: "#f7f7f7", padding: 12, borderRadius: 8 }}>
        <strong>קודי שחזור (שמרו)</strong>
        <ol style={{ fontFamily: "monospace" }}>
          {["A1B2-C3D4-E5F6", "G7H8-I9J0-K1L2", "M3N4-O5P6-Q7R8"].map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
      </div>
    )}
  </div>
);

// Kitchen Voice
const KitchenVoiceMockup: React.FC<{ listening: boolean; lastCommand?: string }> = ({ listening, lastCommand }) => (
  <div dir="rtl" style={{ maxWidth: 360, border: "1px solid #eee", padding: 16, borderRadius: 10, textAlign: "center" }}>
    <div style={{ fontSize: 48 }}>{listening ? "🎙️" : "🎤"}</div>
    <div style={{ fontWeight: 600 }}>{listening ? "מאזין... אמרו: \"סמן הושלם\"" : "המיקרופון כבוי"}</div>
    {lastCommand && <div style={{ marginTop: 12, padding: 10, background: "#f0f0f0", borderRadius: 6, fontStyle: "italic" }}>"{lastCommand}"</div>}
  </div>
);

// AR Menu Item
const ARMockup: React.FC<{ nameHe: string; priceIls: number }> = ({ nameHe, priceIls }) => (
  <div dir="rtl" style={{ maxWidth: 320, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
    <div style={{ height: 220, background: "linear-gradient(135deg,#ddd,#bbb)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
      🧊 3D MODEL
    </div>
    <header style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
      <h3 style={{ margin: 0 }}>{nameHe}</h3>
      <span style={{ fontWeight: 600 }}>{priceIls} ₪</span>
    </header>
    <button style={{ marginTop: 8, padding: "8px 14px", background: "#0d6efd", color: "white", border: 0, borderRadius: 6 }}>
      צפו ב-AR
    </button>
  </div>
);

const meta = { title: "Innovation" } satisfies Meta;
export default meta;

type Story = StoryObj;

export const QRForOrder: Story = { render: () => <QRPreview subject="Order" entityId="ORD-1042" /> };
export const QRForDelivery: Story = { render: () => <QRPreview subject="Delivery" entityId="DEL-901" /> };
export const PlateQualityGood: Story = {
  render: () => <PlateQualityView scores={{ presentation: 9, portion: 8, plating: 9, freshness: 10 }} />,
};
export const PlateQualityAlert: Story = {
  render: () => <PlateQualityView scores={{ presentation: 5, portion: 7, plating: 4, freshness: 6 }} />,
};
export const PasskeyIdle: Story = { render: () => <PasskeyMockup state="idle" /> };
export const PasskeyReady: Story = { render: () => <PasskeyMockup state="ready" /> };
export const PasskeyWithCodes: Story = { render: () => <PasskeyMockup state="codes" /> };
export const KitchenVoiceIdle: Story = { render: () => <KitchenVoiceMockup listening={false} /> };
export const KitchenVoiceListening: Story = {
  render: () => <KitchenVoiceMockup listening lastCommand="סמן הושלם משימה 42" />,
};
export const ARMenuItem: Story = { render: () => <ARMockup nameHe="קינוח שוקולד טרי" priceIls={42} /> };
