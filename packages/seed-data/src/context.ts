/**
 * סוגי עזר משותפים והקשר הזרעה.
 */
import type { PrismaClient } from "@prisma/client";

export type Scale = "small" | "medium" | "large";

export interface SeedContext {
  prisma: PrismaClient;
  tenantId: string;
  tenantSlug: string;
  scale: Scale;
  /** מקדם כפל לקנה מידה — small=0.1, medium=0.5, large=1.0 */
  factor: number;
}

export interface ScaleConfig {
  customers: number;
  leads: number;
  events: number;
  pastEvents: number;
  presentEvents: number;
  futureEvents: number;
  menus: number;
  menuItems: number;
  recipes: number;
  products: number;
  suppliers: number;
  shifts: number;
  deliveries: number;
  vehicles: number;
  campaigns: number;
  testimonials: number;
  gallery: number;
}

export function scaleFactor(scale: Scale): number {
  return { small: 0.1, medium: 0.5, large: 1.0 }[scale];
}

/** מחזיר מספר מותאם לקנה מידה (מינימום 1) */
export function scaled(baseline: number, factor: number): number {
  return Math.max(1, Math.round(baseline * factor));
}
