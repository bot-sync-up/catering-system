<div dir="rtl">

# TROUBLESHOOTING — באגים נפוצים ופתרונות

מסמך זה מרכז את כל הבעיות שצפויות לצוץ במהלך התקנת ה-monorepo. כל באג מקושר ל-CONFLICTS.md המקורי וכולל פתרון פעולה.

---

## 1. ERR_PNPM_PEER_DEP_ISSUES

### תסמין
```
 ERR_PNPM_PEER_DEP_ISSUES  Unmet peer dependencies

apps/aneh-web
└─┬ @aneh/auth
  └── ✕ unmet peer react@>=19.0.0: found 18.3.0
```

### גורם
חבילה אחת דורשת React 19 כ-peerDep, אבל ה-app שצורך אותה עדיין על React 18.

### פתרון
1. **אופציה מהירה (מתאים לdev)**: ה-`.npmrc` כבר מגדיר `strict-peer-dependencies=false`. הריצה ממשיכה.
2. **אופציה נכונה**: עדכן את ה-app ל-React 19:
   ```bash
   # ב-app הספציפי
   pnpm --filter @aneh-hashoel/web add react@19.0.0 react-dom@19.0.0
   pnpm --filter @aneh-hashoel/web add -D @types/react@^19.0.0 @types/react-dom@^19.0.0
   ```
3. **לאפליקציות mobile (Expo)**: אל תיגע. הן חייבות להישאר על React 18.2.0.

---

## 2. Prisma generate fails — binary engine

### תסמין
```
Error: Generator "client" failed:
Cannot find module '@prisma/engines/...'
```

### גורם
Prisma קוצרת binary engine ייעודי ל-OS שלך בעת `generate`. אם יש cache פגום או network blockage — נכשל.

### פתרון
```bash
# ניקוי cache של Prisma
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
rm -rf node_modules/@prisma/engines
rm -rf ~/.cache/prisma  # Linux/Mac
rm -rf %LOCALAPPDATA%/Prisma  # Windows

# התקנה מחדש
pnpm install --force
pnpm db:generate
```

אם זה Windows ויש Hyper-V פעיל — ודא ש-Antivirus לא חוסם את `engines.exe` (Defender משחק על Prisma לעיתים).

---

## 3. Node version mismatch

### תסמין
```
You are using Node.js 18.16.0. Required: ^20.10.0
```

