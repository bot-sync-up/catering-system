<div dir="rtl" lang="he">

# release-bundle/ — חבילת התקנה "YOLO Deploy"

חבילה שלמה ל-deploy בפקודה אחת. אין צורך לקרוא תיעוד ארוך — רק להעתיק שורה.

## תוכן

```
release-bundle/
├── install-local.sh          # התקנה מקומית Linux/Mac
├── install-local.ps1         # התקנה מקומית Windows
├── install-vps.sh            # התקנת VPS מלאה (Ubuntu 24.04)
├── update.sh                 # עדכון חי + backup
├── uninstall.sh              # הסרה נקייה
├── backup-now.sh             # גיבוי ידני
├── restore-from-backup.sh    # שחזור מ-backup
├── INSTALL.md                # מדריך התקנה מלא בעברית
├── TROUBLESHOOTING.md        # 30+ בעיות נפוצות
├── release-notes-v0.1.0.md   # מה כלול בגרסה
├── LICENSE.md                # רישיון מסחרי
├── CONTRIBUTING.md           # מדריך פיתוח
├── SECURITY.md               # מדיניות אבטחה / vuln disclosure
└── bin/                      # קיצורי דרך
    ├── _common.sh
    ├── catering-start
    ├── catering-stop
    ├── catering-status
    ├── catering-logs
    ├── catering-shell
    ├── catering-backup
    └── catering-update
```

## quick start

**מקומי (Linux/Mac):**
```bash
curl -fsSL https://raw.githubusercontent.com/bot-sync-up/catering/main/install-local.sh | bash
```

**מקומי (Windows):**
```powershell
iwr https://raw.githubusercontent.com/bot-sync-up/catering/main/install-local.ps1 -UseBasicParsing | iex
```

**VPS (Ubuntu 24.04):**
```bash
ssh root@your-vps 'bash <(curl -fsSL https://raw.githubusercontent.com/bot-sync-up/catering/main/install-vps.sh)'
```

עיין ב-[`INSTALL.md`](INSTALL.md) לפרטים מלאים.

</div>
