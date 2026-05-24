const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../utils/db');
const ah = require('../middleware/asyncHandler');

const PackageSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['WEDDING', 'VIP', 'BAR_MITZVAH', 'BUSINESS', 'CUSTOM']).optional(),
  basePrice: z.number().nonnegative(),
  pricePerGuest: z.number().nonnegative().optional(),
  minGuests: z.number().int().positive().optional(),
  maxGuests: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  items: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().int().positive(),
  })).optional(),
});

router.get('/', ah(async (req, res) => {
  const packages = await prisma.package.findMany({
    include: {
      items: { include: { menuItem: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(packages);
}));

router.get('/:id', ah(async (req, res) => {
  const pkg = await prisma.package.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      items: { include: { menuItem: { include: { category: true } } } },
    },
  });
  res.json(pkg);
}));

router.post('/', ah(async (req, res) => {
  const { items = [], ...data } = PackageSchema.parse(req.body);
  const pkg = await prisma.package.create({
    data: {
      ...data,
      items: { create: items },
    },
    include: { items: { include: { menuItem: true } } },
  });
  res.status(201).json(pkg);
}));

router.put('/:id', ah(async (req, res) => {
  const { items, ...data } = PackageSchema.partial().parse(req.body);
  await prisma.$transaction(async (tx) => {
    if (items) {
      await tx.packageItem.deleteMany({ where: { packageId: req.params.id } });
      await tx.packageItem.createMany({
        data: items.map(i => ({ ...i, packageId: req.params.id })),
      });
    }
    await tx.package.update({ where: { id: req.params.id }, data });
  });
  const pkg = await prisma.package.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { menuItem: true } } },
  });
  res.json(pkg);
}));

router.delete('/:id', ah(async (req, res) => {
  await prisma.package.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
