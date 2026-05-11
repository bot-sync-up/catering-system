# Hebrew Fonts

הקבצים `Heebo-Regular.ttf`, `Heebo-Bold.ttf`, `FrankRuhlLibre-Regular.ttf`, `FrankRuhlLibre-Bold.ttf` צריכים להיות מועתקים לתיקייה זו. הם מורידים פעם אחת מ-Google Fonts (SIL OFL):

```
mkdir -p deployment/fonts/files
curl -L -o deployment/fonts/files/Heebo-Regular.ttf      https://github.com/google/fonts/raw/main/ofl/heebo/Heebo%5Bwght%5D.ttf
curl -L -o deployment/fonts/files/FrankRuhlLibre-Regular.ttf https://github.com/google/fonts/raw/main/ofl/frankruhllibre/FrankRuhlLibre%5Bwght%5D.ttf
```

(הקבצים אינם מאוחסנים ב-git כדי לא לנפח את הריפוזיטורי - הם מורדים ב-build וב-image של ה-PDF generator.)

## בכל אפליקציה (Next.js)

```ts
// apps/<app>/src/styles/fonts.ts
import { Heebo, Frank_Ruhl_Libre } from "next/font/google";
export const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["400","500","700"], display: "swap" });
export const frank = Frank_Ruhl_Libre({ subsets: ["hebrew"], weight: ["400","700"], display: "swap" });
```

```tsx
// apps/<app>/src/app/layout.tsx
<html lang="he" dir="rtl" className={`${heebo.variable} ${frank.variable}`}>...
```

```css
:root { --font-sans: var(--font-heebo); --font-serif: var(--font-frank-ruhl-libre); }
body { font-family: var(--font-sans); }
```

## ב-PDF (pdfkit)
ראה `registerHebrewFonts.ts`.

## License
שני הפונטים תחת SIL Open Font License 1.1 - שימוש מסחרי מותר, חובה לציין license באתר.
