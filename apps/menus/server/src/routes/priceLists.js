const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../utils/db');
const ah = require('../middleware/asyncHandler');

const PriceListSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  globalDiscount: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

router.get('/', ah(async (req, res) => {
  res.json(await prisma.customerPriceList.findMany({
    include: { itemPrices: { include: { } } },
  }));
}));

router.get('/:id', ah(async (req, res) => {
  const pl = await prisma.customerPriceList.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      itemPrices: true,
      customers: true,
    },
  });
  res.json(pl);
}));

router.post('/', ah(async (req, res) => {
  const data = PriceListSchema.parse(req.body);
  const pl = await prisma.customerPriceList.create({ data });
  res.status(201).json(pl);
}));

router.put('/:id', ah(async (req, res) => {
  const data = PriceListSchema.partial().parse(req.body);
  res.json(await prisma.customerPriceList.update({ where: { id: req.params.id }, data }));
}));

router.delete('/:id', ah(async (req, res) => {
  await prisma.customerPriceList.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

// === מחירי פריטים בודדים ===
router.post('/:id/items', ah(async (req, res) => {
  const { menuItemId, customPrice, discount } = req.body;
  const pli = await prisma.priceListItem.upsert({
    where: { priceListId_menuItemId: { priceListId: req.params.id, menuItemId } },
    create: { priceListId: req.params.id, menuItemId, customPrice, discount },
    update: { customPrice, discount },
  });
  res.json(pli);
}));

router.delete('/:id/items/:menuItemId', ah(async (req, res) => {
  await prisma.priceListItem.delete({
    where: { priceListId_menuItemId: { priceListId: req.params.id, menuItemId: req.params.menuItemId } },
  });
  res.status(204).end();
}));

module.exports = router;
