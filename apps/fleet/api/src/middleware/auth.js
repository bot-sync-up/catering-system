import jwt from 'jsonwebtoken';
import { ERR } from '../utils/hebrew.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    SECRET,
    { expiresIn: '30d' },
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: ERR.UNAUTHORIZED });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: ERR.UNAUTHORIZED });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: ERR.UNAUTHORIZED });
    }
    next();
  };
}
