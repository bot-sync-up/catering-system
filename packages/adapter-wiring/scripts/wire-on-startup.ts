/**
 * wire-on-startup.ts
 *
 * סקריפט שמוסיף `subscribeAll()` (או הקריאות per-app הרלוונטיות)
 * ל-`app.ts` של כל שירות. בודק אם הקריאה כבר קיימת ואם לא מזריק
 * את ה-imports ואת ה-bootstrap code בסוף הקובץ.
 *
 * שימוש:
 *   pnpm tsx scripts/wire-on-startup.ts \
 *     --service crm \
 *     --app ../../apps/crm/src/app.ts \
 *     --write
 *
 * נתמכים: crm, orders, finance, portal, inventory, hr, all (מעטף כולל)
 */

import { readFile, writeFile } from 'node:fs/promises';

const SERVICE_TEMPLATES: Record<string, { import: string; bootstrap: string }> = {
  crm: {
    import: `import { registerCrmSubscriptions } from '@catering/adapter-wiring/subscribers';`,
    bootstrap: `
// ── EventBus wiring (auto-injected) ─────────────────────────────
export async function bootstrapEventWiring(bus, deps) {
  return registerCrmSubscriptions({
    bus,
    redisUrl: process.env.REDIS_URL!,
    finance: deps.finance,
    crm: deps.crm,
  });
}
`,
  },
  orders: {
    import: `import { registerOrdersSubscriptions } from '@catering/adapter-wiring/subscribers';`,
    bootstrap: `
// ── EventBus wiring (auto-injected) ─────────────────────────────
export async function bootstrapEventWiring(bus, deps) {
  return registerOrdersSubscriptions({
    bus,
    redisUrl: process.env.REDIS_URL!,
    invoice: deps.invoice,
    ordersLookup: deps.ordersLookup,
    kitchen: deps.kitchen,
    scheduler: deps.scheduler,
    logistics: deps.logistics,
  });
}
`,
  },
  finance: {
    import: `import { registerFinanceSubscriptions } from '@catering/adapter-wiring/subscribers';`,
    bootstrap: `
// ── EventBus wiring (auto-injected) ─────────────────────────────
export async function bootstrapEventWiring(bus, deps) {
  return registerFinanceSubscriptions({
    bus,
    redisUrl: process.env.REDIS_URL!,
    icount: deps.icount,
    cardcom: deps.cardcom,
    finance: deps.finance,
    glAccount: process.env.ICOUNT_GL_ACCOUNT,
  });
}
`,
  },
  portal: {
    import: `import { registerPortalSubscriptions } from '@catering/adapter-wiring/subscribers';`,
    bootstrap: `
// ── EventBus wiring (auto-injected) ─────────────────────────────
export async function bootstrapEventWiring(bus, deps) {
  return registerPortalSubscriptions({
    bus,
    redisUrl: process.env.REDIS_URL!,
    orders: deps.orders,
  });
}
`,
  },
  inventory: {
    import: `import { registerInventorySubscriptions } from '@catering/adapter-wiring/subscribers';`,
    bootstrap: `
// ── EventBus wiring (auto-injected) ─────────────────────────────
export async function bootstrapEventWiring(bus, deps) {
  return registerInventorySubscriptions({
    bus,
    redisUrl: process.env.REDIS_URL!,
    purchasing: deps.purchasing,
  });
}
`,
  },
  hr: {
    import: `import { registerHrSubscriptions } from '@catering/adapter-wiring/subscribers';`,
    bootstrap: `
// ── EventBus wiring (auto-injected) ─────────────────────────────
export async function bootstrapEventWiring(bus, deps) {
  return registerHrSubscriptions({
    bus,
    redisUrl: process.env.REDIS_URL!,
    payroll: deps.payroll,
  });
}
`,
  },
  all: {
    import: `import { subscribeAll } from '@catering/adapter-wiring/subscribers';`,
    bootstrap: `
// ── EventBus wiring (auto-injected) - מעטף כולל ─────────────────
export async function bootstrapEventWiring(bus, clients) {
  return subscribeAll({
    bus,
    redisUrl: process.env.REDIS_URL!,
    clients,
  });
}
`,
  },
};

const INJECTED_MARKER = 'bootstrapEventWiring';

async function injectIntoAppFile(
  appPath: string,
  service: string,
  write: boolean,
): Promise<void> {
  const template = SERVICE_TEMPLATES[service];
  if (!template) {
    throw new Error(
      `service לא ידוע: ${service}. אופציות: ${Object.keys(SERVICE_TEMPLATES).join(', ')}`,
    );
  }

  let content = await readFile(appPath, 'utf8');
  if (content.includes(INJECTED_MARKER)) {
    console.log(`[skip] ${appPath} - כבר מחווט`);
    return;
  }

  // imports למעלה (לאחר ה-imports הקיימים)
  const importInsertIdx = (() => {
    const lines = content.split('\n');
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i].trim())) lastImport = i;
    }
    return lastImport;
  })();

  const lines = content.split('\n');
  if (importInsertIdx >= 0) {
    lines.splice(importInsertIdx + 1, 0, template.import);
  } else {
    lines.unshift(template.import);
  }
  content = lines.join('\n') + '\n' + template.bootstrap;

  if (write) {
    await writeFile(appPath, content, 'utf8');
    console.log(`[ok ]  ${appPath} - הוזרק`);
  } else {
    console.log(`[dry] ${appPath} - יוזרק (הוסף --write)`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const serviceIdx = args.indexOf('--service');
  const appIdx = args.indexOf('--app');
  const write = args.includes('--write');

  if (serviceIdx < 0 || appIdx < 0) {
    console.error('usage: wire-on-startup --service <name> --app <path> [--write]');
    process.exit(1);
  }

  const service = args[serviceIdx + 1];
  const appPath = args[appIdx + 1];
  await injectIntoAppFile(appPath, service, write);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
