// טיפול מרכזי בשגיאות עם הודעות בעברית
const { ZodError } = require('zod');

module.exports = function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'נתונים שגויים',
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'DUPLICATE',
      message: 'הערך כבר קיים במערכת',
      field: err.meta?.target,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'הפריט לא נמצא',
    });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.code || 'ERROR',
      message: err.message,
    });
  }

  res.status(500).json({
    error: 'SERVER_ERROR',
    message: 'שגיאת שרת פנימית',
  });
};
