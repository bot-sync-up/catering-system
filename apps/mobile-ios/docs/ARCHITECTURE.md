# ארכיטקטורה — Catering iOS

## עקרונות

האפליקציה נבנתה לפי MVVM + Combine עם הפרדה ברורה לארבע שכבות:

```
┌────────────────────────────────────────────────────┐
│  Presentation (SwiftUI Views + ViewModels)         │
│  - LoginView / DashboardView / DeliveriesView ...  │
├────────────────────────────────────────────────────┤
│  Domain (UseCases + Models)                        │
│  - GetTodayOrdersUseCase / ClockInUseCase ...      │
├────────────────────────────────────────────────────┤
│  Data (Repositories)                               │
│  - OrderRepository / DeliveryRepository ...        │
├────────────────────────────────────────────────────┤
│  Core (Infrastructure)                             │
│  - APIClient / RealmManager / FCM / Keychain ...   │
└────────────────────────────────────────────────────┘
```

## שכבות

### Presentation
- SwiftUI מבוסס `@StateObject` עבור ViewModel ייעודי לכל מסך
- Combine `@Published` להזרמת מצב לתצוגה
- `@EnvironmentObject AppState` למצב משתמש גלובלי

### Domain
- `Models.swift` — מבני נתונים ישות נטו (`User`, `Order`, `TaskItem`, `Lead`, `ShiftRecord`, `Delivery`)
- `UseCases.swift` — מקרי שימוש עסקיים מבודדים, ניתנים לבדיקה

### Data
- `Repositories.swift` — חוזה מופשט + מימוש שמדבר עם `APIClient`
- מימושים מחזירים `AnyPublisher<T, APIError>`

### Core
- `APIClient` — Alamofire `Session` עם `AuthInterceptor` שמרענן JWT אוטומטית ב-401
- `RealmManager` — אחסון מקומי: `CachedUser`, `CachedOrder`, `CachedTask`, `OfflineQueueItem`, `CachedPhoto`
- `KeychainTokenStore` — `KeychainSwift` עם נגישות `AccessibleWhenUnlockedThisDeviceOnly`
- `BiometricAuthenticator` — `LAContext` תומך Face ID / Touch ID / Optic ID
- `OfflineQueueSync` — `BGProcessingTaskRequest` כל 15 דקות
- `FCMManager` — Firebase Messaging + 5 קטגוריות התראה
- `QuietHours` — בדיקת 22:00-08:00 באזור זמן ישראל
- `GeofencingManager` — `CLLocationManager` עם רגיונים מעגליים ברדיוס 100 מטר
- `CameraView` — `UIImagePickerController` עטוף ב-`UIViewControllerRepresentable`
- `Localizer` — עזר ל-`NSLocalizedString` + `RTLModifier`

## זרימת הזמנה חדשה — אופליין

1. הלקוח ב-`NewOrderView` ממלא טופס
2. `RealmManager.queueOffline(...)` שומר ל-`OfflineQueueItem`
3. `OfflineQueueSync.syncNow()` מפעיל מיידית אם יש רשת
4. אחרת BGTaskScheduler מנסה כל 15 דקות עד הצלחה

## אבטחה

- כל ה-tokens ב-Keychain בלבד (לא ב-UserDefaults)
- AppTransportSecurity ב-HTTPS בלבד
- Biometric login עם fallback ל-passcode
- Sentry ל-crash reporting (ללא נתוני משתמש אישיים)

## נגישות ו-RTL

- `UISemanticContentAttribute = ForceRightToLeft` ב-Info.plist
- `environment(\.layoutDirection, .rightToLeft)` ב-`CateringApp`
- Heebo font משולב עם Dynamic Type
- כל ה-strings ב-`Localizable.strings` (he, en)

## בדיקות

- **XCTest** — יחידה: `QuietHoursTests`, `KeychainTokenStoreTests`
- **swift-snapshot-testing** — בדיקות חזותיות RTL
- **XCUITest** — End-to-End: `CateringRTLUITests` שמוודא שפה והרשמה

## CI/CD

GitHub Actions → Fastlane → TestFlight:
1. PR פותח → `fastlane test`
2. merge ל-`main` → `fastlane beta` עם increment build
3. תיוג `vX.Y.Z` → `fastlane release` (ידני, דורש אישור)
