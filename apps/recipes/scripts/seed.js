// Seed demo data
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  // Suppliers
  const sup1 = await db.supplier.upsert({ where: { name: 'שוק הסיטונאי' }, update: {}, create: { name: 'שוק הסיטונאי', phone: '03-1111111' } });
  const sup2 = await db.supplier.upsert({ where: { name: 'יהודה ירקות' }, update: {}, create: { name: 'יהודה ירקות', phone: '03-2222222' } });

  const items = [
    { name: 'בשר בקר טחון', unit: 'kg', cat: 'בשר',     prices: [[sup1, 65, 'kg'], [sup2, 70, 'kg']] },
    { name: 'בצל',          unit: 'kg', cat: 'ירקות',  prices: [[sup1, 4.5, 'kg'], [sup2, 3.9, 'kg']] },
    { name: 'עגבניה',       unit: 'kg', cat: 'ירקות',  prices: [[sup2, 5.2, 'kg']] },
    { name: 'שמן זית',      unit: 'l',  cat: 'שמנים',  prices: [[sup1, 38, 'l']] },
    { name: 'אורז בסמטי',   unit: 'kg', cat: 'דגנים',  prices: [[sup1, 12, 'kg'], [sup2, 14, 'kg']] },
    { name: 'מלח',          unit: 'kg', cat: 'תבלינים',prices: [[sup1, 3, 'kg']] },
    { name: 'פלפל שחור',    unit: 'kg', cat: 'תבלינים',prices: [[sup1, 80, 'kg']] }
  ];
  const products = {};
  for (const it of items) {
    const p = await db.product.upsert({
      where: { name: it.name },
      update: { unit: it.unit, category: it.cat },
      create: { name: it.name, unit: it.unit, category: it.cat }
    });
    products[it.name] = p;
    for (const [s, price, unit] of it.prices) {
      const exists = await db.supplierPrice.findFirst({ where: { productId: p.id, supplierId: s.id } });
      if (!exists) await db.supplierPrice.create({ data: { productId: p.id, supplierId: s.id, price, unit } });
    }
  }

  // Recipe: קציצות בסיסי + VIP
  const r = await db.recipe.upsert({
    where: { id: 'demo-kotzitzot' },
    update: {},
    create: { id: 'demo-kotzitzot', name: 'קציצות ברוטב עגבניות', category: 'main', defaultServings: 10, markupPct: 220 }
  });

  let v1 = await db.recipeVersion.findFirst({ where: { recipeId: r.id, label: 'v1' } });
  if (!v1) {
    v1 = await db.recipeVersion.create({
      data: {
        recipeId: r.id, tier: 'BASIC', label: 'v1', message: 'יצירה ראשונית',
        servings: 10, prepMinutes: 45, cookMinutes: 40,
        instructions: '1. לקצוץ בצל ולהזהיב.\n2. לערבב עם בשר טחון, מלח ופלפל.\n3. לעצב קציצות.\n4. לבשל ברוטב עגבניות 30 דק\'.',
        ingredients: {
          create: [
            { productId: products['בשר בקר טחון'].id, qty: 1.5, unit: 'kg' },
            { productId: products['בצל'].id,         qty: 0.5, unit: 'kg' },
            { productId: products['עגבניה'].id,      qty: 1.2, unit: 'kg' },
            { productId: products['שמן זית'].id,     qty: 0.1, unit: 'l' },
            { productId: products['מלח'].id,         qty: 0.02, unit: 'kg' },
            { productId: products['פלפל שחור'].id,   qty: 0.005, unit: 'kg' }
          ]
        }
      }
    });
  }

  let v2 = await db.recipeVersion.findFirst({ where: { recipeId: r.id, label: 'VIP' } });
  if (!v2) {
    v2 = await db.recipeVersion.create({
      data: {
        recipeId: r.id, parentId: v1.id, tier: 'VIP', label: 'VIP', message: 'גרסת VIP — בשר עגל ותוספת אורז',
        servings: 10, prepMinutes: 60, cookMinutes: 50,
        instructions: '1. כמו בבסיסי, אך עם בשר עגל.\n2. לטגן עם שמן זית כתית.\n3. להגיש על מצע אורז בסמטי.',
        ingredients: {
          create: [
            { productId: products['בשר בקר טחון'].id, qty: 2.0, unit: 'kg' },
            { productId: products['בצל'].id,         qty: 0.6, unit: 'kg' },
            { productId: products['עגבניה'].id,      qty: 1.5, unit: 'kg' },
            { productId: products['שמן זית'].id,     qty: 0.2, unit: 'l' },
            { productId: products['אורז בסמטי'].id,  qty: 1.0, unit: 'kg' },
            { productId: products['מלח'].id,         qty: 0.025, unit: 'kg' },
            { productId: products['פלפל שחור'].id,   qty: 0.008, unit: 'kg' }
          ]
        }
      }
    });
  }

  await db.recipe.update({ where: { id: r.id }, data: { currentVersionId: v2.id } });

  // Event + tasks
  const e = await db.event.upsert({
    where: { id: 'demo-event' },
    update: {},
    create: { id: 'demo-event', name: 'חתונת משפ\' כהן', date: new Date(Date.now() + 3 * 24 * 3600_000), guests: 80 }
  });
  const existing = await db.prepTask.count({ where: { eventId: e.id } });
  if (existing === 0) {
    await db.prepTask.createMany({
      data: [
        { eventId: e.id, versionId: v2.id, title: 'הכנת בצק קציצות',  station: 'cold', assignee: 'יוסי', durationMin: 90, parallel: false, startAt: e.date, servings: 80 },
        { eventId: e.id, versionId: v2.id, title: 'בישול רוטב עגבניות', station: 'hot',  assignee: 'דנה', durationMin: 120, parallel: true,  startAt: e.date, servings: 80 },
        { eventId: e.id, versionId: v2.id, title: 'בישול אורז',        station: 'hot',  assignee: 'מיכל', durationMin: 30,  parallel: true,  startAt: e.date, servings: 80 },
        { eventId: e.id, versionId: v2.id, title: 'הרכבת מנות',         station: 'hot',  assignee: 'יוסי', durationMin: 45,  parallel: false, startAt: e.date, servings: 80 }
      ]
    });
  }

  console.log('Seeded.');
}

main().catch(console.error).finally(() => db.$disconnect());
