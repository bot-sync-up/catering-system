/**
 * setup-tenant.ts
 *
 * One-shot bootstrap script for a brand new tenant.
 * Creates: tenant record, default admin user, default roles,
 * default tax rate, default business hours, default price list,
 * and a sample "Welcome" customer + order.
 *
 * Usage:
 *   npx ts-node scripts/setup-tenant.ts \
 *       --slug acme \
 *       --name "Acme Catering Ltd." \
 *       --admin-email admin@acme.co.il \
 *       --admin-name "ישראל ישראלי" \
 *       --plan growth \
 *       [--with-sample-data]
 */

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import minimist from "minimist";

const prisma = new PrismaClient();

interface RunOptions {
  slug: string;
  name: string;
  adminEmail: string;
  adminName: string;
  plan: "starter" | "growth" | "pro" | "enterprise";
  withSampleData: boolean;
}

function parseArgs(): RunOptions {
  const argv = minimist(process.argv.slice(2));
  const required = ["slug", "name", "admin-email", "admin-name"] as const;
  for (const k of required) {
    if (!argv[k]) {
      console.error(`Missing required arg: --${k}`);
      process.exit(1);
    }
  }
  return {
    slug: String(argv.slug),
    name: String(argv.name),
    adminEmail: String(argv["admin-email"]),
    adminName: String(argv["admin-name"]),
    plan: (argv.plan || "growth") as RunOptions["plan"],
    withSampleData: Boolean(argv["with-sample-data"]),
  };
}

function generateTempPassword(): string {
  return crypto.randomBytes(12).toString("base64").replace(/[/+=]/g, "").slice(0, 16);
}

async function createTenant(opts: RunOptions) {
  const existing = await prisma.tenant.findUnique({ where: { slug: opts.slug } });
  if (existing) {
    throw new Error(`Tenant '${opts.slug}' already exists.`);
  }
  return prisma.tenant.create({
    data: {
      slug: opts.slug,
      name: opts.name,
      plan: opts.plan,
      timezone: "Asia/Jerusalem",
      currency: "ILS",
      locale: "he-IL",
      settings: {
        rtl: true,
        vatRate: 18,
        weekStartsOn: 0,
        defaultPriceList: "Standard",
      },
    },
  });
}

async function createDefaultRoles(tenantId: string) {
  const roles = [
    { name: "tenant_admin", description: "מנהל ארגון" },
    { name: "manager", description: "מנהל" },
    { name: "chef", description: "שף" },
    { name: "kitchen_staff", description: "צוות מטבח" },
    { name: "driver", description: "נהג" },
    { name: "accountant", description: "חשבונאות" },
    { name: "customer_support", description: "שירות לקוחות" },
    { name: "viewer", description: "צופה בלבד" },
  ];

  const created = [];
  for (const r of roles) {
    created.push(
      await prisma.role.create({
        data: { tenantId, name: r.name, description: r.description, isBuiltIn: true },
      }),
    );
  }
  return created;
}

async function createAdminUser(
  tenantId: string,
  email: string,
  name: string,
  roleId: string,
) {
  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: email.toLowerCase(),
      name,
      passwordHash: hash,
      mustChangePassword: true,
      isActive: true,
      roles: { create: [{ roleId }] },
    },
  });

  return { user, tempPassword };
}

async function createDefaultPriceList(tenantId: string) {
  return prisma.priceList.create({
    data: { tenantId, name: "Standard", isDefault: true, currency: "ILS" },
  });
}

async function createBusinessHours(tenantId: string) {
  const hours = [
    { dayOfWeek: 0, openTime: "08:00", closeTime: "21:00" }, // Sunday
    { dayOfWeek: 1, openTime: "08:00", closeTime: "21:00" },
    { dayOfWeek: 2, openTime: "08:00", closeTime: "21:00" },
    { dayOfWeek: 3, openTime: "08:00", closeTime: "21:00" },
    { dayOfWeek: 4, openTime: "08:00", closeTime: "21:00" },
    { dayOfWeek: 5, openTime: "08:00", closeTime: "14:00" }, // Friday
    { dayOfWeek: 6, openTime: null, closeTime: null }, // Saturday
  ];
  for (const h of hours) {
    await prisma.businessHour.create({
      data: { tenantId, ...h, isClosed: h.openTime === null },
    });
  }
}

async function createSampleData(tenantId: string) {
  const customer = await prisma.customer.create({
    data: {
      tenantId,
      name: "לקוח דוגמא",
      phone: "0501234567",
      email: "demo@example.com",
      type: "private",
    },
  });

  const menu = await prisma.menu.create({
    data: { tenantId, name: "Main Menu", isActive: true },
  });
  const category = await prisma.menuCategory.create({
    data: { menuId: menu.id, name: "מנות עיקריות", sortOrder: 0 },
  });
  const item = await prisma.menuItem.create({
    data: {
      tenantId,
      menuId: menu.id,
      categoryId: category.id,
      name: "מנה לדוגמא",
      price: 65,
      prepTimeMin: 20,
      isActive: true,
      kosherLevel: "regular",
    },
  });

  await prisma.order.create({
    data: {
      tenantId,
      customerId: customer.id,
      status: "delivered",
      total: 65,
      items: { create: [{ menuItemId: item.id, quantity: 1, unitPrice: 65, total: 65 }] },
    },
  });
}

async function main() {
  const opts = parseArgs();
  console.log(`Bootstrapping tenant: ${opts.slug} (${opts.name})`);

  const tenant = await createTenant(opts);
  console.log(`Tenant created: ${tenant.id}`);

  const roles = await createDefaultRoles(tenant.id);
  console.log(`Roles created: ${roles.length}`);

  const adminRole = roles.find((r) => r.name === "tenant_admin")!;
  const { user, tempPassword } = await createAdminUser(
    tenant.id,
    opts.adminEmail,
    opts.adminName,
    adminRole.id,
  );
  console.log(`Admin user created: ${user.email}`);

  await createDefaultPriceList(tenant.id);
  await createBusinessHours(tenant.id);
  console.log("Defaults provisioned.");

  if (opts.withSampleData) {
    await createSampleData(tenant.id);
    console.log("Sample data created.");
  }

  console.log("\n=========================================");
  console.log(" TENANT BOOTSTRAP COMPLETE");
  console.log("=========================================");
  console.log(` Tenant slug   : ${opts.slug}`);
  console.log(` Admin email   : ${opts.adminEmail}`);
  console.log(` Temp password : ${tempPassword}`);
  console.log(` Login URL     : https://app.yourdomain.com`);
  console.log("=========================================");
  console.log(" Send temp password to admin via secure");
  console.log(" channel. They will be forced to change");
  console.log(" it on first login.");
  console.log("=========================================\n");
}

main()
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
