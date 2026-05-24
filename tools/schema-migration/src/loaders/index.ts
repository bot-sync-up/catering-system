/**
 * נתיב כללי ל־loaders. routeLoad מנתב לפי targetModel.
 */
import type { LoaderOptions } from "./base.js";
import type { LoadResult, TransformedRecord } from "../types.js";
import { CustomerLoader } from "./loadCustomer.js";
import { OrderLoader } from "./loadOrder.js";
import { InvoiceLoader } from "./loadInvoice.js";

const customerLoader = new CustomerLoader();
const orderLoader = new OrderLoader();
const invoiceLoader = new InvoiceLoader();

/** Loader גנרי — מספיק טוב לכל המודלים שאין להם loader ייעודי. */
class GenericLoader {
  constructor(public readonly targetModel: string, private readonly delegate: string) {}

  async load<T extends Record<string, unknown>>(
    rec: TransformedRecord<T>,
    opts: LoaderOptions,
  ): Promise<LoadResult> {
    const { prisma, dryRun } = opts;
    const { data } = rec;
    if (dryRun) {
      return {
        __meta: rec.__meta,
        targetModel: this.targetModel as LoadResult["targetModel"],
        newId: (data["id"] as string) ?? "",
        action: "skipped",
      };
    }
    try {
      const model = (prisma as unknown as Record<string, GenericModel>)[this.delegate];
      const id = (data["id"] as string) ?? "";
      const existing = id ? await model.findUnique({ where: { id } }) : null;
      if (existing) {
        await model.update({ where: { id: existing.id }, data });
        return {
          __meta: rec.__meta,
          targetModel: this.targetModel as LoadResult["targetModel"],
          newId: existing.id,
          action: "updated",
        };
      }
      const created = await model.create({ data });
      return {
        __meta: rec.__meta,
        targetModel: this.targetModel as LoadResult["targetModel"],
        newId: created.id,
        action: "inserted",
      };
    } catch (err) {
      return {
        __meta: rec.__meta,
        targetModel: this.targetModel as LoadResult["targetModel"],
        newId: (data["id"] as string) ?? "",
        action: "skipped",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

interface GenericModel {
  findUnique(args: { where: { id: string } }): Promise<{ id: string } | null>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }>;
  create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
}

const employeeLoader = new GenericLoader("Employee", "employee");
const expenseLoader = new GenericLoader("Expense", "expense");
const paymentLoader = new GenericLoader("Payment", "payment");
const vehicleLoader = new GenericLoader("Vehicle", "vehicle");
const leadLoader = new GenericLoader("Lead", "lead");

export async function routeLoad(
  rec: TransformedRecord,
  opts: LoaderOptions,
): Promise<LoadResult> {
  switch (rec.targetModel) {
    case "Customer":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return customerLoader.load(rec as any, opts);
    case "Event":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return orderLoader.load(rec as any, opts);
    case "Invoice":
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return invoiceLoader.load(rec as any, opts);
    case "Employee":
      return employeeLoader.load(rec, opts);
    case "Expense":
      return expenseLoader.load(rec, opts);
    case "Payment":
      return paymentLoader.load(rec, opts);
    case "Vehicle":
      return vehicleLoader.load(rec, opts);
    case "Lead":
      return leadLoader.load(rec, opts);
    default:
      throw new Error(`אין loader לטבלה ${rec.targetModel}`);
  }
}

export { CustomerLoader, OrderLoader, InvoiceLoader, GenericLoader };
