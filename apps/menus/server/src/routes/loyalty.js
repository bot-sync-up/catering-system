const router = require('express').Router();
const prisma = require('../utils/db');
const ah = require('../middleware/asyncHandler');

// היסטוריה ללקוח
router.get('/customer/:customerId', ah(async (req, res) => {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: req.params.customerId },
    include: {
      loyaltyHistory: { orderBy: { createdAt: 'desc' }, take: 100 },
    },
  });
  const tier = await prisma.loyaltyTierConfig.findUnique({ where: { tier: customer.loyaltyTier } });
  const allTiers = await prisma.loyaltyTierConfig.findMany({ orderBy: { minPoints: 'asc' } });
  const nextTier = allTiers.find(t => t.minPoints > customer.loyaltyPoints);
  res.json({
    customer,
    currentTier: tier,
    nextTier,
    pointsToNext: nextTier ? nextTier.minPoints - customer.loyaltyPoints : 0,
  });
}));

// התאמת נקודות ידנית
router.post('/customer/:customerId/adjust', ah(async (req, res) => {
  const { points, reason } = req.body;
  const customer = await prisma.$transaction(async (tx) => {
    const c = await tx.customer.update({
      where: { id: req.params.customerId },
      data: { loyaltyPoints: { increment: points } },
    });
    await tx.loyaltyEntry.create({
      data: {
        customerId: req.params.customerId,
        type: 'ADJUST',
        points,
        reason: reason || 'התאמה ידנית',
      },
    });
    return c;
  });
  res.json(customer);
}));

// ניהול רמות
router.get('/tiers', ah(async (req, res) => {
  res.json(await prisma.loyaltyTierConfig.findMany({ orderBy: { minPoints: 'asc' } }));
}));

router.put('/tiers/:tier', ah(async (req, res) => {
  const t = await prisma.loyaltyTierConfig.upsert({
    where: { tier: req.params.tier },
    create: { tier: req.params.tier, ...req.body },
    update: req.body,
  });
  res.json(t);
}));

module.exports = router;
