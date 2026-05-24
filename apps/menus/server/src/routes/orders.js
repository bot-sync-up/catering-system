const router = require('express').Router();
const prisma = require('../utils/db');
const ah = require('../middleware/asyncHandler');
const engine = require('../engine/pricingEngine');
const allergyEngine = require('../engine/allergyEngine');

router.get('/', ah(async (req, res) => {
  res.json(await prisma.order.findMany({
    include: { customer: true, package: true, items: true },
    orderBy: { createdAt: 'desc' },
  }));
}));

router.get('/:id', ah(async (req, res) => {
  res.json(await prisma.order.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      customer: true,
      package: true,
      items: { include: { menuItem: true } },
      guests: {
        include: {
          allergies: { include: { allergy: true } },
          diets: { include: { diet: true } },
        },
      },
    },
  }));
}));

router.post('/', ah(async (req, res) => {
  const { customerId, packageId, eventDate, guestCount, items = [], couponCode, loyaltyPointsToRedeem, notes } = req.body;

  // חישוב מקדים
  const calculation = await engine.calculateOrder({
    customerId, packageId, eventDate, guestCount, items, couponCode, loyaltyPointsToRedeem,
  });

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId,
      packageId: packageId || null,
      eventDate: eventDate ? new Date(eventDate) : null,
      guestCount: guestCount || 1,
      couponCode: couponCode || null,
      notes,
      subtotal: calculation.subtotal,
      discountAmount: calculation.discountAmount + calculation.loyaltyDiscount,
      loyaltyRedeemed: calculation.pointsRedeemed,
      total: calculation.total,
      status: 'DRAFT',
      items: {
        create: calculation.items.map(i => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
      },
    },
  });

  res.status(201).json({ order, calculation });
}));

router.post('/:id/confirm', ah(async (req, res) => {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { items: true },
  });
  const calculation = await engine.calculateOrder({
    customerId: order.customerId,
    packageId: order.packageId,
    eventDate: order.eventDate,
    guestCount: order.guestCount,
    items: order.items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
    couponCode: order.couponCode,
    loyaltyPointsToRedeem: order.loyaltyRedeemed,
  });
  const finalized = await engine.finalizeOrder(order.id, calculation);
  res.json({ order: finalized, calculation });
}));

router.post('/:id/cancel', ah(async (req, res) => {
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
  });
  res.json(order);
}));

// ניהול אורחים
router.post('/:id/guests', ah(async (req, res) => {
  const { name, allergyIds = [], dietIds = [] } = req.body;
  const guest = await prisma.guest.create({
    data: {
      name,
      orderId: req.params.id,
      allergies: { create: allergyIds.map(id => ({ allergyId: id })) },
      diets: { create: dietIds.map(id => ({ dietId: id })) },
    },
    include: { allergies: { include: { allergy: true } }, diets: { include: { diet: true } } },
  });
  res.status(201).json(guest);
}));

router.delete('/:id/guests/:guestId', ah(async (req, res) => {
  await prisma.guest.delete({ where: { id: req.params.guestId } });
  res.status(204).end();
}));

// דוח אלרגיות לאירוע
router.get('/:id/allergy-report', ah(async (req, res) => {
  const report = await allergyEngine.eventReport(req.params.id);
  res.json(report);
}));

module.exports = router;
