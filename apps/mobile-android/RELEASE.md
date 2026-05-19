<div dir="rtl">

# Release - העלאה ל-Google Play Store

מסמך זה מתאר את כל השלבים מ-build חתום ועד publish ב-Google Play Console.

---

## 1. הכנת Keystore

יוצרים פעם אחת:

</div>

```bash
keytool -genkey -v \
  -keystore catering-release.keystore \
  -alias catering \
  -keyalg RSA -keysize 2048 -validity 10000
```

<div dir="rtl">

שמור את הקובץ במקום בטוח (תוכן ה-keystore + הסיסמאות). **אל תעלה אותו ל-Git!**

מומלץ לשמור גם ב-Google Play App Signing (Play עצמו חותם שוב במפתח שלו).

---

## 2. קונפיגורציית CI לחתימה

ב-GitHub repository settings → Secrets and variables → Actions, הוסף:

| Secret | תוכן |
|--------|------|
| `KEYSTORE_BASE64` | תוכן ה-keystore בקידוד base64 (`base64 -i catering-release.keystore`) |
| `KEYSTORE_PASSWORD` | סיסמת ה-keystore |
| `KEY_ALIAS` | alias (לדוג׳ `catering`) |
| `KEY_PASSWORD` | סיסמת המפתח |

הוורק-פלואו `android.yml` יחלץ אוטומטית את ה-keystore ויחתום.

---

## 3. הכנת גרסה

</div>

```bash
# עדכון versionCode + versionName ב-app/build.gradle.kts
# versionCode = N  (חייב להיות גבוה מהקודם)
# versionName = "0.2.0"

cd apps/mobile-android
./gradlew clean
./gradlew bundleRelease
```

<div dir="rtl">

ה-AAB יישמר ב-`app/build/outputs/bundle/release/app-release.aab`.

### בדיקת ה-AAB מקומית

</div>

```bash
# התקנת bundletool
brew install bundletool

# יצירת APKs לבדיקה
bundletool build-apks \
  --bundle=app-release.aab \
  --output=app-release.apks \
  --ks=catering-release.keystore \
  --ks-key-alias=catering

# התקנה במכשיר מחובר
bundletool install-apks --apks=app-release.apks
```

<div dir="rtl">

---

## 4. העלאה ל-Play Console

### שלב 1 - יצירת אפליקציה (פעם אחת)

1. כנס ל-[Google Play Console](https://play.google.com/console).
2. Create app → שם, שפת ברירת מחדל (עברית), App or game, Free/Paid.
3. השלם את ה-Declarations הנדרשים.

### שלב 2 - Internal Testing (ראשון!)

1. Testing → Internal testing → Create new release.
2. גרור את ה-`app-release.aab`.
3. הוסף Release notes (בעברית - תומך RTL).
4. הוסף testers (Google Groups או רשימת מיילים).
5. Review release → Start rollout.

### שלב 3 - מעבר ל-Closed/Open Testing

לאחר משוב טוב מ-Internal:

1. Testing → Closed/Open testing → Create new release.
2. Promote מ-Internal או העלה גרסה חדשה.

### שלב 4 - Production

1. Production → Create new release.
2. Promote מ-Open testing.
3. Rollout percentage - התחל ב-5%, עלה בהדרגה ל-100%.

---

## 5. מטא-דאטה לחנות (כל הטקסטים בעברית)

| שדה | מקסימום | תוכן |
|------|---------|------|
| App name | 30 תווים | "ניהול קייטרינג" |
| Short description | 80 תווים | "אפליקציה לניהול הזמנות, משלוחים ומטבח לעסקי קייטרינג" |
| Full description | 4000 תווים | תיאור מפורט - יתרונות, תכונות, תפקידים |
| Screenshots | 2-8 לכל מכשיר | טלפון: 1080×1920, טאבלט: 1200×1920 |
| Feature graphic | 1024×500 | תמונה ראשית |
| App icon | 512×512 | אייקון 32-bit PNG |

### Screenshots חובה

1. מסך התחברות
2. לוח בקרה למנהל
3. רשימת משלוחים (נהג)
4. משימות הכנה (מטבח)
5. מסך חתימה (נהג)

---

## 6. App Privacy / Data Safety

ב-Play Console → App content:

- **Privacy policy URL** - נדרש (URL פעיל לתקנון פרטיות).
- **Data collection** - הצהר על: מיקום (משלוחים), תמונות (חתימות/חשבוניות), פרטי קשר (CRM).
- **Permissions** - תאר למה כל הרשאה: `ACCESS_FINE_LOCATION` להוכחת מסירה, `CAMERA` לחתימות+OCR, וכו׳.

---

## 7. רשימת בדיקות לפני העלאה

</div>

- [ ] `versionCode` הועלה
- [ ] `versionName` עודכן
- [ ] `./gradlew testDebugUnitTest` עבר
- [ ] `./gradlew lintRelease` ללא errors קריטיים
- [ ] בדיקה ידנית של כל 6 התפקידים (Manager, Agent, Kitchen, Shift, Driver, Customer)
- [ ] בדיקה של מצב Offline (Airplane mode → פעולות → חזרה לרשת → סנכרון)
- [ ] בדיקה של DND (שעת מערכת 23:00 → התראה לא בוקעת)
- [ ] בדיקה של RTL בכל המסכים
- [ ] בדיקה של ביומטרי (במכשיר עם טביעת אצבע)
- [ ] בדיקה של Geofence (יצירת fence + הליכה החוצה)
- [ ] תרגום מלא ל-`values-he`

<div dir="rtl">

---

## 8. Hotfix מהיר

</div>

```bash
# branch חדש מ-main
git checkout -b hotfix/v0.2.1
# תקן + commit
./gradlew bundleRelease
# העלה ל-Internal testing מיד
# רק לאחר verification → Production עם rollout 100%
```

<div dir="rtl">

---

## 9. Monitoring לאחר השקה

- **Crashlytics** (Firebase) - crashes בזמן אמת.
- **Play Console → Quality → Android vitals** - ANR rate, Crash rate, Battery.
- **Pre-launch report** - אוטומטי לפני כל גרסה. בודק על מספר מכשירים.

---

## 10. סיכום פקודות

</div>

```bash
# Debug build
./gradlew assembleDebug

# Release APK
./gradlew assembleRelease

# Release AAB (לחנות)
./gradlew bundleRelease

# בדיקות
./gradlew testDebugUnitTest
./gradlew connectedAndroidTest   # דורש מכשיר/אמולטור

# Lint
./gradlew lintRelease

# Clean
./gradlew clean
```
