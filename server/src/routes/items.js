const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../utils/db');
const ah = require('../middleware/asyncHandler');

const ItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  basePrice: z.number().nonnegative(),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean().optional(),
  order: z.number().optional(),
  categoryId: z.string(),
  allergyIds: z.array(z.string()).optional(),
  dietIds: z.array(z.string()).optional(),
});

router.get('/', ah(async (req, res) => {
  const items = await prisma.menuItem.findMany({
    include: {
      category: true,
      allergies: { include: { allergy: true } },
      diets: { include: { diet: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(items);
}));

router.get('/:id', ah(async (req, res) => {
  const item = await prisma.menuItem.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      category: true,
      allergies: { include: { allergy: true } },
      diets: { include: { diet: true } },
      seasonalPrices: true,
    },
  });
  res.json(item);
}));

router.post('/', ah(async (req, res) => {
  const { allergyIds = [], dietIds = [], ...data } = ItemSchema.parse(req.body);
  const item = await prisma.menuItem.create({
    data: {
      ...data,
      allergies: { create: allergyIds.map(id => ({ allergyId: id })) },
      diets: { create: dietIds.map(id => ({ dietId: id })) },
    },
    include: { allergies: true, diets: true },
  });
  res.status(201).json(item);
}));

router.put('/:id', ah(async (req, res) => {
  const { allergyIds, dietIds, ...data } = ItemSchema.partial().parse(req.body);

  await prisma.$transaction(async (tx) => {
    if (allergyIds) {
      await tx.menuItemAllergy.deleteMany({ where: { menuItemId: req.params.id } });
      await tx.menuItemAllergy.createMany({
        data: allergyIds.map(id => ({ menuItemId: req.params.id, allergyId: id })),
      });
    }
    if (dietIds) {
      await tx.menuItemDiet.deleteMany({ where: { menuItemId: req.params.id } });
      await tx.menuItemDiet.createMany({
        data: dietIds.map(id => ({ menuItemId: req.params.id, dietId: id })),
      });
    }
    await tx.menuItem.update({ where: { id: req.params.id }, data });
  });

  const item = await prisma.menuItem.findUnique({
    where: { id: req.params.id },
    include: { allergies: true, diets: true },
  });
  res.json(item);
}));

router.delete('/:id', ah(async (req, res) => {
  await prisma.menuItem.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
