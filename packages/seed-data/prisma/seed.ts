/**
 * Master seed — מריץ את כל מודולי ה-seed לפי הסדר הנכון של תלויות.
 *
 * שימוש:
 *   tsx prisma/seed.ts --tenant=demo --scale=small
 *   tsx prisma/seed.ts --tenant=demo --scale=medium
 *   tsx prisma/seed.ts --tenant=demo --scale=large
 */
import { PrismaClient } from "@prisma/client";
import { setIdNamespace } from "../src/utils/ids.js";
import { setRngSeed } from "../src/utils/rng.js";
import { scaleFactor, type Scale, type SeedContext } from "../src/context.js";
import { seedTenant } from "../src/setup/tenant.js";
import { seedRolesAndPermissions } from "../src/setup/roles.js";
import { seedUsers } from "../src/setup/users.js";
import { seedSuppliers } from "../src/data/suppliers.js";
import { seedProducts } from "../src/data/products.js";
import { seedRecipes } from "../src/data/recipes.js";
import { seedMenus } from "../src/data/menus.js";
import { seedMenuItems } from "../src/data/menu-items.js";
import { seedCustomers } from "../src/data/customers.js";
import { seedContacts } from "../src/data/contacts.js";
import { seedAddresses } from "../src/data/addresses.js";
import { seedLeads } from "../src/data/leads.js";
import { seedSegments } from "../src/data/segments.js";
import { seedEvents } from "../src/data/events.js";
import { seedOrderItems } from "../src/data/orders.js";
import { seedInvoices } from "../src/data/invoices.js";
import { seedPayments } from "../src/data/payments.js";
import { seedEmployees } from "../src/data/employees.js";
import { seedShifts } from "../src/data/shifts.js";
import { seedPayroll } from "../src/data/payroll.js";
import { seedVehicles } from "../src/data/vehicles.js";
import { seedDeliveries } from "../src/data/deliveries.js";
import { seedCoa } from "../src/data/coa.js";
import { seedExpenses } from "../src/data/expenses.js";
import { seedCampaigns } from "../src/data/campaigns.js";
import { seedTestimonials } from "../src/data/testimonials.js";
import { seedGallery } from "../src/data/gallery.js";

interface Args {
  tenant: string;
  scale: Scale;
}

function parseArgs(): Args {
  const args: Args = { tenant: "demo", scale: "medium" };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--tenant=")) args.tenant = arg.slice("--tenant=".length);
    else if (arg.startsWith("--scale=")) {
      const v = arg.slice("--scale=".length);
      if (v === "small" || v === "medium" || v === "large") args.scale = v;
      else throw new Error(`scale חייב להיות small/medium/large, התקבל "${v}"`);
    }
  }
  return args;
}

async function run(): Promise<void> {
  const args = parseArgs();
  console.log(`[seed] 🌱 התחלת זריעה — tenant="${args.tenant}", scale="${args.scale}"`);

  setIdNamespace(`aneh:${args.tenant}`);
  setRngSeed(`aneh:${args.tenant}:${args.scale}`);

  const prisma = new PrismaClient();
  try {
    const tenant = await seedTenant(prisma, args.tenant);
    console.log(`[seed] ✅ tenant: ${tenant.hebrewName}`);

    const ctx: SeedContext = {
      prisma,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      scale: args.scale,
      factor: scaleFactor(args.scale),
    };

    await seedRolesAndPermissions(ctx);
    console.log(`[seed] ✅ roles + permissions`);

    const users = await seedUsers(ctx);
    console.log(`[seed] ✅ ${users.length} users`);

    const employees = await seedEmployees(ctx, users);
    console.log(`[seed] ✅ ${employees.length} employees`);

    const suppliers = await seedSuppliers(ctx);
    console.log(`[seed] ✅ ${suppliers.length} suppliers`);

    const products = await seedProducts(ctx, suppliers);
    console.log(`[seed] ✅ ${products.length} products (+ stock + supplier prices)`);

    const recipes = await seedRecipes(ctx, products);
    console.log(`[seed] ✅ ${recipes.length} recipes`);

    const menus = await seedMenus(ctx);
    console.log(`[seed] ✅ ${menus.length} menus`);

    await seedMenuItems(ctx, menus, recipes);
    console.log(`[seed] ✅ menu items`);

    await seedSegments(ctx);
    console.log(`[seed] ✅ segments / tags`);

    const customers = await seedCustomers(ctx);
    console.log(`[seed] ✅ ${customers.length} customers`);

    await seedContacts(ctx, customers);
    console.log(`[seed] ✅ contacts`);

    await seedAddresses(ctx, customers);
    console.log(`[seed] ✅ addresses`);

    const salesUserIds = users.filter((u) => u.role === "sales").map((u) => u.id);
    await seedLeads(ctx, customers, salesUserIds);
    console.log(`[seed] ✅ leads`);

    const events = await seedEvents(ctx, customers, menus);
    console.log(`[seed] ✅ ${events.length} events (past/present/future)`);

    await seedOrderItems(ctx, events, recipes);
    console.log(`[seed] ✅ order items`);

    const invoices = await seedInvoices(ctx, events);
    console.log(`[seed] ✅ ${invoices.length} invoices`);

    await seedPayments(ctx, invoices);
    console.log(`[seed] ✅ payments + receipts`);

    await seedShifts(ctx, employees);
    console.log(`[seed] ✅ shifts + time entries`);

    await seedPayroll(ctx, employees);
    console.log(`[seed] ✅ payroll records`);

    const vehicles = await seedVehicles(ctx);
    console.log(`[seed] ✅ ${vehicles.length} vehicles`);

    await seedDeliveries(ctx, events, vehicles, employees);
    console.log(`[seed] ✅ deliveries`);

    const budgetCats = await seedCoa(ctx);
    console.log(`[seed] ✅ ${budgetCats.length} budget categories (CoA)`);

    await seedExpenses(ctx, events, vehicles, budgetCats);
    console.log(`[seed] ✅ expenses`);

    await seedCampaigns(ctx);
    console.log(`[seed] ✅ campaigns`);

    await seedTestimonials(ctx);
    console.log(`[seed] ✅ testimonials`);

    await seedGallery(ctx);
    console.log(`[seed] ✅ gallery`);

    console.log(`[seed] 🎉 הזריעה הושלמה בהצלחה.`);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error("[seed] ❌ נכשל:", err);
  process.exit(1);
});
