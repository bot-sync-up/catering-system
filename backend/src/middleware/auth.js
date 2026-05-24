const jwt = require('jsonwebtoken');
const { ApiError } = require('./error');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) throw new ApiError(401, 'נדרשת התחברות', 'NO_AUTH');
  const token = header.replace(/^Bearer\s+/i, '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = decoded;
    next();
  } catch (e) {
    throw new ApiError(401, 'טוקן לא תקין', 'BAD_TOKEN');
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) throw new ApiError(401, 'נדרשת התחברות', 'NO_AUTH');
    if (!roles.includes(req.user.role)) throw new ApiError(403, 'אין הרשאה לפעולה זו', 'FORBIDDEN');
    next();
  };
}

module.exports = { requireAuth, requireRole };
