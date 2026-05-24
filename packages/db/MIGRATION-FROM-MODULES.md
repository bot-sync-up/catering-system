# MIGRATION-FROM-MODULES.md

מסמך מיפוי שדות בעברית בין המודולים הישנים (schemas פר־סוכן/פר־מודול)
לבין ה־schema המאוחד החדש ב־`packages/db/prisma/schema.prisma`.

המטרה: צוותים שיודעים את שמות השדות בעברית מהמודולים הישנים יוכלו
למצוא במהירות את שם השדה ב־Prisma החדש (camelCase + מיפוי `@map` ל־snake_case ב־DB).

---

## כללים אחידים

| כלל | ערך ב־schema החדש |
|------|---------------------|
| מפתח ראשי | `id` UUID (`gen_random_uuid()`) |
| בידוד דייר | כל טבלה כוללת `tenantId` (UUID, `@map("tenant_id")`) |
| סכומים | `Decimal(12,2)` (ערכי על־ערך `Decimal(14,2)`) |
| ברירת מחדל מע"מ | `vatRate = 18` (טבלת `tenants` + `invoices`) |
| מטבע | `currency = "ILS"` |
| תיוג רשמי/לא רשמי | `category: FinancialCategory` (`OFFICIAL` \| `UNOFFICIAL`) |
| timestamps | `createdAt`, `updatedAt` |

---

## 1. דייר (Tenant)

