const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../utils/db');
const ah = require('../middleware/asyncHandler');

const CouponSchema = z.object({
  code: z.string().min(2).toUpperCase(),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  value: z.number().positive(),
  minOrderAmount: z.number().nonnegative().optional().nullable(),
  maxDiscount: z.number().positive().optional().nullable(),
  validFrom: z.string().or(z.date()),
  validUntil: z.string().or(z.date()),
  maxUses: z.number().int().positive().optional().nullable(),
  perCustomerLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

router.get('/', ah(async (req, res) => {
  res.json(await prisma.coupon.findMany({
    include: { _count: { select: { usages: true } } },
    orderBy: { createdAt: 'desc' },
  }));
}));

router.get('/:id', ah(async (req, res) => {
  res.json(await prisma.coupon.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { usages: { include: { customer: true } } },
  }));
}));

router.post('/', ah(async (req, res) => {
  const data = CouponSchema.parse(req.body);
  data.validFrom = new Date(data.validFrom);
  data.validUntil = new Date(data.validUntil);
  const coupon = await prisma.coupon.create({ data });
  res.status(201).json(coupon);
}));

router.put('/:id', ah(async (req, res) => {
  const data = CouponSchema.partial().parse(req.body);
  if (data.validFrom) data.validFrom = new Date(data.validFrom);
  if (data.validUntil) data.validUntil = new Date(data.validUntil);
  res.json(await prisma.coupon.update({ where: { id: req.params.id }, data }));
}));

router.delete('/:id', ah(async (req, res) => {
  await prisma.coupon.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

// אימות קופון בלי לחייב
router.post('/validate', ah(async (req, res) => {
  const { code, customerId, subtotal } = req.body;
  const engine = require('../engine/pricingEngine');
  try {
    const result = await engine._applyCoupon(code, customerId, subtotal || 0);
    res.json({ valid: true, ...result });
  } catch (e) {
    res.json({ valid: false, error: e.message });
  }
}));

module.exports = router;