### פתרון
התקן [nvm](https://github.com/nvm-sh/nvm) (Linux/Mac) או [nvm-windows](https://github.com/coreybutler/nvm-windows):

```bash
nvm install 20.18.0
nvm use 20.18.0
```

הוסף `.nvmrc` לשורש המונורפו עם תוכן `20.18.0`.

---

## 4. שני schemas של Prisma מתנגשים

### תסמין
```
Error: Multiple migrations directories found in monorepo:
  packages/db/prisma/migrations
  apps/crm/prisma/migrations
```

### גורם
10 schemas שונים במונורפו. כשמריצים `pnpm db:migrate` ה-CLI לא יודע איזה.

### פתרון

**טווח קצר (לdev בלבד)**: הרץ migration ספציפי per-app:
```bash
pnpm --filter @aneh-hashoel/db migrate:dev
pnpm --filter crm exec prisma migrate dev
pnpm --filter orders-management exec prisma migrate dev
# וכו'
```

**טווח ארוך (הפתרון הנכון)**: לאחד את כל ה-schemas ל-`@aneh-hashoel/db` ולמחוק את ה-prisma directories מה-apps. זה עבודה גדולה — תכנן בנפרד.

---

## 5. bcrypt native build fails

### תסמין
```
gyp ERR! build error
gyp ERR! stack Error: `make` failed with exit code: 2
```

### גורם
`bcrypt` (לא `bcryptjs`) הוא native binding ודורש פייתון + C++ compiler.

### פתרון
1. ודא שאתה משתמש ב-`bcryptjs` (pure-JS) ולא ב-`bcrypt`. F1 משתמש ב-`bcryptjs` ברוב המקומות.
2. אם בכל זאת נדרש `bcrypt`:
   - **Linux**: `sudo apt install build-essential python3`
   - **Mac**: `xcode-select --install`
   - **Windows**: `npm install -g windows-build-tools` או הסר ועבור ל-`bcryptjs`.

---

## 6. argon2 native build fails (Windows)

### תסמין
```
gyp ERR! stack Error: Could not find any Visual Studio installation
```

### גורם
`packages/auth` משתמש ב-`argon2` (native). על Windows נדרש Visual Studio Build Tools.

### פתרון
1. התקן [Build Tools for Visual Studio 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (כולל **Desktop development with C++**).
2. אחרי התקנה:
   ```powershell
   npm config set msvs_version 2022
   pnpm install --filter @aneh/auth --force
   ```
3. אלטרנטיבה (קלה יותר): החלף ב-`@node-rs/argon2` שהוא Rust מקומפל מראש:
   ```bash
   pnpm --filter @aneh/auth remove argon2
   pnpm --filter @aneh/auth add @node-rs/argon2
   ```

---

## 7. sharp install fails

### תסמין
```
sharp: Installation error: Cannot find module 'sharp'
```

### גורם
`packages/integrations/ocr` תלוי ב-`sharp` (image processing native).

### פתרון
```bash
pnpm --filter @invoice-ocr/integrations-ocr add sharp --force
# או עם platform-specific:
pnpm --filter @invoice-ocr/integrations-ocr add sharp --config.target_arch=x64 --config.target_platform=linux
```

ל-Windows: השתמש ב-WSL2.

---

## 8. tsx / ts-node מתנגשים

### תסמין
```
Error [ERR_REQUIRE_ESM]: require() of ES Module ...
```

### גורם
`services/orchestrator` מוגדר `"type": "commonjs"` אבל מייבא ESM (`@catering/event-bus`).

### פתרון

ערוך `services/orchestrator/package.json`:
```diff
-  "type": "commonjs",
+  "type": "module",
```

עדכן `tsconfig.json` של orchestrator:
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler"
  }
}
```

---

## 9. Next.js build fails — "Cannot find module 'react/jsx-runtime'"

### תסמין
```
Module not found: Can't resolve 'react/jsx-runtime'
```

### גורם
hoisting של pnpm לא העלה את React לטופ-לבל ב-app הספציפי. קורה אחרי שדרוג React 18→19.

### פתרון
```bash
# נקה והתקן מחדש
rm -rf node_modules apps/<app>/node_modules
pnpm install --force
pnpm --filter <app> add react@19.0.0 react-dom@19.0.0
```

ודא שיש ב-`.npmrc`:
```
prefer-workspace-packages=true
link-workspace-packages=true
```

---

## 10. tRPC version mismatch error בזמן ריצה

### תסמין
```
TRPCClientError: Possible @trpc/server and @trpc/client version mismatch
```

### גורם
`apps/crm` עדיין על `rc.502` למרות ה-overrides.

### פתרון
ודא ש-`pnpm.overrides` ב-root package.json מכיל:
```json
{
  "@trpc/server": "11.0.0-rc.648",
  "@trpc/client": "11.0.0-rc.648",
  "@trpc/react-query": "11.0.0-rc.648",
  "@trpc/next": "11.0.0-rc.648"
}
```

הרץ:
```bash
rm pnpm-lock.yaml
pnpm install
```

---

## 11. Expo install fails ("expo doctor" warnings)

### תסמין
ב-`apps/mobile` (Expo 51):
```
expo-doctor encountered an unexpected error
```

### גורם
`pnpm.overrides` של React 19 הגיע גם ל-Expo. Expo 51 דורש React 18.2.0 בדיוק.

### פתרון
ב-root `package.json` השתמש ב-package-scoped override:
```json
{
  "pnpm": {
    "overrides": {
      "react": "19.0.0",
      "react-dom": "19.0.0",
      "react@>=18.0.0<19.0.0": "18.2.0"
    }
  }
}
```

הסבר: pnpm תומכת ב-overrides עם semver constraints. הראשון תופס לdefault, השני נכנס פנימה רק עבור tree שהורה שלו דורש 18.x.

עבור Expo:
```bash
pnpm --filter @field-ops/mobile install --force
cd apps/mobile && npx expo install --fix
cd ../fleet/mobile && npx expo install --fix
```

---

## 12. Windows-specific: סקריפט bash לא רץ

### תסמין
```
'bash' is not recognized as an internal or external command
```

### פתרון
- התקן [Git for Windows](https://git-scm.com/download/win) (כולל Git Bash).
- או הפעל מ-WSL2: `wsl ./bootstrap/scripts/fix-all.sh .`.
- ב-PowerShell: `bash bootstrap/scripts/fix-all.sh .` (אם Git Bash בPATH).

---

## 13. Windows-specific: Hyper-V conflicts עם WSL2

### תסמין
WSL2 לא עולה / Docker Desktop נופל בעלייה.

### פתרון
```powershell
# הפעלה כאדמין
bcdedit /set hypervisorlaunchtype auto
DISM /Online /Enable-Feature /All /FeatureName:Microsoft-Windows-Subsystem-Linux
DISM /Online /Enable-Feature /All /FeatureName:VirtualMachinePlatform
# רישטרט
```

לאחר מכן Docker Desktop → Settings → General → Use WSL2 based engine.

---

## 14. Permission denied על מאקרו `.bootstrap-backup-*`

### תסמין
```
EACCES: permission denied, scandir '.bootstrap-backup-20250521-141500'
```

### פתרון (Linux/Mac)
```bash
sudo chown -R $USER:$USER .bootstrap-backup-*
chmod -R u+rw .bootstrap-backup-*
```

---

## 15. Redis לא עולה / ChainBlocker

### תסמין
```
[ioredis] connect ETIMEDOUT
```

### פתרון
```bash
# בדוק ש-Docker רץ
docker ps | grep redis

