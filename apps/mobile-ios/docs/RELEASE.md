# מסמך שחרור — Catering iOS

## תהליך שחרור גרסה

1. **עדכון מספר גרסה** — `agvtool new-marketing-version X.Y.Z`
2. **בדיקות** — `fastlane test` (XCTest + Snapshot + UITest)
3. **תיוג ב-Git** — `git tag -a vX.Y.Z -m "release X.Y.Z"`
4. **בנייה והעלאה ל-TestFlight** — `fastlane beta`
5. **שחרור לפרודקשן** — `fastlane release` ולאחר אישור Apple Review — פתיחה ידנית בחנות

## קונבנציה לתיוג

`vMAJOR.MINOR.PATCH` תואם SemVer.

## שינוייים תוקנים

מתועדים ב-`CHANGELOG.md` בעברית, פר תיוג.

## מאגרי שיגור

- TestFlight (Internal Testing) — צוות Sync Up + 5 לקוחות פיילוט
- TestFlight (External Testing) — עד 10,000 משתמשים, נדרש Beta App Review
- App Store — שחרור גלובלי, שפה ראשית עברית

## דרישות לפני הגשה לחנות

- [ ] תרגומים מלאים לעברית ולאנגלית
- [ ] צילומי מסך ב-RTL ל-iPhone 6.7", 6.1", iPad
- [ ] טקסט שיווקי בעברית — עד 4000 תווים
- [ ] מדיניות פרטיות — `https://syncup.co.il/privacy`
- [ ] Apple Privacy Manifest מעודכן
- [ ] Sandbox testers לרכישות בתוך האפליקציה (אם רלוונטי)

## חזרה לאחור

ב-App Store Connect: Phased Release מאפשר חזרה לאחור עד 7 ימים מהגשה.
