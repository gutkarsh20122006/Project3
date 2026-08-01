/**
 * Standard API error response shape.
 *
 * @param {import('next').NextApiResponse} res
 * @param {number} status
 * @param {string} message
 * @param {Object} [details]
 */
function sendError(res, status, message, details = {}) {
  const code =
    status === 400
      ? 'BAD_REQUEST'
      : status === 401
      ? 'UNAUTHORIZED'
      : status === 403
      ? 'FORBIDDEN'
      : status === 404
      ? 'NOT_FOUND'
      : status === 429
      ? 'RATE_LIMITED'
      : 'INTERNAL_ERROR';

  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...details,
    },
  });
}

module.exports = {
  sendError,
};
