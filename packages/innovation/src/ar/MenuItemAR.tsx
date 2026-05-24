/**
 * MenuItemAR — מציג פריט תפריט תלת ממדי + מצב AR.
 *
 * אם אין `glbUrl` משתמשת ב-placeholder המובנה (קוביה גנרית) כדי שהממשק
 * לא ייפול גם בלי תוכן 3D מוכן.
 */

import * as React from "react";
import { ModelViewer } from "./ModelViewer.js";

/** Placeholder GLB ציבורי — מבית Google (גלגל גזעים). */
export const PLACEHOLDER_GLB =
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

export interface MenuItemARProps {
  itemId: string;
  nameHe: string;
  /** URL ל-GLB של המנה. אם חסר — נשתמש ב-placeholder. */
  glbUrl?: string;
  posterUrl?: string;
  /** מחיר להצגה (אופציונלי, כולל מע"מ). */
  priceIls?: number;
}

export const MenuItemAR: React.FC<MenuItemARProps> = ({ itemId, nameHe, glbUrl, posterUrl, priceIls }) => {
  return (
    <article dir="rtl" data-item-id={itemId} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
      <ModelViewer src={glbUrl ?? PLACEHOLDER_GLB} altHe={`תצוגת 3D של ${nameHe}`} posterUrl={posterUrl} />
      <header style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <h3 style={{ margin: 0 }}>{nameHe}</h3>
        {priceIls != null && (
          <span style={{ fontWeight: 600 }}>{priceIls.toLocaleString("he-IL")} ₪</span>
        )}
      </header>
      <p style={{ color: "#666", fontSize: 13, marginTop: 8 }}>
        לחצו על סמל ה-AR לתצוגה במציאות רבודה — הנחו את המצלמה על השולחן.
      </p>
    </article>
  );
};
