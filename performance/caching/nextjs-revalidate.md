# Next.js ISR + Revalidation

ISR (Incremental Static Regeneration) = רינדור פעם, להגיש כסטטי, לרענן ברקע בכל X שניות או אירוע.

## App Router - הגדרת revalidate ברמת route

```ts
// app/products/[sku]/page.tsx
export const revalidate = 300;     // כל 5 דקות
export const dynamicParams = true; // bg-generate routes חדשים

export async function generateStaticParams() {
  const products = await db.product.findMany({
    where: { popular: true },
    select: { sku: true },
    take: 100,
  });
  return products.map(p => ({ sku: p.sku }));
}

export default async function Page({ params }) {
  const product = await fetchProduct(params.sku);
  return <ProductView product={product} />;
}
```

## Fetch-level cache (App Router)

```ts
// משך ה-cache פר-fetch
const res = await fetch('https://api.example.com/products', {
  next: { revalidate: 60, tags: ['products'] }
});

// no-store - תמיד טרי
const res = await fetch(url, { cache: 'no-store' });

// force-cache - לעולם לא לרענן
const res = await fetch(url, { cache: 'force-cache' });
```

## On-Demand Revalidation

```ts
// app/api/revalidate/route.ts
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  const secret = req.headers.get('x-revalidate-secret');
  if (secret !== process.env.REVALIDATE_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }
  const { tag, path } = await req.json();
  if (tag) revalidateTag(tag);
  if (path) revalidatePath(path);
  return Response.json({ revalidated: true, now: Date.now() });
}
```

קריאה מ-CMS webhook / DB trigger:

```ts
// אחרי שמירת מוצר
await fetch(`${BASE_URL}/api/revalidate`, {
  method: 'POST',
  headers: { 'x-revalidate-secret': process.env.REVALIDATE_SECRET },
  body: JSON.stringify({ tag: `product:${sku}`, path: `/products/${sku}` }),
});
```

## עץ ההחלטות

```
שאלה ראשונה: התוכן זהה לכל המשתמשים?
  לא -> SSR + cache פר-user ב-Redis. ISR לא מתאים.
  כן -> שאלה הבאה.

שאלה: כמה משתנה הוא?
  סטטי לחלוטין (about, terms) -> SSG (revalidate=false)
  מעודכן מדי יום (קטלוג עיקרי) -> ISR revalidate=86400 + on-demand
  מעודכן כל שעה (מבצעים) -> ISR revalidate=3600
  מעודכן כל דקות (מלאי) -> ISR revalidate=60 + SWR
  מעודכן בכל בקשה (price quotes) -> SSR cache=no-store
```

## דפוסים בעייתיים

### אנטי-דפוס 1: revalidate נמוך מדי

```ts
export const revalidate = 5; // !!!
```

כל 5 שניות הדף נבנה מחדש. אפס תועלת ל-CDN. השתמש ב-SSR + Redis במקום.

### אנטי-דפוס 2: dynamic = 'force-dynamic' בלי צורך

```ts
export const dynamic = 'force-dynamic'; // כל בקשה מחזירה לרינדור
```

זה הופך הכל ל-SSR. אם זה הקטלוג הציבורי - אסון. בדוק אם באמת צריך.

### אנטי-דפוס 3: cookies/headers ב-RSC

קריאה ל-`cookies()` או `headers()` ב-server component הופכת אוטומטית את ה-route ל-dynamic. אם רצית ISR - הוצא את הלוגיקה ל-client component.

## אימות שה-ISR עובד

```bash
# Headers ב-response
curl -sI https://syncup.co.il/products/BAKE-001 | grep -i -E 'x-nextjs|cache-control|age'

# מצופה:
# X-Nextjs-Cache: HIT | STALE | MISS
# Cache-Control: s-maxage=300, stale-while-revalidate
# Age: 47          (גיל ה-cache בשניות)
```

תרחיש מצופה ב-Vercel:
1. בקשה ראשונה אחרי deploy - MISS, build, return.
2. בקשות נוספות תוך 300s - HIT, age גדל.
3. בקשה אחרי 300s - STALE, מוגש ישן + רינדור ברקע.
4. בקשה אחרי הרינדור - HIT, age מאופס.

## תיאום עם Cache-Tag

```ts
// fetch עם tag
const res = await fetch(url, {
  next: { tags: ['product', `product:${sku}`] }
});

// invalidate ספציפי
revalidateTag(`product:${sku}`);

// invalidate כל הקטגוריה
revalidateTag('product');
```

## אזהרת multi-region

ב-Vercel/Cloudflare Pages, כל region יש לו ISR cache משלו. `revalidateTag` יפיץ לכולם תוך כמה שניות. אם זה קריטי לעקביות - הוסף `Cache-Control: max-age=0, must-revalidate` ל-`/api/admin/*`.

## מטריקות

הוסף ל-`middleware.ts`:

```ts
export function middleware(req: NextRequest) {
  const start = Date.now();
  const res = NextResponse.next();
  res.headers.set('Server-Timing', `total;dur=${Date.now() - start}`);
  return res;
}
```

ולקח אותם ב-RUM (Vercel Analytics, או Custom).
