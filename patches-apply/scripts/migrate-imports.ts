#!/usr/bin/env ts-node
/**
 * migrate-imports.ts — מחליף imports מ-packages ישנים לחדשים
 *
 * Usage:
 *   ts-node migrate-imports.ts <path-to-monorepo>
 *
 * מיפוי:
 *   @aneh-hashoel/*       → @catering/*
 *   @aneh/*               → @catering/*
 *   @catering/vat    → @catering/vat
 *   @catering/cardcom-production → @catering/cardcom-production
 *   @catering/icount-production  → @catering/icount-production
 *   @catering/privacy-portal     → @catering/privacy-portal
 *
 * כל קובץ ששונה נשמר ל-<file>.imports-bak.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ImportMapping {
  from: RegExp;
  to: string;
  desc: string;
}

const MAPPINGS: ImportMapping[] = [
  // @aneh-hashoel/* → @catering/*
  { from: /@aneh-hashoel\/auth\b/g, to: '@catering/auth', desc: 'auth' },
  { from: /@aneh-hashoel\/audit-enforcement\b/g, to: '@catering/audit-enforcement', desc: 'audit-enforcement' },
  { from: /@aneh-hashoel\/otp\b/g, to: '@catering/otp', desc: 'otp' },
  { from: /@aneh-hashoel\/jwt-config\b/g, to: '@catering/jwt-config', desc: 'jwt-config' },
  { from: /@aneh-hashoel\/cookies\b/g, to: '@catering/cookies', desc: 'cookies' },
  { from: /@aneh-hashoel\/2fa-enforcement\b/g, to: '@catering/2fa-enforcement', desc: '2fa-enforcement' },
  { from: /@aneh-hashoel\/xss-sanitizer\b/g, to: '@catering/xss-sanitizer', desc: 'xss-sanitizer' },
  { from: /@aneh-hashoel\/pci-validator\b/g, to: '@catering/pci-validator', desc: 'pci-validator' },
  { from: /@aneh-hashoel\/kms-client\b/g, to: '@catering/kms-client', desc: 'kms-client' },
  { from: /@aneh-hashoel\/privacy\b/g, to: '@catering/privacy', desc: 'privacy' },
  { from: /@aneh-hashoel\/consent-ledger\b/g, to: '@catering/consent-ledger', desc: 'consent-ledger' },
  { from: /@aneh-hashoel\/archival\b/g, to: '@catering/archival', desc: 'archival' },
  { from: /@aneh-hashoel\/invoicing-fallback\b/g, to: '@catering/invoicing-fallback', desc: 'invoicing-fallback' },
  { from: /@aneh-hashoel\/tax-reports\b/g, to: '@catering/tax-reports', desc: 'tax-reports' },

  // @aneh/* → @catering/*
  { from: /@aneh\/auth\b/g, to: '@catering/auth', desc: 'aneh/auth' },
  { from: /@aneh\/([a-z][a-z0-9-]*)/g, to: '@catering/$1', desc: 'aneh/* generic' },

  // @syncup/* → @catering/*
  { from: /@syncup\/vat-engine\b/g, to: '@catering/vat', desc: 'syncup vat-engine → vat' },
  { from: /@syncup\/cardcom-production\b/g, to: '@catering/cardcom-production', desc: 'cardcom-production' },
  { from: /@syncup\/icount-production\b/g, to: '@catering/icount-production', desc: 'icount-production' },
  { from: /@syncup\/privacy-portal\b/g, to: '@catering/privacy-portal', desc: 'privacy-portal' },

  // Old internal paths — security-fixes/packages/X → @catering/X
  // (אם נמצאו שימושים relative מפורשים)
  { from: /from\s+['"]\.\.\/\.\.\/security-fixes\/packages\/([a-z0-9-]+)\/?['"]/g,
    to: 'from \'@catering/$1\'',
    desc: 'relative security-fixes → @catering/*' },
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
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.json'].includes(ext)) {
        files.push(full);
      }
    }
  }
  return files;
}

interface FileChange {
  file: string;
  count: number;
  mappingsApplied: string[];
}

function run(root: string): void {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`ERROR: ${root} is not a directory`);
    process.exit(1);
  }

  console.log(`Scanning ${root}...`);
  const files = walk(root);
  console.log(`Found ${files.length} files to check`);

  const changes: FileChange[] = [];
  const mappingCounts = new Map<string, number>();

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const original = content;
    let fileTotalReplacements = 0;
    const mappingsApplied: string[] = [];

    for (const mapping of MAPPINGS) {
      const matches = content.match(mapping.from);
      if (matches) {
        content = content.replace(mapping.from, mapping.to);
        fileTotalReplacements += matches.length;
        mappingsApplied.push(`${mapping.desc} (${matches.length})`);
        mappingCounts.set(
          mapping.desc,
          (mappingCounts.get(mapping.desc) ?? 0) + matches.length,
        );
      }
    }

    if (fileTotalReplacements > 0) {
      // backup
      fs.writeFileSync(`${file}.imports-bak`, original, 'utf8');
      fs.writeFileSync(file, content, 'utf8');
      changes.push({ file, count: fileTotalReplacements, mappingsApplied });
      console.log(
        `  ✓ ${path.relative(root, file)} [${fileTotalReplacements} replacements]`,
      );
    }
  }

  console.log('\n================================================================');
  console.log(`Total files modified: ${changes.length}`);
  console.log('');
  console.log('Per-mapping totals:');
  for (const [desc, count] of [...mappingCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${desc}: ${count}`);
  }
  console.log('');
  console.log('Backup files: <original>.imports-bak — אפשר למחוק אחרי וריפיקציה');
  console.log('יש להריץ: pnpm install && pnpm typecheck');
  console.log('================================================================');
}

const root = process.argv[2];
if (!root) {
  console.error('Usage: ts-node migrate-imports.ts <path-to-monorepo>');
  process.exit(1);
}

run(path.resolve(root));
