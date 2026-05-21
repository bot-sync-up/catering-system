#!/usr/bin/env ts-node
/**
 * verify-patches.ts — בודק שכל ה-patches יושמו על monorepo נתון
 *
 * Usage:
 *   ts-node verify-patches.ts <path-to-monorepo>
 *
 * מחזיר דוח JSON עם:
 *   - status: "PASS" / "FAIL" / "WARN"
 *   - patches: רשימת patches עם hits ו-status פר-patch
 *   - summary: סטטיסטיקה
 *
 * Exit codes:
 *   0 — כל ה-patches יושמו (PASS)
 *   1 — לפחות patch אחד נכשל (FAIL)
 *   2 — שגיאת תוכנה
 */

import * as fs from 'fs';
import * as path from 'path';

interface PatchCheck {
  id: string;
  name: string;
  severity: 'P0' | 'P1';
  patterns: { pattern: RegExp; description: string }[];
  excludeFiles?: RegExp[];
  fileExts: string[];
  // מספר hits מקסימלי מותר (0 בד"כ)
  maxAllowed: number;
}

interface PatchResult {
  id: string;
  name: string;
  severity: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  hits: number;
  maxAllowed: number;
  examples: Array<{ file: string; line: number; content: string }>;
}

const PATCHES: PatchCheck[] = [
  {
    id: 'vat-17',
    name: 'VAT 17% → 18%',
    severity: 'P0',
    patterns: [
      { pattern: /\bvatRate\s*:\s*0\.17\b/g, description: 'vatRate: 0.17' },
      { pattern: /\bVAT_RATE\s*=\s*0\.17\b/g, description: 'VAT_RATE = 0.17' },
      { pattern: /\bVAT_RATE\s*=\s*17\b/g, description: 'VAT_RATE = 17' },
      { pattern: /vat:\s*17[^0-9]/g, description: 'vat: 17' },
      { pattern: /\*\s*1\.17\b/g, description: '* 1.17' },
      { pattern: /\*\s*0\.17\b/g, description: '* 0.17' },
      { pattern: /מע"מ\s*17%/g, description: 'Hebrew UI 17%' },
    ],
    excludeFiles: [
      /vat-engine/,
      /\bvat\.test\.ts$/,
      /\bvat\.ts$/,
      /vat-migration\.sql$/,
      /VAT-MIGRATION-REPORT\.md$/,
      /scan-vat\.sh$/,
      /MASTER-PATCHES\.md$/,
      /verify-patches\.ts$/,
    ],
    fileExts: ['.ts', '.tsx', '.js', '.jsx', '.sql', '.json'],
    maxAllowed: 0,
  },
  {
    id: 'jwt-weak',
    name: 'JWT_SECRET חזק (לא change-me)',
    severity: 'P0',
    patterns: [
      { pattern: /JWT_SECRET\s*=\s*change[-_]?me/gi, description: 'JWT_SECRET=change-me' },
      { pattern: /JWT_SECRET\s*=\s*secret\b/gi, description: 'JWT_SECRET=secret' },
      { pattern: /JWT_SECRET\s*=\s*['"]?12345/g, description: 'JWT_SECRET=12345...' },
      { pattern: /ACCESS_TOKEN_SECRET\s*=\s*change[-_]?me/gi, description: 'ACCESS_TOKEN_SECRET=change-me' },
    ],
    excludeFiles: [/MASTER-PATCHES\.md$/, /verify-patches\.ts$/, /\.bak$/],
    fileExts: ['.env', '.example', '.yml', '.yaml', '.ts', '.js'],
    maxAllowed: 0,
  },
  {
    id: 'otp-mathrandom',
    name: 'OTP crypto.randomInt (לא Math.random)',
    severity: 'P0',
    patterns: [
      { pattern: /Math\.random\s*\([^)]*\)[^;]*otp/gi, description: 'Math.random in OTP context' },
      { pattern: /otp[^;\n]*Math\.random/gi, description: 'otp = Math.random' },
      { pattern: /verification[^;\n]*Math\.random/gi, description: 'verification = Math.random' },
      { pattern: /Math\.random[^;\n]*100000/g, description: 'Math.random * 100000 (6-digit OTP)' },
    ],
    excludeFiles: [/MASTER-PATCHES\.md$/, /verify-patches\.ts$/, /\.bak$/, /\/otp\//],
    fileExts: ['.ts', '.tsx', '.js'],
    maxAllowed: 0,
  },
  {
    id: 'cookie-insecure',
    name: 'Cookie Secure+HttpOnly+SameSite',
    severity: 'P0',
    patterns: [
      // res.cookie(...) ללא secure: true ו-ללא buildSetCookie
      { pattern: /res\.cookie\([^)]*\)(?![^;]*(secure|httpOnly|buildSetCookie))/g, description: 'res.cookie without security flags' },
    ],
    excludeFiles: [/MASTER-PATCHES\.md$/, /verify-patches\.ts$/, /\.bak$/, /\/cookies\//],
    fileExts: ['.ts', '.js'],
    maxAllowed: 0,
  },
  {
    id: '2fa-admin',
    name: '2FA חובה למנהלים',
    severity: 'P0',
    patterns: [
      // admin route mount ללא require2FA
      { pattern: /app\.use\(['"]\/admin['"](?:[^)]*)\)(?![^;]*require2FA)/g, description: 'app.use(/admin) without require2FA' },
      { pattern: /router\.use\(['"]\/admin['"](?:[^)]*)\)(?![^;]*require2FA)/g, description: 'router.use(/admin) without require2FA' },
    ],
    excludeFiles: [/MASTER-PATCHES\.md$/, /verify-patches\.ts$/, /\.bak$/, /2fa-enforcement/],
    fileExts: ['.ts', '.js'],
    maxAllowed: 0,
  },
  {
    id: 'cardcom-pci',
    name: 'Cardcom Zero-PCI (TokenizeInputSchema)',
    severity: 'P0',
    patterns: [
      { pattern: /\bcardNumber\s*[:=]\s*(?!undefined)/g, description: 'cardNumber field' },
      { pattern: /\bcvv\s*[:=]/g, description: 'cvv field' },
      { pattern: /\bcvc\s*[:=]/g, description: 'cvc field' },
      { pattern: /\bpan\s*[:=]\s*(?!undefined)(?!.*last)/g, description: 'pan field (full)' },
    ],
    excludeFiles: [
      /MASTER-PATCHES\.md$/,
      /verify-patches\.ts$/,
      /\.bak$/,
      /pci-validator/,
      /cardcom-production/,
    ],
    fileExts: ['.ts', '.tsx'],
    maxAllowed: 0,
  },
  {
    id: 'xss-unsanitized',
    name: 'XSS sanitizer (DOMPurify)',
    severity: 'P0',
    patterns: [
      // dangerouslySetInnerHTML ללא sanitize בקרבת מקום
      { pattern: /dangerouslySetInnerHTML\s*=\s*\{\{[^}]*__html\s*:\s*(?!.*sanitize)[^}]*\}\}/g, description: 'dangerouslySetInnerHTML without sanitize' },
    ],
    excludeFiles: [/MASTER-PATCHES\.md$/, /verify-patches\.ts$/, /\.bak$/, /xss-sanitizer/],
    fileExts: ['.tsx', '.ts'],
    maxAllowed: 0,
  },
  {
    id: 'audit-missing',
    name: 'Audit middleware injection',
    severity: 'P0',
    // הבדיקה כאן הפוכה — אנו רוצים שכל קובץ prisma יכלול attachPrismaAuditMiddleware
    patterns: [
      // PrismaClient נוצר ללא attach
      { pattern: /new\s+PrismaClient\s*\([^)]*\)(?![\s\S]{0,500}attachPrismaAuditMiddleware)/g, description: 'PrismaClient without audit middleware' },
    ],
    excludeFiles: [/MASTER-PATCHES\.md$/, /verify-patches\.ts$/, /\.bak$/, /audit-enforcement/, /\.test\.ts$/],
    fileExts: ['.ts'],
    maxAllowed: 0,
  },
  {
    id: 'old-imports',
    name: 'Imports מ-packages ישנים (@aneh-hashoel, @syncup)',
    severity: 'P1',
    patterns: [
      { pattern: /from\s+['"]@aneh-hashoel\//g, description: '@aneh-hashoel/* import' },
      { pattern: /from\s+['"]@aneh\//g, description: '@aneh/* import' },
      { pattern: /from\s+['"]@syncup\//g, description: '@syncup/* import' },
      { pattern: /require\(['"]@aneh-hashoel\//g, description: '@aneh-hashoel/* require' },
    ],
    excludeFiles: [/MASTER-PATCHES\.md$/, /verify-patches\.ts$/, /migrate-imports\.ts$/, /\.bak$/],
    fileExts: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    maxAllowed: 0,
  },
];

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.turbo', 'coverage',
]);

function walk(dir: string, files: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.patches-backup')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function shouldSkipFile(file: string, exts: string[], excludes?: RegExp[]): boolean {
  const ext = path.extname(file);
  const baseName = path.basename(file);
  if (!exts.some(e => baseName.endsWith(e) || ext === e)) return true;
  if (excludes) {
    for (const re of excludes) {
      if (re.test(file)) return true;
    }
  }
  return false;
}

function runChecks(root: string): { results: PatchResult[]; allFiles: number } {
  const files = walk(root);
  const results: PatchResult[] = [];

  for (const patch of PATCHES) {
    let totalHits = 0;
    const examples: PatchResult['examples'] = [];

    for (const file of files) {
      if (shouldSkipFile(file, patch.fileExts, patch.excludeFiles)) continue;

      let content: string;
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (const { pattern, description } of patch.patterns) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const matches = line.match(pattern);
          if (matches) {
            totalHits += matches.length;
            if (examples.length < 5) {
              examples.push({
                file: path.relative(root, file),
                line: i + 1,
                content: line.trim().substring(0, 200),
              });
            }
          }
          // reset lastIndex אם global
          if (pattern.flags.includes('g')) {
            pattern.lastIndex = 0;
          }
        }
      }
    }

    const status: PatchResult['status'] =
      totalHits <= patch.maxAllowed ? 'PASS' :
      patch.severity === 'P0' ? 'FAIL' : 'WARN';

    results.push({
      id: patch.id,
      name: patch.name,
      severity: patch.severity,
      status,
      hits: totalHits,
      maxAllowed: patch.maxAllowed,
      examples,
    });
  }

  return { results, allFiles: files.length };
}

function main(): void {
  const root = process.argv[2];
  if (!root) {
    console.error('Usage: ts-node verify-patches.ts <path-to-monorepo>');
    process.exit(2);
  }
  const absRoot = path.resolve(root);
  if (!fs.existsSync(absRoot) || !fs.statSync(absRoot).isDirectory()) {
    console.error(`ERROR: ${root} is not a directory`);
    process.exit(2);
  }

  const startedAt = new Date().toISOString();
  const { results, allFiles } = runChecks(absRoot);

  const failures = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const passes = results.filter(r => r.status === 'PASS').length;

  const overall: 'PASS' | 'FAIL' | 'WARN' =
    failures > 0 ? 'FAIL' : warnings > 0 ? 'WARN' : 'PASS';

  const report = {
    status: overall,
    startedAt,
    finishedAt: new Date().toISOString(),
    root: absRoot,
    summary: {
      filesScanned: allFiles,
      totalPatches: results.length,
      passed: passes,
      warnings,
      failed: failures,
    },
    patches: results,
  };

  console.log(JSON.stringify(report, null, 2));

  if (overall === 'FAIL') process.exit(1);
  process.exit(0);
}

main();
