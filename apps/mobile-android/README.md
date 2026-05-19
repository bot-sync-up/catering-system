<div dir="rtl">

# אפליקציית קייטרינג - Android Native

אפליקציית אנדרואיד נייטיב שנכתבה ב-Kotlin עם Jetpack Compose, Hilt, Room ו-Coroutines. תומכת בעברית מלאה (RTL), Offline-First, וניהול תפקידים: מנהל, סוכן מכירות, מטבח, משמרת, נהג ולקוח.

---

## דרישות מערכת לפיתוח

- **JDK 17** (Temurin/Adoptium)
- **Android Studio Koala (2024.1)** ומעלה
- **Android SDK 35** (`compileSdk` / `targetSdk`)
- **minSdk 26** (Android 8.0)
- **Gradle 8.10.2** (מובא דרך Gradle Wrapper)
- **Kotlin 2.0.20**, AGP 8.5.2

## איך לבנות מקומית

### בניית debug (לפיתוח)

</div>

```bash
cd apps/mobile-android
./gradlew assembleDebug
```

<div dir="rtl">

ה-APK יישמר תחת `app/build/outputs/apk/debug/`.

### הרצת בדיקות יחידה

</div>

```bash
./gradlew testDebugUnitTest
```

<div dir="rtl">

### הרצה במכשיר/אמולטור

</div>

```bash
./gradlew installDebug
```

<div dir="rtl">

או דרך Android Studio: Run → Run app.

### בניית release לחתימה

</div>

```bash
./gradlew assembleRelease   # APK
./gradlew bundleRelease     # AAB ל-Play Store
```

<div dir="rtl">

הקובץ ייחתם רק אם הוגדרו משתני סביבה / properties (ראה `RELEASE.md`):

- `KEYSTORE_PATH`
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`

---

## מבנה הפרויקט

</div>

```
apps/mobile-android/
├── app/
│   ├── build.gradle.kts             # מודול האפליקציה (compose, hilt, room, retrofit, ...)
│   ├── proguard-rules.pro
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml  # הרשאות, RTL, FCM service, geofence receiver
│       │   ├── java/co/il/catering/
│       │   │   ├── CateringApp.kt          # Application + WorkManager Configuration
│       │   │   ├── core/                   # תשתית: רשת, אחסון, אימות, סנכרון, התראות, מיקום
│       │   │   ├── domain/                 # Models + UseCases + Repository interfaces
│       │   │   ├── data/                   # Repository implementations + Retrofit + Room
│       │   │   ├── di/                     # Hilt modules
│       │   │   └── presentation/           # Compose screens + ViewModels + Navigation + Theme
│       │   └── res/
│       │       ├── values-he/strings.xml   # מחרוזות עברית (ברירת מחדל)
│       │       └── values/strings.xml      # English fallback
│       ├── test/                           # JUnit5 + MockK + Turbine
│       └── androidTest/                    # Compose UI + Hilt instrumented tests
├── gradle/libs.versions.toml         # ניהול גרסאות (Version Catalog)
├── build.gradle.kts                  # קובץ build ראשי
└── settings.gradle.kts
```

<div dir="rtl">

---

## תכונות מרכזיות

| תחום | פירוט |
|------|-------|
| **ארכיטקטורה** | Clean Architecture + MVI על Coroutines + StateFlow |
| **UI** | Jetpack Compose, Material3, RTL מלא, גופן Heebo (Google Fonts Downloadable) |
| **DI** | Hilt לכל המודולים, כולל WorkManager |
| **רשת** | Retrofit + OkHttp + Moshi, AuthInterceptor (JWT), TokenAuthenticator (refresh אוטומטי) |
| **אחסון** | Room (5 entities: User/Order/Task/Queue/Photo), EncryptedSharedPreferences לטוקנים |
| **Offline-first** | OfflineQueue + ConflictResolver (last-write-wins + flag), WorkManager Periodic+OneTime |
| **התראות** | FCM, 5 ערוצים: הזמנות / תשלומים / משמרות / משימות / גידור |
| **DND** | שעות שקטות 22:00-08:00 (ניתן לשינוי). רק גידור עוקף את השקט. |
| **מצלמה** | CameraX preview + capture, שמירה ב-cache + FileProvider |
| **OCR** | העלאת חשבונית לשרת → Claude Vision מחזיר ספק/מספר/סכום/פריטים |
| **חתימה** | SignaturePad מבוסס Canvas Compose → PNG מקומי → העלאה ל-Delivery API |
| **מיקום** | FusedLocationProvider + Geofencing API (ENTER/EXIT) להחתמת נוכחות אוטומטית |
| **ביומטרי** | BiometricPrompt (טביעת אצבע / Face Unlock) להפעלה מהירה |
| **i18n** | `LocaleListCompat` + `locales_config.xml`, מעבר בין עברית ואנגלית |

---

## הגדרות פיתוח דרושות

לפני הרצה ראשונה:

1. ודא ש-JDK 17 פעיל: `java -version`.
2. צור קובץ `local.properties` עם `sdk.dir=<נתיב ה-Android SDK>`.
3. אם רוצים FCM פעיל - הוסף `google-services.json` לתיקיית `app/` והפעל את הפלאגין ב-`app/build.gradle.kts` (כרגע מוערה).
4. כתובת ה-API נשמרת ב-`buildConfigField "API_BASE_URL"` (debug ו-release נפרדים).

---

## פתרון בעיות נפוצות

- **שגיאת KSP** → ודא Kotlin 2.0.20 + KSP 2.0.20-1.0.25 תואמים.
- **`Configuration cache` בעיות** → הסר את שורת `org.gradle.configuration-cache=true` מ-`gradle.properties` זמנית.
- **FCM לא עובד** → מוודא `google-services.json` קיים והפלאגין מופעל.
- **Hilt לא מזריק** → ודא ש-`CateringApp` מצוין ב-`android:name` של ה-Manifest וש-`@HiltAndroidApp` מקושט.

</div>
