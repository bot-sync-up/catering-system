/**
 * Seed דמו עבור פלטפורמת "ענה את השואל".
 * מאכלס דייר (tenant) אחד עם נתוני דוגמה בעברית: משתמשים, תפקידים, לקוחות,
 * אירועים, תפריטים, מוצרים, ספקים, עובדים, חשבוניות וכו'.
 */
import {
  PrismaClient,
  UserStatus,
  CustomerType,
  EventType,
  EventStatus,
  TaskStatus,
  TaskPriority,
  PaymentMethod,
  PaymentStatus,
  FinancialCategory,
  EmploymentStatus,
  ShiftStatus,
  AddressType,
  InvoiceStatus,
  VehicleStatus,
  NotificationChannel,
  CampaignStatus,
  LeadStatus,
} from "@prisma/client";
import * as crypto from "node:crypto";

const prisma = new PrismaClient();

// דייר ראשי לדמו — UUID קבוע כדי שאפשר יהיה להריץ seed שוב.
const TENANT_ID = "00000000-0000-0000-0000-000000000001";

function hashPassword(plain: string): string {
  // hash דמו פשוט; בייצור משתמשים ב-argon2/bcrypt.
  return crypto.createHash("sha256").update(plain).digest("hex");
}

async function seedTenant() {
  console.log("יצירת/עדכון דייר ראשי...");
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    create: {
      id: TENANT_ID,
      slug: "aneh-hashoel-demo",
      name: "Aneh et HaShoel Demo",
      hebrewName: "ענה את השואל — דמו",
      domain: "demo.aneh-hashoel.co.il",
      timezone: "Asia/Jerusalem",
      locale: "he-IL",
      currency: "ILS",
      vatRate: 18,
      settings: { dir: "rtl", weekStart: 0 },
      active: true,
    },
    update: {},
  });
}

