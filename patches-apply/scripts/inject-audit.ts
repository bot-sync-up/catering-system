#!/usr/bin/env ts-node
/**
 * inject-audit.ts — מזריק audit middleware לכל מופע של PrismaClient
 *
 * Usage:
 *   ts-node inject-audit.ts <path-to-monorepo>
 *
 * הסקריפט מוצא:
 *   - קבצים שמכילים `new PrismaClient()` (singleton creation)
 *   - קבצים שמייצאים `export const prisma`
 *
 * ומוסיף:
 *   - import { attachPrismaAuditMiddleware } from '@catering/audit-enforcement'
 *   - attachPrismaAuditMiddleware(prisma, { ... })
 *
 * + מזריק audit-context middleware ל-server.ts/app.ts (Express).
 */

import * as fs from 'fs';
import * as path from 'path';

interface ModifyResult {
  file: string;
  before: string;
  after: string;
  changes: string[];
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.turbo', 'coverage',
  '.patches-backup',
]);

const PRISMA_FILE_NAMES = [
  'prisma.ts', 'db.ts', 'database.ts', 'client.ts',
];

const SERVER_FILE_NAMES = [
  'server.ts', 'app.ts', 'index.ts', 'main.ts', 'bootstrap.ts',
];

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
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))
    ) {
      files.push(full);
    }
  }
  return files;
}

function hasAuditAlready(content: string): boolean {
  return (
    content.includes('attachPrismaAuditMiddleware') ||
    content.includes('@catering/audit-enforcement') ||
    content.includes('@aneh-hashoel/audit-enforcement')
  );
}

function isPrismaClientFile(content: string): boolean {
  // קבצים שיוצרים PrismaClient או מייצאים prisma singleton
  return (
    /new\s+PrismaClient\s*\(/m.test(content) &&
    /export\s+(const|default)\s+prisma\b/.test(content)
  );
}

function isServerFile(filePath: string, content: string): boolean {
  const name = path.basename(filePath);
  if (!SERVER_FILE_NAMES.includes(name)) return false;
  return (
    /import\s+express/.test(content) ||
    /from\s+['"]express['"]/.test(content) ||
    /createServer/.test(content) ||
    /app\.listen/.test(content)
  );
}

function injectIntoPrismaFile(content: string): { content: string; changed: boolean } {
  if (hasAuditAlready(content)) {
    return { content, changed: false };
  }
  if (!isPrismaClientFile(content)) {
    return { content, changed: false };
  }

  let modified = content;
  const changes: string[] = [];

  // 1) הוספת import
  const importLine = `import { attachPrismaAuditMiddleware } from '@catering/audit-enforcement';`;
  if (!modified.includes(importLine)) {
    // אחרי ה-import של PrismaClient
    modified = modified.replace(
      /(import\s+\{[^}]*PrismaClient[^}]*\}\s+from\s+['"]@prisma\/client['"]\s*;?)/,
      `$1\n${importLine}`,
    );
    changes.push('added import');
  }

  // 2) הוספת attach אחרי export const prisma = new PrismaClient(...)
  const attachBlock = `
attachPrismaAuditMiddleware(prisma, {
  // ראה: packages/audit-enforcement/INTEGRATION-GUIDE.md
  excludeModels: ['AuditLog', 'LoginAttempt', 'SensitiveAccess'],
});
`;

  // מחפש את ה-export ומוסיף אחריו
  const exportRegex = /(export\s+const\s+prisma\s*=\s*new\s+PrismaClient\s*\([^)]*\)\s*;?)/;
  if (exportRegex.test(modified) && !modified.includes('attachPrismaAuditMiddleware(')) {
    modified = modified.replace(exportRegex, `$1\n${attachBlock}`);
    changes.push('added attachPrismaAuditMiddleware call');
  }

  return { content: modified, changed: changes.length > 0 };
}

function injectIntoServerFile(content: string): { content: string; changed: boolean } {
  if (hasAuditAlready(content)) {
    return { content, changed: false };
  }
  if (!/app\.use\(|router\.use\(/.test(content)) {
    return { content, changed: false };
  }

  let modified = content;
  const importLine = `import { auditContextMiddleware } from '@catering/audit-enforcement';`;

  if (!modified.includes('auditContextMiddleware')) {
    // הוסף import אחרי ה-import של express
    const expressImport = /(import\s+(?:express|.+?from\s+['"]express['"])[^\n]*\n)/;
    if (expressImport.test(modified)) {
      modified = modified.replace(expressImport, `$1${importLine}\n`);
    } else {
      modified = `${importLine}\n${modified}`;
    }

    // הוסף app.use(auditContextMiddleware()) אחרי app.use(express.json())
    const middlewareInsert = /(app\.use\(\s*express\.json\(\)\s*\)\s*;?)/;
    if (middlewareInsert.test(modified)) {
      modified = modified.replace(
        middlewareInsert,
        `$1\napp.use(auditContextMiddleware());`,
      );
    } else {
      // נסה הוספה לפני הראשון app.use
      modified = modified.replace(
        /(app\.use\()/,
        `app.use(auditContextMiddleware());\n$1`,
      );
    }
    return { content: modified, changed: true };
  }

  return { content: modified, changed: false };
}

function run(root: string): void {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`ERROR: ${root} is not a directory`);
    process.exit(1);
  }

  console.log(`Scanning ${root}...`);
  const files = walk(root);
  console.log(`Found ${files.length} .ts/.tsx files`);

  const modified: ModifyResult[] = [];
  let prismaInjected = 0;
  let serverInjected = 0;

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const before = content;
    const changes: string[] = [];

    // Prisma injection
    const prismaResult = injectIntoPrismaFile(content);
    if (prismaResult.changed) {
      content = prismaResult.content;
      changes.push('prisma-attach');
      prismaInjected++;
    }

    // Server injection
    const serverResult = injectIntoServerFile(content);
    if (serverResult.changed) {
      content = serverResult.content;
      changes.push('server-context-middleware');
      serverInjected++;
    }

    if (changes.length > 0) {
      // backup
      fs.writeFileSync(`${file}.audit-bak`, before, 'utf8');
      // write modified
      fs.writeFileSync(file, content, 'utf8');
      modified.push({ file, before, after: content, changes });
      console.log(`  ✓ ${path.relative(root, file)} [${changes.join(', ')}]`);
    }
  }

  console.log('\n================================================================');
  console.log(`Total modified: ${modified.length}`);
  console.log(`  Prisma client files:  ${prismaInjected}`);
  console.log(`  Server/app files:     ${serverInjected}`);
  console.log('');
  console.log('Backup files: <original>.audit-bak — אפשר למחוק אחרי וריפיקציה');
  console.log('יש להריץ: pnpm install && pnpm typecheck');
  console.log('================================================================');
}

const root = process.argv[2];
if (!root) {
  console.error('Usage: ts-node inject-audit.ts <path-to-monorepo>');
  process.exit(1);
}

run(path.resolve(root));
