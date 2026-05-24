/**
 * Seed — Israeli hierarchical Chart of Accounts + admin user.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

// Israeli CoA — hierarchical, common structure (חשבון אב + תת חשבונות)
const COA = [
  // Assets — נכסים
  { code: '1000', nameHe: 'נכסים', type: 'ASSET', children: [
    { code: '1100', nameHe: 'נכסים שוטפים', children: [
      { code: '1110', nameHe: 'מזומנים', children: [
        { code: '1111', nameHe: 'קופה ראשית' },
        { code: '1112', nameHe: 'קופה קטנה' },
      ]},
      { code: '1120', nameHe: 'בנקים', children: [
        { code: '1121', nameHe: 'חשבון בנק עו"ש' },
      ]},
      { code: '1130', nameHe: 'לקוחות' },
    ]},
  ]},
  // Liabilities — התחייבויות
  { code: '2000', nameHe: 'התחייבויות', type: 'LIABILITY', children: [
    { code: '2100', nameHe: 'התחייבויות שוטפות', children: [
      { code: '2110', nameHe: 'ספקים' },
      { code: '2120', nameHe: 'מע"מ לתשלום' },
      { code: '2130', nameHe: 'מקדמות ביטוח לאומי' },
    ]},
  ]},
  // Equity — הון
  { code: '3000', nameHe: 'הון', type: 'EQUITY', children: [
    { code: '3100', nameHe: 'הון מניות' },
    { code: '3200', nameHe: 'עודפים' },
  ]},
  // Revenue — הכנסות
  { code: '4000', nameHe: 'הכנסות', type: 'REVENUE', children: [
    { code: '4100', nameHe: 'הכנסות ממכירות' },
    { code: '4200', nameHe: 'הכנסות משירותים' },
  ]},
  // Expenses — הוצאות (the meat)
  { code: '5000', nameHe: 'הוצאות', type: 'EXPENSE', children: [
    { code: '5100', nameHe: 'הוצאות תפעול', children: [
      { code: '5110', nameHe: 'שכירות' },
      { code: '5120', nameHe: 'חשמל' },
      { code: '5130', nameHe: 'מים' },
      { code: '5140', nameHe: 'גז' },
      { code: '5150', nameHe: 'אינטרנט' },
      { code: '5160', nameHe: 'טלפון' },
      { code: '5170', nameHe: 'ניקיון' },
      { code: '5180', nameHe: 'אחזקה ושיפוצים' },
    ]},
    { code: '5200', nameHe: 'ביטוחים', children: [
      { code: '5210', nameHe: 'ביטוח רכוש' },
      { code: '5220', nameHe: 'ביטוח אחריות מקצועית' },
      { code: '5230', nameHe: 'ביטוח רכב' },
    ]},
    { code: '5300', nameHe: 'הוצאות שכר', children: [
      { code: '5310', nameHe: 'שכר עובדים' },
      { code: '5320', nameHe: 'תנאים סוציאליים' },
      { code: '5330', nameHe: 'דמי הבראה' },
    ]},
    { code: '5400', nameHe: 'הוצאות מקצועיות', children: [
      { code: '5410', nameHe: 'הנהלת חשבונות' },
      { code: '5420', nameHe: 'ייעוץ משפטי' },
      { code: '5430', nameHe: 'ייעוץ עסקי' },
    ]},
    { code: '5500', nameHe: 'הוצאות שיווק', children: [
      { code: '5510', nameHe: 'פרסום דיגיטלי' },
      { code: '5520', nameHe: 'דפוס וחומרי שיווק' },
    ]},
    { code: '5600', nameHe: 'נסיעות וכיבודים', children: [
      { code: '5610', nameHe: 'נסיעות' },
      { code: '5620', nameHe: 'כיבודים' },
      { code: '5630', nameHe: 'אש"ל' },
    ]},
    { code: '5700', nameHe: 'הוצאות משרד', children: [
      { code: '5710', nameHe: 'ציוד משרדי' },
      { code: '5720', nameHe: 'תוכנות ומנויים' },
    ]},
    { code: '5900', nameHe: 'הוצאות אחרות' },
  ]},
];

async function seedCoa(nodes, parentId = null, level = 0, inheritedType = null) {
  for (const node of nodes) {
    const type = node.type || inheritedType || 'EXPENSE';
    const existing = await prisma.coA.findUnique({ where: { code: node.code } });
    let created;
    if (existing) {
      created = existing;
    } else {
      created = await prisma.coA.create({
        data: {
          code: node.code,
          nameHe: node.nameHe,
          type,
          parentId,
          level,
        },
      });
    }
    if (node.children?.length) {
      await seedCoa(node.children, created.id, level + 1, type);
    }
  }
}

async function main() {
  console.log('[seed] CoA...');
  await seedCoa(COA);

  console.log('[seed] admin user...');
  const adminEmail = 'admin@example.co.il';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash('admin1234', 10);
    await prisma.user.create({
      data: { email: adminEmail, name: 'מנהל מערכת', passwordHash, role: 'ADMIN' },
    });
    console.log('[seed] admin created: admin@example.co.il / admin1234');
  }

  console.log('[seed] done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