async function clearDb() {
  console.log("ניקוי הנתונים הקיימים...");
  // מחיקה לפי סדר תלות הפוך
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.integrationLog.deleteMany(),
    prisma.webhook.deleteMany(),
    prisma.featureFlag.deleteMany(),
    prisma.portfolio.deleteMany(),
    prisma.gallery.deleteMany(),
    prisma.testimonial.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.bankTransaction.deleteMany(),
    prisma.pettyCash.deleteMany(),
    prisma.receipt.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.budgetCategory.deleteMany(),
    prisma.delivery.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.evaluation.deleteMany(),
    prisma.vacationBalance.deleteMany(),
    prisma.payrollRecord.deleteMany(),
    prisma.timeEntry.deleteMany(),
    prisma.shift.deleteMany(),
    prisma.staffAssignment.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.supplierInvoice.deleteMany(),
    prisma.supplierPrice.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.recipeVersion.deleteMany(),
    prisma.recipeIngredient.deleteMany(),
    prisma.stockLevel.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.menuItem.deleteMany(),
    prisma.recipe.deleteMany(),
    prisma.menu.deleteMany(),
    prisma.task.deleteMany(),
    prisma.event.deleteMany(),
    prisma.venue.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.note.deleteMany(),
    prisma.document.deleteMany(),
    prisma.customerTag.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.address.deleteMany(),
    prisma.contactPerson.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.session.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.role.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function seedRolesAndPermissions() {
  console.log("יצירת תפקידים והרשאות...");

  const resources = [
    "users",
    "customers",
    "events",
    "menus",
    "products",
    "suppliers",
    "employees",
    "invoices",
    "payments",
    "reports",
    "settings",
  ];
  const actions = ["create", "read", "update", "delete", "approve"];

  const permissions = [];
  for (const resource of resources) {
    for (const action of actions) {
      permissions.push({
        resource,
        action,
        description: `הרשאת ${action} על ${resource}`,
        tenantId: TENANT_ID,
      });
    }
  }

  await prisma.permission.createMany({ data: permissions });

  const roles = [
    { name: "admin", displayName: "מנהל מערכת", description: "גישה מלאה לכל הפעולות", isSystem: true },
    { name: "manager", displayName: "מנהל", description: "ניהול אירועים, לקוחות וצוות" },
    { name: "chef", displayName: "שף ראשי", description: "ניהול תפריטים, מתכונים ומלאי" },
    { name: "accountant", displayName: "רואה חשבון", description: "ניהול חשבוניות, תשלומים והוצאות" },
    { name: "staff", displayName: "צוות", description: "צפייה ועדכון משימות ומשמרות" },
    { name: "viewer", displayName: "צופה", description: "גישת קריאה בלבד" },
  ];

  for (const r of roles) {
    await prisma.role.create({
      data: { ...r, tenantId: TENANT_ID },
    });
  }

  // תן ל-admin את כל ההרשאות
  const adminRole = await prisma.role.findFirst({ where: { name: "admin", tenantId: TENANT_ID } });
  const allPerms = await prisma.permission.findMany({ where: { tenantId: TENANT_ID } });
  if (adminRole) {
    await prisma.rolePermission.createMany({
      data: allPerms.map((p) => ({
        roleId: adminRole.id,
        permissionId: p.id,
        tenantId: TENANT_ID,
      })),
    });
  }
}

async function seedUsers() {
  console.log("יצירת משתמשים...");
  const adminRole = await prisma.role.findFirst({ where: { name: "admin", tenantId: TENANT_ID } });
  const managerRole = await prisma.role.findFirst({ where: { name: "manager", tenantId: TENANT_ID } });
  const chefRole = await prisma.role.findFirst({ where: { name: "chef", tenantId: TENANT_ID } });

  const admin = await prisma.user.create({
    data: {
      tenantId: TENANT_ID,
      email: "admin@aneh-hashoel.co.il",
      phone: "050-1111111",
      passwordHash: hashPassword("Admin1234!"),
      firstName: "ישראל",
      lastName: "ישראלי",
      status: UserStatus.ACTIVE,
      preferences: { language: "he", theme: "light" },
    },
  });

  const manager = await prisma.user.create({
    data: {
      tenantId: TENANT_ID,
      email: "manager@aneh-hashoel.co.il",
      phone: "050-2222222",
      passwordHash: hashPassword("Manager123!"),
      firstName: "שרה",
      lastName: "כהן",
      status: UserStatus.ACTIVE,
    },
  });

  const chef = await prisma.user.create({
    data: {
      tenantId: TENANT_ID,
      email: "chef@aneh-hashoel.co.il",
      phone: "050-3333333",
      passwordHash: hashPassword("Chef1234!"),
      firstName: "דוד",
      lastName: "לוי",
      status: UserStatus.ACTIVE,
    },
  });

  if (adminRole) await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id, tenantId: TENANT_ID } });
  if (managerRole) await prisma.userRole.create({ data: { userId: manager.id, roleId: managerRole.id, tenantId: TENANT_ID } });
  if (chefRole) await prisma.userRole.create({ data: { userId: chef.id, roleId: chefRole.id, tenantId: TENANT_ID } });

  // 2 משתמשים נוספים — סך הכל 5
  const accountant = await prisma.user.create({
    data: {
      tenantId: TENANT_ID,
      email: "accountant@aneh-hashoel.co.il",
      phone: "050-4444444",
      passwordHash: hashPassword("Account123!"),
      firstName: "רבקה",
      lastName: "פרידמן",
      status: UserStatus.ACTIVE,
    },
  });
  const sales = await prisma.user.create({
    data: {
      tenantId: TENANT_ID,
      email: "sales@aneh-hashoel.co.il",
      phone: "050-5555555",
      passwordHash: hashPassword("Sales1234!"),
      firstName: "יוסף",
      lastName: "אברהם",
      status: UserStatus.ACTIVE,
    },
  });

  return { admin, manager, chef, accountant, sales };
}