# הפעל את Redis
docker compose -f deployment/docker/docker-compose.yml up -d redis

# בדוק connectivity ידנית
docker exec -it $(docker ps -q -f name=redis) redis-cli ping
# צפוי: PONG
```

---

## 16. /health endpoints מחזירים 404

### תסמין
```
HTTP http://localhost:3000/health - status 404
```

### גורם
לא כל app הגדיר /health. רוב ה-Next apps רק מציעים את ה-routes שב-`app/api/`.

### פתרון
לכל app ב-Next יש להוסיף `app/api/health/route.ts`:

```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({
    ok: true,
    service: process.env.APP_NAME ?? "unknown",
    timestamp: new Date().toISOString()
  });
}
```

לאחר מכן הרץ שוב `pnpm bootstrap:health`.

---

## 17. pnpm-lock.yaml conflicts ב-git

### תסמין
```
CONFLICT (content): Merge conflict in pnpm-lock.yaml
```

### פתרון
```bash
git checkout HEAD -- pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
git commit
```

לעולם אל תפתור lockfile conflicts ידנית.

---

## 18. תיקיית `tests` חסרה ב-pnpm-workspace

### תסמין
```
WARN  In workspace "tests" — no package.json found
```

### פתרון
`fix-all.sh` יוצרת אותה אוטומטית. אם לא רצה:
```bash
mkdir -p tests
cp bootstrap/config/tests-package.json tests/package.json
```

---

## איך לדווח על באג חדש

אם נתקלת בבאג שלא נמצא כאן:

1. הרץ:
   ```bash
   pnpm install --reporter=verbose 2>&1 | tee install.log
   ```
2. תעד את ה-error stack מ-`install.log`
3. הוסף סעיף חדש למסמך הזה בפורמט: `## N. <תסמין>` → `### גורם` → `### פתרון`.

</div>
