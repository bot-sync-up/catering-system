# Patches - תיקוני VAT 17%→18%

תיקיה זו מיועדת ל-patch files אוטומטיים שייווצרו על-ידי `scripts/scan-vat.sh`.

## מבנה
```
patches/
  <worktree-name>/
    <relative-file-path>.patch     # patch בפורמט unified diff
    NOTES.md                         # תיעוד עברי - מה השתנה ולמה
```

## מצב נוכחי
ה-worktree הנוכחי (`agent-ab161962f128a986d`) הוא ריק (placeholder בלבד) ולכן
אין hits לסריקה. הסקריפט `scripts/scan-vat.sh` מוכן להרצה כשתינתן גישת קריאה
לשאר ה-worktrees תחת `C:/Users/user/.claude/worktrees/`.

## הוראות יישום (כשתינתן גישה)
1. הרץ:
   ```bash
   bash scripts/scan-vat.sh /c/Users/user/.claude/worktrees
   ```
2. עבור על `vat-scan-results.json` ידנית - חלק מההיטים עשויים להיות false-positive
   (למשל `0.17` כקבוע מתמטי בלתי קשור).
3. עבור כל hit ודאי, צור patch ב-`patches/<wt>/<file>.patch`.
4. ה-patch צריך להחליף את הקבוע 17 ל-18 *או* (מומלץ) לקרוא ל-`getVATRate(date)`
   מחבילת `@syncup/vat-engine`.