async function seedCustomers() {
  console.log("יצירת לקוחות...");
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        tenantId: TENANT_ID,
        type: CustomerType.INDIVIDUAL,
        name: "משפחת רוזנברג",
        hebrewName: "משפחת רוזנברג",
        email: "rosenberg@example.co.il",
        phone: "052-4444444",
        notes: "לקוח חוזר — חתונות וברי מצווה",
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: TENANT_ID,
        type: CustomerType.BUSINESS,
        name: 'חברת הייטק בע"מ',
        hebrewName: 'חברת הייטק בע"מ',
        taxId: "514567890",
        email: "events@hitech-corp.co.il",
        phone: "03-5555555",
        creditLimit: 50000,
        paymentTermDays: 30,
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: TENANT_ID,
        type: CustomerType.ORGANIZATION,
        name: "המרכז למורשת מרן",
        hebrewName: "המרכז למורשת מרן",
        taxId: "580123456",
        email: "info@moreshet-maran.co.il",
        phone: "02-6666666",
      },
    }),
  ]);

  // אנשי קשר וכתובות
  await prisma.contactPerson.create({
    data: {
      tenantId: TENANT_ID,
      customerId: customers[0].id,
      firstName: "אברהם",
      lastName: "רוזנברג",
      role: "אבי החתן",
      phone: "052-4444444",
      email: "abraham@example.co.il",
      isPrimary: true,
    },
  });

  await prisma.address.create({
    data: {
      tenantId: TENANT_ID,
      customerId: customers[0].id,
      type: AddressType.HOME,
      street: "הרב קוק",
      houseNum: "12",
      city: "ירושלים",
      postalCode: "9100000",
      isPrimary: true,
    },
  });

  await prisma.address.create({
    data: {
      tenantId: TENANT_ID,
      customerId: customers[1].id,
      type: AddressType.BUSINESS,
      street: "רוטשילד",
      houseNum: "45",
      city: "תל אביב",
      postalCode: "6688318",
      isPrimary: true,
    },
  });

  // תגיות
  const vipTag = await prisma.tag.create({ data: { tenantId: TENANT_ID, name: "VIP", color: "#FFD700" } });
  const corpTag = await prisma.tag.create({ data: { tenantId: TENANT_ID, name: "תאגידי", color: "#1E90FF" } });

  await prisma.customerTag.create({ data: { customerId: customers[0].id, tagId: vipTag.id, tenantId: TENANT_ID } });
  await prisma.customerTag.create({ data: { customerId: customers[1].id, tagId: corpTag.id, tenantId: TENANT_ID } });

  // 7 לקוחות נוספים — סך הכל 10
  const extraNames: { name: string; type: CustomerType; phone: string }[] = [
    { name: "משפחת כהן", type: CustomerType.INDIVIDUAL, phone: "052-7000001" },
    { name: "משפחת לוי", type: CustomerType.INDIVIDUAL, phone: "052-7000002" },
    { name: "ישיבת אור החיים", type: CustomerType.ORGANIZATION, phone: "02-7000003" },
    { name: 'מסעדת הכשר בע"מ', type: CustomerType.BUSINESS, phone: "03-7000004" },
    { name: "עיריית בני ברק", type: CustomerType.GOVERNMENT, phone: "03-7000005" },
    { name: "משפחת מזרחי", type: CustomerType.INDIVIDUAL, phone: "052-7000006" },
    { name: "מרכז קהילתי רמת גן", type: CustomerType.ORGANIZATION, phone: "03-7000007" },
  ];
  for (const c of extraNames) {
    const created = await prisma.customer.create({
      data: {
        tenantId: TENANT_ID,
        type: c.type,
        name: c.name,
        hebrewName: c.name,
        phone: c.phone,
      },
    });
    customers.push(created);
  }

  return customers;
}

