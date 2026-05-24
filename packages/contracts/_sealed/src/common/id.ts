import cuid from 'cuid';
import { z } from 'zod';

/**
 * זיהוי ייחודי לכל ישות במערכת — מבוסס cuid.
 * cuid מבטיח ייחודיות מבוזרת ללא צורך בתיאום בין שרתים.
 */
export const CuidSchema = z
  .string()
  .min(1)
  .regex(/^c[a-z0-9]{8,}$/i, 'Invalid cuid format');

export type Cuid = z.infer<typeof CuidSchema>;

/** מחולל cuid חדש */
export const newId = (): Cuid => cuid();

/**
 * סכמת מזהה ממותג עבור ישות ספציפית.
 * דוגמה: const CustomerId = brandedId('cust');
 */
export const brandedId = <Brand extends string>(_brand: Brand) =>
  CuidSchema.brand<Brand>();

export const CustomerIdSchema = brandedId('CustomerId');
export const OrderIdSchema = brandedId('OrderId');
export const InvoiceIdSchema = brandedId('InvoiceId');
export const EventIdSchema = brandedId('EventId');
export const EmployeeIdSchema = brandedId('EmployeeId');
export const ProductIdSchema = brandedId('ProductId');
export const RecipeIdSchema = brandedId('RecipeId');
export const SupplierIdSchema = brandedId('SupplierId');
export const VehicleIdSchema = brandedId('VehicleId');
export const LeadIdSchema = brandedId('LeadId');
export const PaymentIdSchema = brandedId('PaymentId');
export const DeliveryIdSchema = brandedId('DeliveryId');
export const QuoteIdSchema = brandedId('QuoteId');
export const AddressIdSchema = brandedId('AddressId');
export const ContactIdSchema = brandedId('ContactId');
export const TagIdSchema = brandedId('TagId');
export const LineItemIdSchema = brandedId('LineItemId');

export type CustomerId = z.infer<typeof CustomerIdSchema>;
export type OrderId = z.infer<typeof OrderIdSchema>;
export type InvoiceId = z.infer<typeof InvoiceIdSchema>;
export type EventId = z.infer<typeof EventIdSchema>;
export type EmployeeId = z.infer<typeof EmployeeIdSchema>;
export type ProductId = z.infer<typeof ProductIdSchema>;
export type RecipeId = z.infer<typeof RecipeIdSchema>;
export type SupplierId = z.infer<typeof SupplierIdSchema>;
export type VehicleId = z.infer<typeof VehicleIdSchema>;
export type LeadId = z.infer<typeof LeadIdSchema>;
export type PaymentId = z.infer<typeof PaymentIdSchema>;
export type DeliveryId = z.infer<typeof DeliveryIdSchema>;
export type QuoteId = z.infer<typeof QuoteIdSchema>;
export type AddressId = z.infer<typeof AddressIdSchema>;
export type ContactId = z.infer<typeof ContactIdSchema>;
export type TagId = z.infer<typeof TagIdSchema>;
export type LineItemId = z.infer<typeof LineItemIdSchema>;
