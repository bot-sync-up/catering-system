# Security Audit + Pentest Automation Pack

חבילה אוטומטית מקיפה למבדקי אבטחה (SAST, SCA, DAST, Container, Secrets) ולמבדקי חדירה ידניים, מותאמת לציות ישראלי (מע"מ 18%, ת"ז, שמירת נתונים 7 שנים).

## מבנה

- `.github/workflows/` — Pipelines אוטומטיים ל-CI/CD
- `configs/` — קבצי תצורה לכלי הסריקה
- `scripts/` — סקריפטים תפעוליים
- `pentest/` — סקריפטים ידניים לבדיקות חדירה
- `compliance/` — בדיקות ציות ישראליות
- `policies/` — מדיניות, חריגים, ספי חומרה
- `reports/` — תבניות דוחות + מעקב ממצאים
- `runbooks/` — פרוצדורות תגובה (RTL עברית)
- `threat-models/` — מודלי איום STRIDE + DFD
- `dashboards/` — Grafana posture dashboard
- `PENTEST-CHECKLIST.md` — צ'קליסט טרום-השקה

## הרצה מקומית

```bash
# SAST מהיר
semgrep --config configs/semgrep.yml .

# סריקת תלויות
npm audit && bash scripts/auto-fix-vulns.sh

# סודות
gitleaks detect --config .gitleaks.toml

# DAST baseline
bash scripts/zap-baseline.sh https://staging.example.co.il

# Pentest חדירה
python pentest/test_idor.py --base-url https://staging.example.co.il
```