async function seedVenues() {
  console.log("יצירת אולמות...");
  return Promise.all([
    prisma.venue.create({
      data: {
        tenantId: TENANT_ID,
        name: "אולם הכרמל",
        description: "אולם מרכזי עם נוף לים",
        capacity: 500,
        hourlyRate: 1500,
        amenities: ["חניה", "מערכת הגברה", "במה", "תאורה מקצועית"],
      },
    }),
    prisma.venue.create({
      data: {
        tenantId: TENANT_ID,
        name: "גן האירועים",
        description: "אולם גן בחיק הטבע",
        capacity: 300,
        hourlyRate: 1000,
        amenities: ["גן", "ברכה", "חניה"],
      },
    }),
  ]);
}

async function seedCategoriesAndProducts() {
  console.log("יצירת קטגוריות ומוצרים...");
  const meatCat = await prisma.category.create({
    data: { tenantId: TENANT_ID, name: "בשרים", description: "מוצרי בשר" },
  });
  const veggieCat = await prisma.category.create({
    data: { tenantId: TENANT_ID, name: "ירקות", description: "ירקות טריים" },
  });
  const dairyCat = await prisma.category.create({
    data: { tenantId: TENANT_ID, name: "מוצרי חלב", description: "חלב, גבינות, יוגורט" },
  });

  const products = await Promise.all([
    prisma.product.create({
      data: {
        tenantId: TENANT_ID,
        categoryId: meatCat.id,
        sku: "MEAT-001",
        name: 'בשר בקר טחון',
        hebrewName: "בשר בקר טחון",
        unit: 'ק"ג',
        unitCost: 65,
        unitPrice: 95,
        isPerishable: true,
        shelfLifeDays: 3,
      },
    }),
    prisma.product.create({
      data: {
        tenantId: TENANT_ID,
        categoryId: meatCat.id,
        sku: "MEAT-002",
        name: "חזה עוף",
        hebrewName: "חזה עוף",
        unit: 'ק"ג',
        unitCost: 35,
        unitPrice: 55,
        isPerishable: true,
        shelfLifeDays: 4,
      },
    }),
    prisma.product.create({
      data: {
        tenantId: TENANT_ID,
        categoryId: veggieCat.id,
        sku: "VEG-001",
        name: "עגבניות",
        hebrewName: "עגבניות",
        unit: 'ק"ג',
        unitCost: 5,
        unitPrice: 9,
        isPerishable: true,
        shelfLifeDays: 7,
      },
    }),
    prisma.product.create({
      data: {
        tenantId: TENANT_ID,
        categoryId: dairyCat.id,
        sku: "DAIRY-001",
        name: 'גבינה צהובה',
        hebrewName: "גבינה צהובה",
        unit: 'ק"ג',
        unitCost: 50,
        unitPrice: 75,
        isPerishable: true,
        shelfLifeDays: 21,
      },
    }),
  ]);

  // רמות מלאי התחלתיות
  for (const p of products) {
    await prisma.stockLevel.create({
      data: {
        tenantId: TENANT_ID,
        productId: p.id,
        location: "main",
        quantity: 100,
        reorderLevel: 20,
        reorderQty: 50,
      },
    });
  }

  return products;
}

async function seedSuppliers(products: { id: string }[]) {
  console.log("יצירת ספקים...");
  const supplier1 = await prisma.supplier.create({
    data: {
      tenantId: TENANT_ID,
      name: 'משחטות הגליל בע"מ',
      hebrewName: 'משחטות הגליל בע"מ',
      taxId: "511223344",
      contactName: "יוסי כהן",
      email: "yossi@galil-meat.co.il",
      phone: "04-7777777",
      paymentTermDays: 14,
      rating: 5,
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      tenantId: TENANT_ID,
      name: "ירקות טריים מהשדה",
      hebrewName: "ירקות טריים מהשדה",
      taxId: "512334455",
      contactName: "מרים לוי",
      phone: "04-8888888",
      paymentTermDays: 7,
      rating: 4,
    },
  });

  // מחירי ספק
  await prisma.supplierPrice.create({
    data: {
      tenantId: TENANT_ID,
      supplierId: supplier1.id,
      productId: products[0].id,
      price: 60,
      validFrom: new Date(),
      leadTimeDays: 1,
    },
  });

  return [supplier1, supplier2];
}

