const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../../db/prisma');
const { ApiError } = require('../../middleware/error');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'MANAGER', 'USER', 'ACCOUNTANT']).optional(),
});

router.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, 'משתמש כבר קיים', 'USER_EXISTS');
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { email: data.email, name: data.name, passwordHash, role: data.role || 'USER' },
    select: { id: true, email: true, name: true, role: true },
  });
  res.status(201).json(user);
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(401, 'שם משתמש או סיסמה שגויים', 'BAD_CREDS');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'שם משתמש או סיסמה שגויים', 'BAD_CREDS');
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

module.exports = router;
