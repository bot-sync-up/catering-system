/**
 * Reset — מחיקה מלאה של נתוני tenant=demo.
 * שימוש: tsx src/reset.ts --tenant=demo
 *
 * סדר המחיקה חשוב כדי לא להפר FK constraints.
 */
import { PrismaClient } from "@prisma/client";
import { did } from "./utils/ids.js";

interface Args {
  tenant: string;
}

function parseArgs(): Args {
  const args: Args = { tenant: "demo" };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--tenant=")) args.tenant = arg.slice("--tenant=".length);
  }
  return args;
}

async function deleteByTenant(prisma: PrismaClient, tenantId: string): Promise<void> {
  // סדר מחיקה: מהילדים אל ההורים
  const deletions = [
    () => prisma.timeEntry.deleteMany({ where: { tenantId } }),
    () => prisma.shift.deleteMany({ where: { tenantId } }),
    () => prisma.payrollRecord.deleteMany({ where: { tenantId } }),
    () => prisma.vacationBalance.deleteMany({ where: { tenantId } }),
    () => prisma.evaluation.deleteMany({ where: { tenantId } }),
    () => prisma.staffAssignment.deleteMany({ where: { tenantId } }),
    () => prisma.delivery.deleteMany({ where: { tenantId } }),
    () => prisma.receipt.deleteMany({ where: { tenantId } }),
    () => prisma.payment.deleteMany({ where: { tenantId } }),
    () => prisma.invoice.deleteMany({ where: { tenantId } }),
    () => prisma.expense.deleteMany({ where: { tenantId } }),
    () => prisma.pettyCash.deleteMany({ where: { tenantId } }),
    () => prisma.bankTransaction.deleteMany({ where: { tenantId } }),
    () => prisma.orderItem.deleteMany({ where: { tenantId } }),
    () => prisma.task.deleteMany({ where: { tenantId } }),
    () => prisma.note.deleteMany({ where: { tenantId } }),
    () => prisma.document.deleteMany({ where: { tenantId } }),
    () => prisma.event.deleteMany({ where: { tenantId } }),
    () => prisma.menuItem.deleteMany({ where: { tenantId } }),
    () => prisma.menu.deleteMany({ where: { tenantId } }),
    () => prisma.venue.deleteMany({ where: { tenantId } }),
    () => prisma.recipeIngredient.deleteMany({ where: { tenantId } }),
    () => prisma.recipeVersion.deleteMany({ where: { tenantId } }),
    () => prisma.recipe.deleteMany({ where: { tenantId } }),
    () => prisma.supplierPrice.deleteMany({ where: { tenantId } }),
    () => prisma.supplierInvoice.deleteMany({ where: { tenantId } }),
    () => prisma.purchaseOrder.deleteMany({ where: { tenantId } }),
    () => prisma.supplier.deleteMany({ where: { tenantId } }),
    () => prisma.inventoryMovement.deleteMany({ where: { tenantId } }),
    () => prisma.stockLevel.deleteMany({ where: { tenantId } }),
    () => prisma.product.deleteMany({ where: { tenantId } }),
    () => prisma.category.deleteMany({ where: { tenantId } }),
    () => prisma.customerTag.deleteMany({ where: { tenantId } }),
    () => prisma.tag.deleteMany({ where: { tenantId } }),
    () => prisma.lead.deleteMany({ where: { tenantId } }),
    () => prisma.campaign.deleteMany({ where: { tenantId } }),
    () => prisma.testimonial.deleteMany({ where: { tenantId } }),
    () => prisma.gallery.deleteMany({ where: { tenantId } }),
    () => prisma.portfolio.deleteMany({ where: { tenantId } }),
    () => prisma.address.deleteMany({ where: { tenantId } }),
    () => prisma.contactPerson.deleteMany({ where: { tenantId } }),
    () => prisma.employee.deleteMany({ where: { tenantId } }),
    () => prisma.customer.deleteMany({ where: { tenantId } }),
    () => prisma.vehicle.deleteMany({ where: { tenantId } }),
    () => prisma.budgetCategory.deleteMany({ where: { tenantId } }),
    () => prisma.notification.deleteMany({ where: { tenantId } }),
    () => prisma.integrationLog.deleteMany({ where: { tenantId } }),
    () => prisma.webhook.deleteMany({ where: { tenantId } }),
    () => prisma.featureFlag.deleteMany({ where: { tenantId } }),
    () => prisma.session.deleteMany({ where: { tenantId } }),
    () => prisma.apiKey.deleteMany({ where: { tenantId } }),
    () => prisma.auditLog.deleteMany({ where: { tenantId } }),
    () => prisma.userRole.deleteMany({ where: { tenantId } }),
    () => prisma.rolePermission.deleteMany({ where: { tenantId } }),
    () => prisma.role.deleteMany({ where: { tenantId } }),
    () => prisma.user.deleteMany({ where: { tenantId } }),
    () => prisma.tenant.deleteMany({ where: { id: tenantId } }),
  ];

  for (const action of deletions) {
    try {
      await action();
    } catch (err) {
      console.warn("[reset] ⚠️", (err as Error).message);
    }
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  const tenantId = did(`tenant:${args.tenant}`);
  const prisma = new PrismaClient();

  console.log(`[reset] מוחק נתוני tenant="${args.tenant}" (${tenantId})`);
  await deleteByTenant(prisma, tenantId);
  await prisma.$disconnect();
  console.log("[reset] הושלם.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[reset] ❌", err);
    process.exit(1);
  });
}

export { deleteByTenant };