async function seedMenusAndRecipes(products: { id: string }[]) {
  console.log("יצירת תפריטים ומתכונים...");

  const recipe = await prisma.recipe.create({
    data: {
      tenantId: TENANT_ID,
      name: "המבורגר ביתי",
      hebrewName: "המבורגר ביתי",
      description: "המבורגר מבשר בקר טחון טרי",
      servings: 1,
      prepTimeMins: 10,
      cookTimeMins: 8,
      instructions: "1. לערבב את הבשר עם תבלינים\n2. ליצור קציצה\n3. לצלות 4 דקות מכל צד",
    },
  });

  await prisma.recipeIngredient.create({
    data: {
      tenantId: TENANT_ID,
      recipeId: recipe.id,
      productId: products[0].id,
      quantity: 0.2,
      unit: 'ק"ג',
      notes: "200 גרם בשר",
    },
  });

  await prisma.recipeVersion.create({
    data: {
      tenantId: TENANT_ID,
      recipeId: recipe.id,
      version: 1,
      snapshot: {
        name: recipe.name,
        instructions: recipe.instructions,
        ingredients: [{ productId: products[0].id, quantity: 0.2 }],
      },
      changeNotes: "גרסה ראשונית",
    },
  });

  const menu = await prisma.menu.create({
    data: {
      tenantId: TENANT_ID,
      name: "תפריט חתונה קלאסי",
      description: "תפריט בשרי לאירועים",
      pricePerPerson: 220,
    },
  });

  await prisma.menuItem.create({
    data: {
      tenantId: TENANT_ID,
      menuId: menu.id,
      recipeId: recipe.id,
      name: "המבורגר ביתי",
      category: "מנה עיקרית",
      price: 65,
      sortOrder: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      tenantId: TENANT_ID,
      menuId: menu.id,
      productId: products[2].id,
      name: "סלט עגבניות",
      category: "מנה ראשונה",
      price: 25,
      sortOrder: 0,
    },
  });

  return { menu, recipe };
}

async function seedEmployees(users: { admin: { id: string }; chef: { id: string } }) {
  console.log("יצירת עובדים...");
  const chef = await prisma.employee.create({
    data: {
      tenantId: TENANT_ID,
      userId: users.chef.id,
      employeeNum: "EMP-001",
      firstName: "דוד",
      lastName: "לוי",
      nationalId: "012345678",
      email: "chef@aneh-hashoel.co.il",
      phone: "050-3333333",
      position: "שף ראשי",
      department: "מטבח",
      status: EmploymentStatus.ACTIVE,
      hireDate: new Date("2022-01-15"),
      monthlySalary: 18000,
    },
  });

  const driver = await prisma.employee.create({
    data: {
      tenantId: TENANT_ID,
      employeeNum: "EMP-002",
      firstName: "משה",
      lastName: "פרץ",
      nationalId: "023456789",
      phone: "050-9999999",
      position: "נהג משלוחים",
      department: "לוגיסטיקה",
      status: EmploymentStatus.ACTIVE,
      hireDate: new Date("2023-06-01"),
      hourlyRate: 50,
    },
  });

  await prisma.vacationBalance.create({
    data: {
      tenantId: TENANT_ID,
      employeeId: chef.id,
      totalDays: 22,
      usedDays: 5,
      remainingDays: 17,
      sickDaysTotal: 18,
      sickDaysUsed: 2,
      year: new Date().getFullYear(),
    },
  });

  return { chef, driver };
}

