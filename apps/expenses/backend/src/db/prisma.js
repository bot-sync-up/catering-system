const { PrismaClient } = require('@prisma/client');
const prisma = global.__prisma__ || new PrismaClient({ log: ['warn', 'error'] });
if (process.env.NODE_ENV !== 'production') global.__prisma__ = prisma;
module.exports = prisma;
