# next/image - אופטימיזציית תמונות

ה-`<Image>` של Next מבצע אוטומטית: המרת פורמט (AVIF/WebP), responsive srcset, lazy loading, וגודל קבוע למניעת CLS.

## דוגמת base

```tsx
import Image from 'next/image';

<Image
  src="/products/hero.jpg"
  alt="חלת שבת מתוקה"
  width={1200}
  height={630}
  priority             // ל-LCP בלבד
  sizes="(max-width: 768px) 100vw, 1200px"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

## כללים

### 1. `priority` רק ל-LCP

`priority` מסיר lazy loading ומוסיף preload. **רק על תמונה אחת בכל דף** - הראשונה שגדולה למעלה. תמונה דקורטיבית או בקרוסלה שלא נראית מיד = לא priority.

### 2. `sizes` חיוני לתמונות responsive

בלי `sizes`, הדפדפן מוריד את הגרסה המקסימלית. עם:

```tsx
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
```

מוריד את הגודל המתאים לדפדפן.

### 3. תמיד width + height

מונע CLS. אם הגודל באמת לא ידוע, השתמש ב-`fill` + container עם `position: relative` ו-`aspect-ratio` קבוע:

```tsx
<div style={{ position: 'relative', aspectRatio: '16/9' }}>
  <Image src="..." alt="..." fill sizes="100vw" />
</div>
```

### 4. אל תשתמש ב-`unoptimized` בלי סיבה

`unoptimized` מבטל את כל האופטימיזציה. השתמש רק עבור GIFs או SVG פנימיים.

## הגדרת next.config.js

```js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,    // 30 ימים
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.syncup.co.il' },
      { protocol: 'https', hostname: 's3.eu-central-1.amazonaws.com' },
    ],
  },
};
```

## Blur placeholder

לתמונה מקומית (build-time):

```tsx
import heroImg from '@/public/products/hero.jpg';
<Image src={heroImg} alt="..." placeholder="blur" />
```

לתמונה דינמית (runtime) - השתמש ב-`plaiceholder` ב-server:

```ts
import { getPlaiceholder } from 'plaiceholder';

export async function getProductImage(url: string) {
  const buffer = await fetch(url).then(r => r.arrayBuffer());
  const { base64 } = await getPlaiceholder(Buffer.from(buffer));
  return { src: url, blurDataURL: base64 };
}
```

## מעבר מ-`<img>` רגיל

ב-codebase קיים, חפש:

```bash
grep -r "<img " src/ --include="*.tsx" --include="*.jsx"
```

לכל אחד:
1. החלף ל-`<Image>`.
2. הוסף width/height (מדידה ב-DevTools אם לא ידוע).
3. הוסף alt עברי תיאורי.
4. אם זה LCP - הוסף `priority`.
5. הוסף `sizes` אם responsive.

## תמונות שלא לעבור עליהן

- **SVG icons** - השתמש ב-`<svg>` inline או ספריית icons.
- **תמונות באנימציה (GIF)** - העבר ל-video או Lottie.
- **תמונות גדולות מ-5MB** - דחס ב-build, אל תסמוך על runtime.

## אופטימיזציה ב-CMS

אם CMS שולח URLs ישירים, צור wrapper שיכניס את ה-URL ל-loader מותאם:

```tsx
const cmsLoader = ({ src, width, quality }) =>
  `https://cms.syncup.co.il/cdn/${src}?w=${width}&q=${quality || 75}`;

<Image loader={cmsLoader} src="hero.jpg" width={1200} height={630} alt="..." />
```

## חיסכון מצופה

לפני (JPG מקורי 400KB): LCP 3.2s, total transfer 1.8MB
אחרי (AVIF responsive 80KB): LCP 1.4s, total transfer 320KB
