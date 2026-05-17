import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // מדיניות ביטול ברירת מחדל
  const policy = await prisma.cancellationPolicy.upsert({
    where: { name: 'מדיניות סטנדרטית' },
    update: {},
    create: {
      name: 'מדיניות סטנדרטית',
      description: 'מדרג ביטולים סטנדרטי לאירועים',
      tiers: {
        create: [
          { hoursBeforeMin: 0, hoursBeforeMax: 48, refundPercent: 0 },
          { hoursBeforeMin: 48, hoursBeforeMax: 24 * 7, refundPercent: 25 },
          { hoursBeforeMin: 24 * 7, hoursBeforeMax: 24 * 14, refundPercent: 50 },
          { hoursBeforeMin: 24 * 14, hoursBeforeMax: 24 * 30, refundPercent: 75 },
          { hoursBeforeMin: 24 * 30, hoursBeforeMax: null, refundPercent: 100 },
        ],
      },
    },
  });

  // לקוח דוגמה
  const customer = await prisma.customer.upsert({
    where: { phone: '050-1234567' },
    update: {},
    create: {
      fullName: 'ישראל ישראלי',
      phone: '050-1234567',
      email: 'israel@example.com',
      address: 'רחוב הרצל 5',
      city: 'תל אביב',
    },
  });

  console.log('seeded:', { policyId: policy.id, customerId: customer.id });
}

main().finally(() => prisma.$disconnect());
