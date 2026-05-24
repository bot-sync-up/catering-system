const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../utils/db');
const ah = require('../middleware/asyncHandler');

const CustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  type: z.enum(['PRIVATE', 'BUSINESS', 'HOTEL', 'VIP']).optional(),
  priceListId: z.string().optional().nullable(),
});

router.get('/', ah(async (req, res) => {
  res.json(await prisma.customer.findMany({
    include: { priceList: true },
    orderBy: { name: 'asc' },
  }));
}));

router.get('/:id', ah(async (req, res) => {
  res.json(await prisma.customer.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      priceList: true,
      orders: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  }));
}));

router.post('/', ah(async (req, res) => {
  const data = CustomerSchema.parse(req.body);
  res.status(201).json(await prisma.customer.create({ data }));
}));

router.put('/:id', ah(async (req, res) => {
  const data = CustomerSchema.partial().parse(req.body);
  res.json(await prisma.customer.update({ where: { id: req.params.id }, data }));
}));

router.delete('/:id', ah(async (req, res) => {
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
