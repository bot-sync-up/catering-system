const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../utils/db');
const ah = require('../middleware/asyncHandler');

const SeasonalSchema = z.object({
  name: z.string().min(1),
  menuItemId: z.string().optional().nullable(),
  multiplier: z.number().positive().optional(),
  fixedPrice: z.number().nonnegative().optional().nullable(),
  validFrom: z.string().or(z.date()),
  validUntil: z.string().or(z.date()),
  isActive: z.boolean().optional(),
  priority: z.number().int().optional(),
});

router.get('/', ah(async (req, res) => {
  res.json(await prisma.seasonalPricing.findMany({
    include: { menuItem: true },
    orderBy: { validFrom: 'desc' },
  }));
}));

router.post('/', ah(async (req, res) => {
  const data = SeasonalSchema.parse(req.body);
  data.validFrom = new Date(data.validFrom);
  data.validUntil = new Date(data.validUntil);
  res.status(201).json(await prisma.seasonalPricing.create({ data }));
}));

router.put('/:id', ah(async (req, res) => {
  const data = SeasonalSchema.partial().parse(req.body);
  if (data.validFrom) data.validFrom = new Date(data.validFrom);
  if (data.validUntil) data.validUntil = new Date(data.validUntil);
  res.json(await prisma.seasonalPricing.update({ where: { id: req.params.id }, data }));
}));

router.delete('/:id', ah(async (req, res) => {
  await prisma.seasonalPricing.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
