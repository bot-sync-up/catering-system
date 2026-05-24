const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../utils/db');
const ah = require('../middleware/asyncHandler');

const MenuSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isTemplate: z.boolean().optional(),
  customerId: z.string().optional().nullable(),
});

router.get('/', ah(async (req, res) => {
  const menus = await prisma.menu.findMany({
    include: {
      categories: {
        include: { items: true },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(menus);
}));

router.get('/:id', ah(async (req, res) => {
  const menu = await prisma.menu.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      categories: {
        include: {
          items: {
            include: {
              allergies: { include: { allergy: true } },
              diets: { include: { diet: true } },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });
  res.json(menu);
}));

router.post('/', ah(async (req, res) => {
  const data = MenuSchema.parse(req.body);
  const menu = await prisma.menu.create({ data });
  res.status(201).json(menu);
}));

router.put('/:id', ah(async (req, res) => {
  const data = MenuSchema.partial().parse(req.body);
  const menu = await prisma.menu.update({ where: { id: req.params.id }, data });
  res.json(menu);
}));

router.delete('/:id', ah(async (req, res) => {
  await prisma.menu.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

// שכפול תפריט
router.post('/:id/duplicate', ah(async (req, res) => {
  const src = await prisma.menu.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { categories: { include: { items: true } } },
  });
  const newMenu = await prisma.menu.create({
    data: {
      name: `${src.name} (העתק)`,
      description: src.description,
      isTemplate: false,
      categories: {
        create: src.categories.map(c => ({
          name: c.name,
          type: c.type,
          order: c.order,
          items: {
            create: c.items.map(i => ({
              name: i.name,
              description: i.description,
              basePrice: i.basePrice,
              imageUrl: i.imageUrl,
              isAvailable: i.isAvailable,
              order: i.order,
            })),
          },
        })),
      },
    },
    include: { categories: { include: { items: true } } },
  });
  res.status(201).json(newMenu);
}));

// סדר מחדש קטגוריות / פריטים (drag & drop)
router.post('/:id/reorder', ah(async (req, res) => {
  const { categories = [], items = [] } = req.body;
  await prisma.$transaction([
    ...categories.map(c => prisma.menuCategory.update({ where: { id: c.id }, data: { order: c.order } })),
    ...items.map(i => prisma.menuItem.update({
      where: { id: i.id },
      data: { order: i.order, ...(i.categoryId && { categoryId: i.categoryId }) },
    })),
  ]);
  res.json({ ok: true });
}));

// === קטגוריות ===
router.post('/:id/categories', ah(async (req, res) => {
  const cat = await prisma.menuCategory.create({
    data: {
      menuId: req.params.id,
      name: req.body.name,
      type: req.body.type || 'MAIN',
      order: req.body.order || 0,
    },
  });
  res.status(201).json(cat);
}));

router.put('/categories/:catId', ah(async (req, res) => {
  const cat = await prisma.menuCategory.update({
    where: { id: req.params.catId },
    data: req.body,
  });
  res.json(cat);
}));

router.delete('/categories/:catId', ah(async (req, res) => {
  await prisma.menuCategory.delete({ where: { id: req.params.catId } });
  res.status(204).end();
}));

module.exports = router;
