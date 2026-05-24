/**
 * תפקידים והרשאות — system roles + assignments למשתמשים.
 */
import type { PrismaClient } from "@prisma/client";
import { did } from "../utils/ids.js";
import type { SeedContext } from "../context.js";

export const ROLE_DEFINITIONS = [
  { name: "owner", displayName: "מנכ\"ל / בעלים", description: "גישה מלאה" },
  { name: "manager", displayName: "מנהל תפעול", description: "ניהול אירועים וצוות" },
  { name: "chef", displayName: "שף", description: "ניהול מטבח, מתכונים ותפריטים" },
  { name: "sales", displayName: "סוכן מכירות", description: "לידים, לקוחות והזמנות" },
  { name: "driver", displayName: "נהג", description: "משלוחים וצי רכב" },
  { name: "waiter", displayName: "מלצר", description: "צוות אירועים בשטח" },
  { name: "accountant", displayName: "רואה חשבון", description: "כספים, חשבוניות ושכר" },
] as const;

export const PERMISSIONS = [
  { resource: "events", action: "read" },
  { resource: "events", action: "write" },
  { resource: "events", action: "delete" },
  { resource: "customers", action: "read" },
  { resource: "customers", action: "write" },
  { resource: "invoices", action: "read" },
  { resource: "invoices", action: "write" },
  { resource: "payroll", action: "read" },
  { resource: "payroll", action: "write" },
  { resource: "menus", action: "read" },
  { resource: "menus", action: "write" },
  { resource: "deliveries", action: "read" },
  { resource: "deliveries", action: "write" },
  { resource: "reports", action: "read" },
];

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  owner: ["events", "customers", "invoices", "payroll", "menus", "deliveries", "reports"],
  manager: ["events", "customers", "menus", "deliveries", "reports"],
  chef: ["menus", "events"],
  sales: ["customers", "events", "invoices"],
  driver: ["deliveries"],
  waiter: ["events"],
  accountant: ["invoices", "payroll", "reports"],
};

export async function seedRolesAndPermissions(ctx: SeedContext): Promise<void> {
  const { prisma, tenantId } = ctx;

  // Roles
  for (const role of ROLE_DEFINITIONS) {
    const id = did(`role:${tenantId}:${role.name}`);
    await prisma.role.upsert({
      where: { id },
      update: { displayName: role.displayName, description: role.description },
      create: {
        id,
        tenantId,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isSystem: true,
      },
    });
  }

  // Permissions (global — tenantId nullable)
  for (const perm of PERMISSIONS) {
    const id = did(`perm:${perm.resource}:${perm.action}`);
    await prisma.permission.upsert({
      where: { id },
      update: {},
      create: {
        id,
        resource: perm.resource,
        action: perm.action,
        description: `${perm.action} ${perm.resource}`,
      },
    });
  }

  // RolePermissions
  for (const [roleName, resources] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = did(`role:${tenantId}:${roleName}`);
    for (const resource of resources) {
      const actions = ["read", "write"];
      if (roleName === "owner") actions.push("delete");
      for (const action of actions) {
        const permId = did(`perm:${resource}:${action}`);
        const exists = await prisma.permission.findUnique({ where: { id: permId } });
        if (!exists) continue;
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId: permId } },
          update: {},
          create: { roleId, permissionId: permId, tenantId },
        });
      }
    }
  }
}

/** מקצה role למשתמש */
export async function assignRole(
  ctx: SeedContext,
  userId: string,
  roleName: string,
): Promise<void> {
  const roleId = did(`role:${ctx.tenantId}:${roleName}`);
  await ctx.prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId, tenantId: ctx.tenantId },
  });
}