| עברית | מודול ישן | שם חדש (Prisma) | DB column |
|--------|-----------|----------------|-----------|
| מזהה דייר | `tenant_id` / `org_id` | `tenantId` | `tenant_id` |
| שם בעברית | `שם_עסק` / `name_he` | `hebrewName` | `hebrew_name` |
| אזור זמן | `tz` | `timezone` | `timezone` |
| שיעור מע"מ | `מע"מ` | `vatRate` | `vat_rate` |
| מטבע | `מטבע` | `currency` | `currency` |

---

## 2. משתמשים והרשאות

| עברית | מודול ישן | שם חדש | DB column |
|--------|-----------|--------|-----------|
| משתמש | `user` / `users` | `User` | `users` |
| דוא"ל | `אימייל` | `email` | `email` |
| סיסמה (hash) | `סיסמה_מוצפנת` | `passwordHash` | `password_hash` |
| שם פרטי | `שם_פרטי` | `firstName` | `first_name` |
| שם משפחה | `שם_משפחה` | `lastName` | `last_name` |
| סטטוס | `סטטוס` | `status` | `status` |
| תפקיד | `תפקיד` | `Role` | `roles` |
| הרשאה | `הרשאה` | `Permission` | `permissions` |
| הפעלה אחרונה | `התחברות_אחרונה` | `lastLoginAt` | `last_login_at` |
| Session | `סשן` | `Session` | `sessions` |
| מפתח API | `מפתח_api` | `ApiKey` | `api_keys` |
| לוג ביקורת | `לוג_ביקורת` | `AuditLog` | `audit_logs` |

> **חשוב**: `audit_logs` הוא **append-only**. במיגרציה הוגדרו טריגרים שדוחים `UPDATE` / `DELETE` / `TRUNCATE` ברמת ה־DB.

---

## 3. לקוחות (CRM)

| עברית | מודול ישן | שם חדש | DB column |
|--------|-----------|--------|-----------|
| לקוח | `לקוח` / `client` | `Customer` | `customers` |
| סוג לקוח | `סוג` (פרטי/עסקי/...) | `type` (`CustomerType`) | `type` |
| ח.פ./ע.מ | `ח_פ` / `tax_id` | `taxId` | `tax_id` |
| תקרת אשראי | `מסגרת_אשראי` | `creditLimit` | `credit_limit` |
| ימי תשלום | `שוטף_פלוס` | `paymentTermDays` | `payment_term_days` |
| איש קשר | `איש_קשר` | `ContactPerson` | `contact_persons` |
| כתובת | `כתובת` | `Address` | `addresses` |
| תיוג | `תגית` | `Tag` / `CustomerTag` | `tags`, `customer_tags` |
| מסמך | `מסמך` / `קובץ` | `Document` | `documents` |
| הערה | `הערה` | `Note` | `notes` |

---

## 4. אירועים, תפריטים, מטלות

| עברית | מודול ישן | שם חדש | DB column |
|--------|-----------|--------|-----------|
| אירוע | `אירוע` / `event` | `Event` | `events` |
| אולם | `אולם` / `venue` | `Venue` | `venues` |
| סוג אירוע | חתונה/בר־מצווה/ברית... | `EventType` (enum) | — |
| מספר מוזמנים | `מוזמנים` | `guestCount` | `guest_count` |
| מחיר בסיס | `מחיר_בסיס` | `basePrice` | `base_price` |
| הנחה | `הנחה` | `discount` | `discount` |
| סה"כ | `סהכ` | `totalPrice` | `total_price` |
| שולם | `שולם` | `paidAmount` | `paid_amount` |
| תפריט | `תפריט` | `Menu` / `MenuItem` | `menus`, `menu_items` |
| מנה (הזמנה) | `מנה` / `פריט_הזמנה` | `OrderItem` | `order_items` |
| מטלה | `משימה` / `מטלה` | `Task` | `tasks` |
| שיבוץ צוות | `שיבוץ_עובד` | `StaffAssignment` | `staff_assignments` |
| משלוח | `משלוח` | `Delivery` | `deliveries` |

---

## 5. מתכונים, מלאי, ספקים

| עברית | מודול ישן | שם חדש | DB column |
|--------|-----------|--------|-----------|
| קטגוריה | `קטגוריה` | `Category` | `categories` |
| מוצר | `מוצר` | `Product` | `products` |
| מתכון | `מתכון` | `Recipe` | `recipes` |
| מרכיב | `רכיב` | `RecipeIngredient` | `recipe_ingredients` |
| גרסת מתכון | `גרסה` | `RecipeVersion` | `recipe_versions` |
| ספק | `ספק` | `Supplier` | `suppliers` |
| הזמנת רכש | `הזמנת_רכש` / PO | `PurchaseOrder` | `purchase_orders` |
| חשבונית ספק | `חשבונית_ספק` | `SupplierInvoice` | `supplier_invoices` |
| תנועת מלאי | `תנועה` | `InventoryMovement` | `inventory_movements` |
| רמת מלאי | `מלאי` / `יתרת_מלאי` | `StockLevel` | `stock_levels` |
| מחיר ספק | `מחיר_ספק` | `SupplierPrice` | `supplier_prices` |

---

## 6. כספים (Finance)

| עברית | מודול ישן | שם חדש | DB column |
|--------|-----------|--------|-----------|
| חשבונית מס | `חשבונית` | `Invoice` | `invoices` |
| מספר חשבונית | `מספר_חשבונית` | `invoiceNum` | `invoice_num` |
| סכום לפני מע"מ | `סכום` | `amount` | `amount` |
| שיעור מע"מ | `מע"מ` | `vatRate` (default 18) | `vat_rate` |
| סכום מע"מ | `מעמ` / `tax` | `taxAmount` | `tax_amount` |
| סה"כ לתשלום | `סהכ` | `totalAmount` | `total_amount` |
| שולם | `שולם` | `paidAmount` | `paid_amount` |
| תאריך הנפקה | `תאריך_הנפקה` | `issuedAt` | `issued_at` |
| תאריך פירעון | `מועד_פירעון` | `dueAt` | `due_at` |
| **רשמי / לא רשמי** | `רשמי` (bool) | `category` (`FinancialCategory`) | `category` |
| קבלה | `קבלה` | `Receipt` | `receipts` |
| תשלום | `תשלום` | `Payment` | `payments` |
| אמצעי תשלום | `אמצעי` | `method` (`PaymentMethod`) | `method` |
| הוצאה | `הוצאה` | `Expense` | `expenses` |
| קופה קטנה | `קופה_קטנה` | `PettyCash` | `petty_cash` |
| קטגוריית תקציב | `קטגוריית_תקציב` | `BudgetCategory` | `budget_categories` |
| תנועת בנק | `תנועת_בנק` | `BankTransaction` | `bank_transactions` |

> **כלל קריטי**: כל ישות פיננסית נושאת `category: OFFICIAL | UNOFFICIAL`.
> ברירת המחדל היא `OFFICIAL` (מדווח לרשויות). העברה ל־`UNOFFICIAL` דורשת אישור מנהל.

---

## 7. כוח אדם (HR)

