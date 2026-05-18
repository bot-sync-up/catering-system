// סידינג ראשוני - נתוני דמו בעברית
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 מתחיל סידינג...');

  // === אלרגנים ===
  const allergens = [
    { name: 'גלוטן', icon: '🌾', severity: 'HIGH' },
    { name: 'אגוזים', icon: '🥜', severity: 'HIGH' },
    { name: 'חלב', icon: '🥛', severity: 'MEDIUM' },
    { name: 'ביצים', icon: '🥚', severity: 'MEDIUM' },
    { name: 'דגים', icon: '🐟', severity: 'MEDIUM' },
    { name: 'סויה', icon: '🌱', severity: 'LOW' },
    { name: 'שומשום', icon: '⚪', severity: 'MEDIUM' },
  ];
  const allergyMap = {};
  for (const a of allergens) {
    const created = await prisma.allergy.upsert({
      where: { name: a.name }, create: a, update: a,
    });
    allergyMap[a.name] = created.id;
  }

  // === דיאטות ===
  const diets = [
    { name: 'טבעוני', description: 'ללא מוצרים מן החי' },
    { name: 'צמחוני', description: 'ללא בשר ודגים' },
    { name: 'ללא גלוטן', description: 'מתאים לרגישים לגלוטן' },
    { name: 'כשר', description: 'בכשרות מהדרין' },
    { name: 'חלאל', description: 'בכשרות חלאל' },
    { name: 'קטוגני', description: 'דל פחמימות' },
  ];
  const dietMap = {};
  for (const d of diets) {
    const created = await prisma.diet.upsert({
      where: { name: d.name }, create: d, update: d,
    });
    dietMap[d.name] = created.id;
  }

  // === רמות נאמנות ===
  const tiers = [
    { tier: 'BRONZE',   minPoints: 0,    pointsMultiplier: 1.0, discountPercent: 0 },
    { tier: 'SILVER',   minPoints: 500,  pointsMultiplier: 1.25, discountPercent: 3 },
    { tier: 'GOLD',     minPoints: 2000, pointsMultiplier: 1.5,  discountPercent: 5 },
    { tier: 'PLATINUM', minPoints: 5000, pointsMultiplier: 2.0,  discountPercent: 10 },
  ];
  for (const t of tiers) {
    await prisma.loyaltyTierConfig.upsert({
      where: { tier: t.tier }, create: t, update: t,
    });
  }

  // === מחירונים ===
  const hotelPL = await prisma.customerPriceList.create({
    data: { name: 'מחירון מלונות', description: 'הנחה למלונות שותפים', globalDiscount: 15 },
  });
  const vipPL = await prisma.customerPriceList.create({
    data: { name: 'מחירון VIP', description: 'לקוחות זהב', globalDiscount: 20 },
  });

  // === תפריט ראשי ===
  const menu = await prisma.menu.create({
    data: {
      name: 'תפריט שבת חתונה - בסיס',
      description: 'תפריט בסיסי לאירועי חתונה',
      isTemplate: true,
      categories: {
        create: [
          { name: 'ראשונות', type: 'STARTER', order: 1 },
          { name: 'מנות עיקריות', type: 'MAIN', order: 2 },
          { name: 'תוספות', type: 'SIDE', order: 3 },
          { name: 'קינוחים', type: 'DESSERT', order: 4 },
          { name: 'שתייה', type: 'DRINK', order: 5 },
        ],
      },
    },
    include: { categories: true },
  });

  const catByType = Object.fromEntries(menu.categories.map(c => [c.type, c.id]));

  // === פריטים ===
  const items = [
    // ראשונות
    { name: 'סלט קיסר', basePrice: 45, type: 'STARTER', allergies: ['גלוטן', 'ביצים', 'חלב'], diets: ['צמחוני'] },
    { name: 'קרפצ\'יו דג סלמון', basePrice: 68, type: 'STARTER', allergies: ['דגים'], diets: [] },
    { name: 'בורקאס תרד גבינה', basePrice: 32, type: 'STARTER', allergies: ['גלוטן', 'חלב'], diets: ['צמחוני'] },
    { name: 'סלט ירקות טריים', basePrice: 38, type: 'STARTER', allergies: [], diets: ['טבעוני', 'צמחוני', 'ללא גלוטן'] },

    // עיקריות
    { name: 'אנטריקוט שף', basePrice: 180, type: 'MAIN', allergies: [], diets: ['ללא גלוטן'] },
    { name: 'פילה דניס בתנור', basePrice: 145, type: 'MAIN', allergies: ['דגים'], diets: ['ללא גלוטן'] },
    { name: 'חזה עוף ממולא', basePrice: 95, type: 'MAIN', allergies: ['גלוטן'], diets: [] },
    { name: 'ראביולי כמהין', basePrice: 88, type: 'MAIN', allergies: ['גלוטן', 'ביצים', 'חלב'], diets: ['צמחוני'] },
    { name: 'טופו אסייתי בירקות', basePrice: 72, type: 'MAIN', allergies: ['סויה'], diets: ['טבעוני', 'צמחוני'] },

    // תוספות
    { name: 'תפוחי אדמה צלויים', basePrice: 24, type: 'SIDE', allergies: [], diets: ['טבעוני', 'צמחוני', 'ללא גלוטן'] },
    { name: 'אורז יסמין', basePrice: 22, type: 'SIDE', allergies: [], diets: ['טבעוני', 'צמחוני', 'ללא גלוטן'] },
    { name: 'ירקות אנטיפסטי', basePrice: 28, type: 'SIDE', allergies: [], diets: ['טבעוני', 'צמחוני', 'ללא גלוטן'] },

    // קינוחים
    { name: 'מוס שוקולד בלגי', basePrice: 42, type: 'DESSERT', allergies: ['חלב', 'ביצים'], diets: ['צמחוני'] },
    { name: 'עוגת גבינה', basePrice: 38, type: 'DESSERT', allergies: ['חלב', 'ביצים', 'גלוטן'], diets: ['צמחוני'] },
    { name: 'סורבה פירות', basePrice: 28, type: 'DESSERT', allergies: [], diets: ['טבעוני', 'ללא גלוטן'] },

    // שתייה
    { name: 'יין אדום שילוח', basePrice: 35, type: 'DRINK', allergies: [], diets: [] },
    { name: 'מים מינרליים', basePrice: 8, type: 'DRINK', allergies: [], diets: [] },
    { name: 'מיץ טבעי', basePrice: 18, type: 'DRINK', allergies: [], diets: ['טבעוני'] },
  ];

  const itemMap = {};
  let order = 0;
  for (const it of items) {
    const created = await prisma.menuItem.create({
      data: {
        name: it.name,
        basePrice: it.basePrice,
        categoryId: catByType[it.type],
        order: order++,
        allergies: { create: it.allergies.map(a => ({ allergyId: allergyMap[a] })) },
        diets: { create: it.diets.map(d => ({ dietId: dietMap[d], isSuitable: true })) },
      },
    });
    itemMap[it.name] = created.id;
  }

  // === חבילות ===
  await prisma.package.create({
    data: {
      name: 'חבילת חתונה קלאסית',
      type: 'WEDDING',
      description: 'חבילה מלאה ל-100 אורחים ומעלה',
      basePrice: 5000,
      pricePerGuest: 220,
      minGuests: 100,
      items: {
        create: [
          { menuItemId: itemMap['סלט קיסר'], quantity: 1 },
          { menuItemId: itemMap['אנטריקוט שף'], quantity: 1 },
          { menuItemId: itemMap['תפוחי אדמה צלויים'], quantity: 1 },
          { menuItemId: itemMap['מוס שוקולד בלגי'], quantity: 1 },
          { menuItemId: itemMap['יין אדום שילוח'], quantity: 1 },
        ],
      },
    },
  });

  await prisma.package.create({
    data: {
      name: 'חבילת VIP פרימיום',
      type: 'VIP',
      basePrice: 10000,
      pricePerGuest: 380,
      minGuests: 30,
      maxGuests: 80,
      items: {
        create: [
          { menuItemId: itemMap['קרפצ\'יו דג סלמון'], quantity: 1 },
          { menuItemId: itemMap['פילה דניס בתנור'], quantity: 1 },
          { menuItemId: itemMap['ראביולי כמהין'], quantity: 1 },
          { menuItemId: itemMap['ירקות אנטיפסטי'], quantity: 1 },
          { menuItemId: itemMap['עוגת גבינה'], quantity: 1 },
          { menuItemId: itemMap['יין אדום שילוח'], quantity: 2 },
        ],
      },
    },
  });

  await prisma.package.create({
    data: {
      name: 'חבילת בר מצווה',
      type: 'BAR_MITZVAH',
      basePrice: 3000,
      pricePerGuest: 150,
      minGuests: 50,
    },
  });

  // === קופונים ===
  await prisma.coupon.create({
    data: {
      code: 'WELCOME10',
      name: 'הנחה ראשונה',
      type: 'PERCENTAGE',
      value: 10,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      perCustomerLimit: 1,
    },
  });

  await prisma.coupon.create({
    data: {
      code: 'SUMMER500',
      name: 'הטבת קיץ',
      type: 'FIXED_AMOUNT',
      value: 500,
      minOrderAmount: 5000,
      validFrom: new Date('2026-06-01'),
      validUntil: new Date('2026-08-31'),
      maxUses: 100,
    },
  });

  // === תמחור עונתי ===
  await prisma.seasonalPricing.create({
    data: {
      name: 'תוספת חגים - תשפ"ו',
      multiplier: 1.15,
      validFrom: new Date('2026-09-01'),
      validUntil: new Date('2026-10-15'),
      priority: 10,
    },
  });

  // === לקוחות לדמו ===
  await prisma.customer.create({
    data: {
      name: 'מלון השרון',
      email: 'events@sharon-hotel.co.il',
      phone: '03-1234567',
      type: 'HOTEL',
      priceListId: hotelPL.id,
    },
  });
  await prisma.customer.create({
    data: {
      name: 'משפחת כהן',
      email: 'cohen@example.com',
      type: 'PRIVATE',
      loyaltyPoints: 1500,
      loyaltyTier: 'SILVER',
    },
  });
  await prisma.customer.create({
    data: {
      name: 'חברת היי-טק VIP',
      email: 'office@hightech.co.il',
      type: 'VIP',
      priceListId: vipPL.id,
      loyaltyPoints: 8000,
      loyaltyTier: 'PLATINUM',
    },
  });

  console.log('✅ סידינג הושלם בהצלחה');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
