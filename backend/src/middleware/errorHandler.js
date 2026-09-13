const logger = require('../utils/logger');

// Wraps async handlers so rejected promises reach the error middleware.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Used by controllers to signal expected failures with a specific status code.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler; only sends a clean message to the client.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || 500;

  logger.error(err.message, {
    path: req.originalUrl,
    method: req.method,
    statusCode,
    stack: err.stack
  });

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message
  });
}

module.exports = { asyncHandler, ApiError, notFound, errorHandler };
