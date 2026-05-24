import { PrismaClient, CustomerType, CustomerStatus, LeadSource, LeadStatus, TagKind } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Users
  const manager = await prisma.user.upsert({
    where: { email: 'manager@crm.local' },
    update: {},
    create: {
      email: 'manager@crm.local',
      name: 'מנהל ראשי',
      role: 'admin',
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@crm.local' },
    update: {},
    create: {
      email: 'agent@crm.local',
      name: 'נציג מכירות',
      role: 'agent',
    },
  });

  // Tags
  const tagDefs: { name: string; kind: TagKind; color: string }[] = [
    { name: 'VIP', kind: 'VIP', color: '#facc15' },
    { name: 'חוזר', kind: 'RETURNING', color: '#22c55e' },
    { name: 'חדש', kind: 'NEW', color: '#3b82f6' },
    { name: 'בסיכון', kind: 'AT_RISK', color: '#ef4444' },
  ];
  for (const t of tagDefs) {
    await prisma.tag.upsert({
      where: { name: t.name },
      update: { kind: t.kind, color: t.color },
      create: t,
    });
  }

  // Default Pipeline + Stages
  let pipeline = await prisma.pipeline.findUnique({ where: { name: 'מכירות' } });
  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: {
        name: 'מכירות',
        description: 'צינור ראשי - לידים עד סגירה',
        isDefault: true,
        stages: {
          create: [
            { name: 'ליד חדש', order: 1, probability: 0.1 },
            { name: 'יצירת קשר', order: 2, probability: 0.25 },
            { name: 'הצעת מחיר', order: 3, probability: 0.5 },
            { name: 'מו"מ', order: 4, probability: 0.7 },
            { name: 'סגירה', order: 5, probability: 1.0, isWon: true },
            { name: 'אבד', order: 6, probability: 0, isLost: true },
          ],
        },
      },
      include: { stages: true },
    });
  }
  const stages = await prisma.stage.findMany({
    where: { pipelineId: pipeline.id },
    orderBy: { order: 'asc' },
  });

  // Customers
  const acme = await prisma.customer.upsert({
    where: { id: 'seed-acme' },
    update: {},
    create: {
      id: 'seed-acme',
      type: CustomerType.B2B,
      status: CustomerStatus.ACTIVE,
      displayName: 'Acme בע"מ',
      companyName: 'Acme Industries Ltd.',
      taxId: '513456789',
      email: 'contact@acme.co.il',
      phone: '03-1234567',
      website: 'https://acme.co.il',
      accountManagerId: manager.id,
      contactPersons: {
        create: [
          { fullName: 'דניאל כהן', role: 'מנכ"ל', email: 'daniel@acme.co.il', phone: '050-1111111', isPrimary: true },
          { fullName: 'רותי לוי', role: 'סמנכ"לית כספים', email: 'ruti@acme.co.il' },
        ],
      },
      addresses: {
        create: [{ street: 'רוטשילד 1', city: 'תל אביב', postalCode: '6688101', isPrimary: true }],
      },
    },
  });

  const personalCustomer = await prisma.customer.upsert({
    where: { id: 'seed-yossi' },
    update: {},
    create: {
      id: 'seed-yossi',
      type: CustomerType.B2C,
      status: CustomerStatus.ACTIVE,
      displayName: 'יוסי ישראלי',
      email: 'yossi@example.com',
      phone: '052-2222222',
      accountManagerId: agent.id,
    },
  });

  // Tag associations
  const vipTag = await prisma.tag.findUnique({ where: { name: 'VIP' } });
  if (vipTag) {
    await prisma.customerTag.upsert({
      where: { customerId_tagId: { customerId: acme.id, tagId: vipTag.id } },
      update: {},
      create: { customerId: acme.id, tagId: vipTag.id },
    });
  }

  // Sample lead
  const stage1 = stages[0];
  await prisma.lead.upsert({
    where: { id: 'seed-lead-1' },
    update: {},
    create: {
      id: 'seed-lead-1',
      title: 'הזדמנות גדולה - Acme',
      description: 'מעוניינים בחבילה ארגונית',
      source: LeadSource.REFERRAL,
      status: LeadStatus.NEW,
      value: 50000,
      pipelineId: pipeline.id,
      stageId: stage1.id,
      ownerId: agent.id,
      customerId: acme.id,
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'q2-launch',
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
