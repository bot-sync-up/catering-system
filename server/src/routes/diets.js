const router = require('express').Router();
const prisma = require('../utils/db');
const ah = require('../middleware/asyncHandler');

router.get('/', ah(async (req, res) => {
  res.json(await prisma.diet.findMany({ orderBy: { name: 'asc' } }));
}));

router.post('/', ah(async (req, res) => {
  const diet = await prisma.diet.create({ data: req.body });
  res.status(201).json(diet);
}));

router.put('/:id', ah(async (req, res) => {
  res.json(await prisma.diet.update({ where: { id: req.params.id }, data: req.body }));
}));

router.delete('/:id', ah(async (req, res) => {
  await prisma.diet.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