async function seedEvent(opts: {
  customerId: string;
  venueId: string;
  menuId: string;
  productId: string;
  recipeId: string;
  managerId: string;
  driverId: string;
}) {
  console.log("יצירת אירוע...");
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 14);
  startsAt.setHours(19, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setHours(23, 59, 0, 0);

  const event = await prisma.event.create({
    data: {
      tenantId: TENANT_ID,
      customerId: opts.customerId,
      venueId: opts.venueId,
      menuId: opts.menuId,
      type: EventType.WEDDING,
      status: EventStatus.CONFIRMED,
      title: "חתונת רוזנברג-שטרן",
      description: "חתונה ב-300 איש, אולם הכרמל",
      startsAt,
      endsAt,
      guestCount: 300,
      basePrice: 66000,
      discount: 1000,
      totalPrice: 65000,
      paidAmount: 20000,
      contractSignedAt: new Date(),
    },
  });

  await prisma.orderItem.create({
    data: {
      tenantId: TENANT_ID,
      eventId: event.id,
      recipeId: opts.recipeId,
      name: "המבורגר ביתי",
      quantity: 300,
      unitPrice: 65,
      totalPrice: 19500,
    },
  });

  await prisma.task.create({
    data: {
      tenantId: TENANT_ID,
      eventId: event.id,
      assigneeId: opts.managerId,
      title: "אישור סופי של תפריט עם הלקוח",
      description: "להתקשר ללקוח לאישור התפריט המלא",
      status: TaskStatus.PENDING,
      priority: TaskPriority.HIGH,
      dueAt: new Date(startsAt.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.staffAssignment.create({
    data: {
      tenantId: TENANT_ID,
      eventId: event.id,
      userId: opts.managerId,
      role: "מנהל אירוע",
      startsAt,
      endsAt,
      hourlyRate: 100,
      confirmedAt: new Date(),
    },
  });

  return event;
}

async function seedAdditionalEventsAndOrders(opts: {
  customers: { id: string }[];
  venueId: string;
  menuId: string;
  recipeId: string;
  managerId: string;
}) {
  console.log("יצירת 4 אירועים נוספים ו-20 הזמנות סך הכל...");
  const eventTemplates: { type: EventType; title: string; status: EventStatus; guests: number; base: number }[] = [
    { type: EventType.BAR_MITZVAH, title: "בר מצווה - משפחת כהן", status: EventStatus.CONFIRMED, guests: 150, base: 33000 },
    { type: EventType.BAT_MITZVAH, title: "בת מצווה - משפחת לוי", status: EventStatus.DRAFT, guests: 120, base: 24000 },
    { type: EventType.BRIT_MILAH, title: 'ברית מילה - משפחת מזרחי', status: EventStatus.COMPLETED, guests: 80, base: 14400 },
    { type: EventType.CORPORATE, title: 'כנס שנתי - חברת הייטק בע"מ', status: EventStatus.CONFIRMED, guests: 200, base: 50000 },
  ];

  const events: { id: string }[] = [];
  for (let i = 0; i < eventTemplates.length; i++) {
    const t = eventTemplates[i];
    const customer = opts.customers[(i + 1) % opts.customers.length];
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + 21 + i * 7);
    startsAt.setHours(18, 30, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setHours(23, 30, 0, 0);
    const ev = await prisma.event.create({
      data: {
        tenantId: TENANT_ID,
        customerId: customer.id,
        venueId: opts.venueId,
        menuId: opts.menuId,
        type: t.type,
        status: t.status,
        title: t.title,
        description: `${t.title} — ${t.guests} מוזמנים`,
        startsAt,
        endsAt,
        guestCount: t.guests,
        basePrice: t.base,
        discount: 0,
        totalPrice: t.base,
        paidAmount: t.status === EventStatus.COMPLETED ? t.base : Math.floor(t.base / 3),
      },
    });
    events.push(ev);
  }

  // 20 הזמנות (orderItems) - מפוזרות בין 5 האירועים (הראשון + 4 חדשים)
  // נחשיב את האירוע הראשון כבר עם 1 הזמנה => נוסיף 19 כאן.
  const dishNames = [
    "סלט ירוק קלאסי",
    "סלט סלק וגבינת עזים",
    "קרפצ'יו דג",
    "המבורגר ביתי",
    "פילה בקר ברוטב יין",
    "חזה עוף ממולא",
    "סלמון אפוי",
    "ניוקי תרד",
    "אורז ירקות",
    "פירה ביתי",
    "ירקות צלויים",
    "פטריות מוקרמות",
    "קינוח שוקולד",
    "פאי תפוחים",
    "מוס לימון",
    "פירות העונה",
    "מרק קרם",
    "חמין שבת",
    "קוסקוס מרוקאי",
  ];

  for (let i = 0; i < dishNames.length; i++) {
    const ev = events[i % events.length];
    const qty = 50 + (i % 7) * 20;
    const unit = 25 + (i % 11) * 5;
    await prisma.orderItem.create({
      data: {
        tenantId: TENANT_ID,
        eventId: ev.id,
        recipeId: opts.recipeId,
        name: dishNames[i],
        quantity: qty,
        unitPrice: unit,
        totalPrice: qty * unit,
      },
    });
  }

  return events;
}

async function seedFinance(opts: {
  customerId: string;
  eventId: string;
}) {
  console.log("יצירת חשבונית, תשלום וקבלה...");
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: TENANT_ID,
      customerId: opts.customerId,
      eventId: opts.eventId,
      invoiceNum: "INV-2026-0001",
      category: FinancialCategory.OFFICIAL,
      status: InvoiceStatus.PARTIALLY_PAID,
      amount: 55556,
      taxAmount: 9444,
      totalAmount: 65000,
      paidAmount: 20000,
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [
        { description: "אירוע חתונה — 300 איש", quantity: 300, unitPrice: 217 },
      ],
    },
  });

  await prisma.payment.create({
    data: {
      tenantId: TENANT_ID,
      customerId: opts.customerId,
      eventId: opts.eventId,
      invoiceId: invoice.id,
      method: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.COMPLETED,
      category: FinancialCategory.OFFICIAL,
      amount: 20000,
      reference: "BT-2026-0001",
      paidAt: new Date(),
      notes: "מקדמה",
    },
  });

  await prisma.receipt.create({
    data: {
      tenantId: TENANT_ID,
      invoiceId: invoice.id,
      customerId: opts.customerId,
      receiptNum: "RCP-2026-0001",
      category: FinancialCategory.OFFICIAL,
      amount: 20000,
      method: PaymentMethod.BANK_TRANSFER,
      issuedAt: new Date(),
    },
  });

  // הוצאה לא-רשמית (קופה קטנה)
  await prisma.pettyCash.create({
    data: {
      tenantId: TENANT_ID,
      type: "expense",
      category: FinancialCategory.UNOFFICIAL,
      amount: 250,
      description: "טיפים לעובדים",
      occurredAt: new Date(),
    },
  });

  // תקציבים
  const opsBudget = await prisma.budgetCategory.create({
    data: {
      tenantId: TENANT_ID,
      name: "תפעול",
      hebrewName: "תפעול",
      monthlyBudget: 30000,
      yearlyBudget: 360000,
    },
  });

  await prisma.expense.create({
    data: {
      tenantId: TENANT_ID,
      eventId: opts.eventId,
      budgetCatId: opsBudget.id,
      category: FinancialCategory.OFFICIAL,
      description: "קניית חומרי גלם לאירוע",
      amount: 8500,
      paymentMethod: PaymentMethod.CREDIT_CARD,
      occurredAt: new Date(),
    },
  });
}

async function seedFleet() {
  console.log("יצירת רכבים...");
  return prisma.vehicle.create({
    data: {
      tenantId: TENANT_ID,
      plateNumber: "12-345-67",
      make: "מרצדס",
      model: "ספרינטר",
      year: 2022,
      color: "לבן",
      capacity: 1500,
      status: VehicleStatus.AVAILABLE,
    },
  });
}

async function seedMarketing() {
  console.log("יצירת קמפיינים, לידים והמלצות...");
  const campaign = await prisma.campaign.create({
    data: {
      tenantId: TENANT_ID,
      name: "קיץ 2026 — חתונות",
      description: "קמפיין מותאם לעונת החתונות",
      channel: NotificationChannel.WHATSAPP,
      status: CampaignStatus.ACTIVE,
      startsAt: new Date(),
      budget: 5000,
    },
  });

  await prisma.lead.create({
    data: {
      tenantId: TENANT_ID,
      campaignId: campaign.id,
      source: "אתר אינטרנט",
      status: LeadStatus.NEW,
      firstName: "רחל",
      lastName: "ברקוביץ",
      phone: "054-1234567",
      email: "rachel@example.com",
      estimatedValue: 80000,
      notes: "מתעניינת בחתונה לקיץ הבא — 250 איש",
    },
  });

  await prisma.testimonial.create({
    data: {
      tenantId: TENANT_ID,
      customerName: "משפחת כהן",
      eventType: "בר מצווה",
      content: "אירוע מושלם! הצוות מקצועי, האוכל היה מצוין והשירות מעל ומעבר.",
      rating: 5,
      isPublished: true,
      publishedAt: new Date(),
    },
  });
}

async function seedPlatform() {
  console.log("יצירת feature flags ו-webhooks...");
  await prisma.featureFlag.create({
    data: {
      tenantId: TENANT_ID,
      key: "new_dashboard",
      enabled: true,
      description: "מסך הבית החדש",
      rolloutPct: 100,
    },
  });

  await prisma.featureFlag.create({
    data: {
      tenantId: null,
      key: "ai_recipe_suggestions",
      enabled: false,
      description: "הצעות מתכונים מבוססות AI",
      rolloutPct: 0,
    },
  });

  await prisma.webhook.create({
    data: {
      tenantId: TENANT_ID,
      name: "שילוב Slack",
      url: "https://hooks.slack.com/services/EXAMPLE",
      secret: "webhook_secret_123",
      events: ["EVENT_CREATED", "PAYMENT_RECEIVED"],
    },
  });
}

async function main() {
  console.log("=== התחלת זריעת נתונים לפלטפורמת 'ענה את השואל' ===");
  await clearDb();
  await seedTenant();
  await seedRolesAndPermissions();
  const users = await seedUsers();
  const customers = await seedCustomers();
  const venues = await seedVenues();
  const products = await seedCategoriesAndProducts();
  await seedSuppliers(products);
  const { menu, recipe } = await seedMenusAndRecipes(products);
  const employees = await seedEmployees(users);

  const event = await seedEvent({
    customerId: customers[0].id,
    venueId: venues[0].id,
    menuId: menu.id,
    productId: products[0].id,
    recipeId: recipe.id,
    managerId: users.manager.id,
    driverId: employees.driver.id,
  });

  await seedFinance({ customerId: customers[0].id, eventId: event.id });
  await seedAdditionalEventsAndOrders({
    customers,
    venueId: venues[0].id,
    menuId: menu.id,
    recipeId: recipe.id,
    managerId: users.manager.id,
  });
  const vehicle = await seedFleet();

  // משלוח
  await prisma.delivery.create({
    data: {
      tenantId: TENANT_ID,
      eventId: event.id,
      vehicleId: vehicle.id,
      driverId: employees.driver.id,
      scheduledAt: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
      destinationAddr: "אולם הכרמל, חיפה",
    },
  });

  // משמרת
  await prisma.shift.create({
    data: {
      tenantId: TENANT_ID,
      employeeId: employees.chef.id,
      startsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      status: ShiftStatus.SCHEDULED,
      role: "שף ראשי",
    },
  });

  await seedMarketing();
  await seedPlatform();

  // לוג ביקורת לדוגמה
  await prisma.auditLog.create({
    data: {
      tenantId: TENANT_ID,
      userId: users.admin.id,
      entityType: "Event",
      entityId: event.id,
      action: "CREATE",
      newValues: { title: event.title, status: event.status },
      ip: "127.0.0.1",
      userAgent: "seed-script",
    },
  });

  console.log("=== זריעת הנתונים הסתיימה בהצלחה ===");
}

main()
  .catch((e) => {
    console.error("שגיאה בזריעה:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
