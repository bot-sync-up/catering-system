function errorHandler(err, req, res, next) {
  console.error('[error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'שגיאת מערכת',
    details: err.details || undefined,
  });
}

class ApiError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = { errorHandler, ApiError };
