# Catering iOS

אפליקציית iOS ל-Catering — ניהול שירותי קייטרינג מקצה לקצה ב-SwiftUI עם תמיכת RTL מלאה בעברית.

## תקציר

האפליקציה תומכת ב-6 תפקידים (מנהל, סוכן מכירות, מטבח, עובד משמרות, נהג חלוקה, לקוח), עובדת אופליין מלא עם תור סנכרון ברקע, מאוחסנת ב-Realm, מאומתת בביומטריה (Face ID), שולחת התראות Push מסווגות עם שעות שקט, ותומכת בגיאופנסינג למשלוחים.

## דרישות

- macOS Sonoma+
- Xcode 15.1+
- iOS 16.0+ (יעד פריסה)
- Swift 5.10
- Ruby 3.0+ + Fastlane (ל-CI/TestFlight)

## התקנה

```bash
cd apps/mobile-ios
# פתיחה ב-Xcode
open Catering.xcodeproj

# או דרך SwiftPM
swift package resolve
```

## תלויות (SPM)

- [Alamofire](https://github.com/Alamofire/Alamofire) — רשת + interceptor ל-JWT
- [SwiftyJSON](https://github.com/SwiftyJSON/SwiftyJSON) — פענוח JSON
- [Realm Swift](https://github.com/realm/realm-swift) — אחסון מקומי + offline queue
- [KeychainSwift](https://github.com/evgenyneu/keychain-swift) — אחסון בטוח ל-tokens
- [Firebase iOS SDK](https://github.com/firebase/firebase-ios-sdk) — FCM + Analytics + Crashlytics
- [Sentry Cocoa](https://github.com/getsentry/sentry-cocoa) — ניטור שגיאות
- [Charts (DGCharts)](https://github.com/danielgindi/Charts) — גרפים בלוח הבקרה של מנהלים

## ארכיטקטורה

MVVM + Combine. ראה [ARCHITECTURE.md](docs/ARCHITECTURE.md) למפרט מלא.

## הרצת בדיקות

```bash
fastlane test
```

## העלאה ל-TestFlight

```bash
fastlane beta
```

## רישיונות והרשאות

- `NSCameraUsageDescription` — צילום הוכחות מסירה, סריקת חשבוניות וברקודים
- `NSLocationAlwaysAndWhenInUseUsageDescription` — geofencing למשלוחים
- `NSFaceIDUsageDescription` — כניסה ביומטרית
- Background modes: `fetch`, `processing`, `remote-notification`, `location`

## שעות שקט

22:00 - 08:00 (Asia/Jerusalem). התראות ידחו אוטומטית פרט להזמנות דחופות.