| עברית | מודול ישן | שם חדש | DB column |
|--------|-----------|--------|-----------|
| עובד | `עובד` | `Employee` | `employees` |
| מספר עובד | `מספר_עובד` | `employeeNum` | `employee_num` |
| ת.ז. | `תז` / `national_id` | `nationalId` | `national_id` |
| תפקיד | `תפקיד` | `position` | `position` |
| מחלקה | `מחלקה` | `department` | `department` |
| תאריך תחילת עבודה | `תאריך_קליטה` | `hireDate` | `hire_date` |
| משכורת חודשית | `משכורת` | `monthlySalary` | `monthly_salary` |
| שכר לשעה | `שכר_שעתי` | `hourlyRate` | `hourly_rate` |
| משמרת | `משמרת` | `Shift` | `shifts` |
| דיווח שעות | `דיווח_שעות` | `TimeEntry` | `time_entries` |
| שכר (תלוש) | `תלוש` | `PayrollRecord` | `payroll_records` |
| יתרת חופשה | `יתרת_חופשה` | `VacationBalance` | `vacation_balances` |
| הערכה | `הערכה` | `Evaluation` | `evaluations` |

---

## 8. צי רכב (Fleet)

| עברית | מודול ישן | שם חדש | DB column |
|--------|-----------|--------|-----------|
| רכב | `רכב` | `Vehicle` | `vehicles` |
| מספר רכב | `מספר_רישוי` | `plateNum` | `plate_num` |
| סטטוס | `סטטוס` | `status` (`VehicleStatus`) | `status` |
| משלוח | `משלוח` | `Delivery` | `deliveries` |
| נהג | `נהג` | `driver` → `Employee` | — |

---

## 9. שיווק (Marketing)

| עברית | מודול ישן | שם חדש | DB column |
|--------|-----------|--------|-----------|
| קמפיין | `קמפיין` | `Campaign` | `campaigns` |
| ליד | `ליד` | `Lead` | `leads` |
| המלצה | `המלצה` | `Testimonial` | `testimonials` |
| גלריה | `גלריה` | `Gallery` | `galleries` |
| תיק עבודות | `תיק_עבודות` | `Portfolio` | `portfolios` |

---

## 10. פלטפורמה (Platform)

| עברית | מודול ישן | שם חדש | DB column |
|--------|-----------|--------|-----------|
| Feature Flag | `דגל_פיצ'ר` | `FeatureFlag` | `feature_flags` |
| Webhook | `webhook` | `Webhook` | `webhooks` |
| לוג אינטגרציה | `לוג_אינטגרציה` | `IntegrationLog` | `integration_logs` |
| התראה | `התראה` | `Notification` | `notifications` |

---

## 11. ערוצי תקשורת / Enums מרכזיים

- `FinancialCategory`: `OFFICIAL` (רשמי), `UNOFFICIAL` (לא רשמי)
- `PaymentMethod`: `CASH` (מזומן), `CHECK` (צ'ק), `BANK_TRANSFER` (העברה בנקאית),
  `CREDIT_CARD` (אשראי), `BIT` (ביט), `PAYBOX` (פייבוקס), `OTHER`
- `EventType`: `WEDDING` (חתונה), `BAR_MITZVAH` (בר־מצווה), `BAT_MITZVAH`,
  `BRIT_MILAH` (ברית מילה), `ENGAGEMENT` (אירוסין), `SHEVA_BRACHOT` (שבע ברכות),
  `CORPORATE`, `CONFERENCE`, `PRIVATE_PARTY`, `OTHER`
- `NotificationChannel`: `EMAIL`, `SMS`, `WHATSAPP`, `PUSH`, `IN_APP`

---

## 12. ייבוא נתונים ממודולים ישנים

המלצות מיגרציה:

1. **תמיד התחל בייבוא הדייר** (`tenants`) — בלעדיו אין `tenant_id` תקף.
2. **משתמשים → תפקידים → הרשאות** בסדר הזה.
3. **לקוחות → אנשי קשר → כתובות → תגיות**.
4. **מוצרים/קטגוריות → ספקים → מתכונים → תפריטים**.
5. **אירועים → הזמנות (`order_items`) → מטלות → שיבוצים → משלוחים**.
6. **חשבוניות → תשלומים → קבלות** (שמור `invoice_num` ייחודי לפי `tenant_id`).
7. **AuditLog** — לאחר ייבוא היסטורי; שים לב לטריגרים append-only שמונעים תיקון בדיעבד.

לבדיקה מהירה לאחר ייבוא:

```sql
SELECT COUNT(*) FROM tenants;
SELECT COUNT(*), category FROM invoices GROUP BY category;
SELECT COUNT(*) FROM audit_logs WHERE tenant_id = '<TENANT_UUID>';
```
