# @syncup/ui-polish

ספריית רכיבי UI בעברית עם תמיכת RTL מלאה — בנויה ב-React + Tailwind, מותאמת לאפליקציות של Sync Up.

## התקנה

```bash
npm install @syncup/ui-polish
```

ייבוא הסגנונות בקובץ ה-CSS הראשי:

```ts
import '@syncup/ui-polish/styles';
```

## רכיבים עיקריים

### עמודי שגיאה
`ErrorBoundary`, `FallbackUI`, `NotFound`, `ServerError`, `Unauthorized`, `Forbidden`

### Loading
`Skeleton`, `Spinner`, `ProgressBar`, `PageLoader`, `TableSkeleton`, `CardSkeleton`, `FormSkeleton`

### Empty States
`EmptyState` כללי + presets: `NoCustomers`, `NoOrders`, `SearchNoResults`, `NoNotifications`, ועוד.

### Command Palette
`CommandPalette` + `buildDefaultCommands` (30 פקודות בעברית), נפתח ב-`Cmd/Ctrl+K`.

### Notifications
`Toaster`, `NotificationCenter`, חנות `useNotifications` (Zustand), API קצר `notify.success/error/...`.

### Dark Mode
`ThemeProvider` (light/dark/system) + `ThemeToggle` + CSS variables.

### Shortcuts
`useShortcuts`, `buildDefaultShortcuts` (20 קיצורים), `ShortcutsHelp`.

### A11y
`SkipLink`, `FocusTrap`, `announce`, `meetsContrastAA`.

### Help
`Tooltip` (RTL), `HelpPopover`, `OnboardingTour` (joyride).

### Bulk
`useBulkSelection`, `BulkSelector`, `BulkActions`, `exportToCSV`, `exportToExcel`.

### Forms
`HebrewInput`, `PhoneInput`, `IsraeliIdInput`, `BusinessIdInput`, `CurrencyInput` (₪), `DatePicker` (גרגוריאני + עברי).

### Print
`PrintButton`, `PrintPreview`, וקובץ סגנונות הדפסה.

## דוגמה מהירה

```tsx
import {
  ThemeProvider,
  Toaster,
  CommandPalette,
  buildDefaultCommands,
  SkipLink,
  notify,
} from '@syncup/ui-polish';
import '@syncup/ui-polish/styles';

export function App() {
  const [open, setOpen] = useState(false);
  return (
    <ThemeProvider>
      <SkipLink />
      <main id="main">
        <button onClick={() => notify.success('הצלחנו!')}>פעולה</button>
        <CommandPalette
          open={open}
          onClose={() => setOpen(false)}
          commands={buildDefaultCommands()}
        />
      </main>
      <Toaster />
    </ThemeProvider>
  );
}
```

## פיתוח

```bash
npm install
npm run storybook   # Storybook על http://localhost:6006
npm test            # vitest
npm run build       # bundle ל-dist
```
