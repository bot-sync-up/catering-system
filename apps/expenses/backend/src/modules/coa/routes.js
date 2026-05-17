const express = require('express');
const { z } = require('zod');
const prisma = require('../../db/prisma');
const { requireAuth } = require('../../middleware/auth');
const { ApiError } = require('../../middleware/error');

const router = express.Router();
router.use(requireAuth);

// GET tree
router.get('/', async (req, res) => {
  const all = await prisma.coA.findMany({ orderBy: { code: 'asc' } });
  const map = new Map(all.map((c) => [c.id, { ...c, children: [] }]));
  const roots = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }
  res.json(roots);
});

router.get('/flat', async (req, res) => {
  const list = await prisma.coA.findMany({ orderBy: { code: 'asc' } });
  res.json(list);
});

const upsertSchema = z.object({
  code: z.string(),
  nameHe: z.string(),
  nameEn: z.string().optional(),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  parentId: z.string().nullable().optional(),
  level: z.number().int().optional(),
});

router.post('/', async (req, res) => {
  const data = upsertSchema.parse(req.body);
  const coa = await prisma.coA.create({ data });
  res.status(201).json(coa);
});

router.put('/:id', async (req, res) => {
  const data = upsertSchema.partial().parse(req.body);
  const coa = await prisma.coA.update({ where: { id: req.params.id }, data });
  res.json(coa);
});

router.delete('/:id', async (req, res) => {
  const used = await prisma.expense.count({ where: { coaId: req.params.id } });
  if (used > 0) throw new ApiError(400, 'לא ניתן למחוק חשבון בשימוש', 'COA_IN_USE');
  await prisma.coA.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

module.exports = router;
