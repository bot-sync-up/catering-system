# Code Splitting ב-Next.js / React

המטרה: להוריד פחות JS לדף הראשון. סטטיסטיקה: כל 100KB JS gzip = ~250-500ms עיכוב TTI במובייל ממוצע.

## רמת route - אוטומטי ב-Next

App Router מפצל אוטומטית פר-segment. כל page.tsx → chunk נפרד.

## רמת component - `dynamic()`

```tsx
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false,           // אם משתמש ב-window/document
});

export default function Dashboard() {
  return (
    <>
      <Stats />
      <HeavyChart />     {/* נטען רק כשהקומפוננטה רנדורת */}
    </>
  );
}
```

## דפוסים נכונים

### 1. Modal/Dialog שנפתח רק לחיצה

```tsx
const PaymentModal = dynamic(() => import('./PaymentModal'));

function Page() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>תשלום</button>
      {open && <PaymentModal onClose={() => setOpen(false)} />}
    </>
  );
}
```

חיסכון: ספריית התשלומים (~150KB) נטענת רק כש-30% מהמשתמשים לוחצים.

### 2. Charts/Map/Editor כבדים

```tsx
const Map = dynamic(() => import('react-leaflet').then(m => m.MapContainer), {
  ssr: false,
  loading: () => <div className="map-skeleton" />,
});
```

### 3. Tabs - טען רק את הפעיל

```tsx
const Tab1 = dynamic(() => import('./Tab1'));
const Tab2 = dynamic(() => import('./Tab2'));
const Tab3 = dynamic(() => import('./Tab3'));

function Tabs({ active }) {
  return (
    <>
      {active === 1 && <Tab1 />}
      {active === 2 && <Tab2 />}
      {active === 3 && <Tab3 />}
    </>
  );
}
```

## דפוסים שגויים

### 1. dynamic() בקומפוננטה שתמיד מוצגת

```tsx
// !!! מיותר - הקומפוננטה תמיד מרונדרת
const Header = dynamic(() => import('./Header'));
```

זה רק מוסיף round-trip ל-JS. השתמש ב-import רגיל.

### 2. dynamic() בלי loading state

```tsx
// CLS! עד שהקומפוננטה נטענת, יש קפיצת layout
const HeavyChart = dynamic(() => import('./HeavyChart'));
```

תמיד תן `loading:` עם skeleton בגודל קבוע.

### 3. ספריות שכל הקומפוננטות שלהן מועברות יחד

```tsx
// תמיד מביא את כל lodash
import _ from 'lodash';
const sum = _.sum(arr);

// טוב יותר - named import + tree-shaking
import sum from 'lodash/sum';
```

ב-Next, השתמש ב-`optimizePackageImports`:

```js
// next.config.js
experimental: {
  optimizePackageImports: ['lodash', 'date-fns', 'react-icons'],
},
```

זה הופך import רגיל ל-tree-shakeable אוטומטית.

## ספריות מועמדות להחלפה

| במקום | השתמש ב- | חיסכון |
|------|----------|--------|
| moment.js | date-fns / dayjs | 200KB → 7KB |
| lodash | lodash-es + tree-shake | 70KB → ~3KB |
| jQuery | DOM API מקורי | 30KB → 0 |
| axios | fetch + wrapper | 14KB → 0 |
| chart.js | recharts ב-dynamic | inline → lazy |
| moment-timezone | date-fns-tz | 1MB → 50KB |
| validator.js | zod + מותאם | 60KB → 15KB |

## מדידה

```bash
# בנייה עם analyzer
ANALYZE=true npm run build

# Output מציג:
# Route (app)                  Size     First Load JS
# ┌ ○ /                        2.5 kB   95.3 kB
# ├ ○ /products                15.2 kB  108 kB
# └ ƒ /dashboard               45.8 kB  140 kB
```

ספי כשלון מומלצים ב-CI:
- First Load JS פר-page > 200KB → warn
- First Load JS פר-page > 300KB → fail
- shared chunks > 150KB → warn

## Preload חכם

אם ידוע ש-user יעבור ל-route מסוים בקרוב:

```tsx
import { useRouter } from 'next/navigation';
const router = useRouter();

// preload בעת hover
<button
  onMouseEnter={() => router.prefetch('/checkout')}
  onClick={() => router.push('/checkout')}
>
  לתשלום
</button>
```

`<Link>` של Next עושה את זה אוטומטית כש-link נכנס ל-viewport.

## תוצאה כללית מצופה

מנקודת המוצא של פרויקט שלא עבר אופטימיזציה:
- First Load JS: 280KB → 130KB (-54%)
- LCP במובייל 3G: 4.1s → 2.1s
- TTI: 5.8s → 2.9s
- INP: 280ms → 110ms
