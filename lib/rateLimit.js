/**
 * Simple in-memory rate limiter. For multi-instance production deployments,
 * swap this for a Redis-backed store (e.g., Upstash Redis).
 */

const DEFAULT_WINDOW_MS = 60_000;

const buckets = new Map();

/**
 * Clean up expired bucket entries periodically to avoid unbounded growth.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of buckets.entries()) {
    if (now - record.windowStart >= DEFAULT_WINDOW_MS * 2) {
      buckets.delete(key);
    }
  }
}, 60_000);

/**
 * Check whether a request is within the allowed rate limit.
 *
 * @param {Object} params
 * @param {string} params.key
 * @param {number} params.limit
 * @param {number} [params.windowMs]
 * @returns {{ allowed: boolean; remaining: number; resetAt: number }}
 */
function checkRateLimit({ key, limit, windowMs = DEFAULT_WINDOW_MS }) {
  if (!key || limit <= 0) {
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const now = Date.now();
  const record = buckets.get(key);

  if (!record || now - record.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: now + windowMs,
    };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.windowStart + windowMs,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - record.count),
    resetAt: record.windowStart + windowMs,
  };
}

/**
 * Build a rate-limit key from a NextApiRequest.
 * Prefers authenticated user id, falls back to IP + route.
 *
 * @param {import('next').NextApiRequest} req
 * @param {string} suffix
 * @param {string} [userId]
 * @returns {string}
 */
function getRateLimitKey(req, suffix, userId) {
  if (typeof userId === 'string' && userId.length > 0) {
    return `user:${userId}:${suffix}`;
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded) ||
    req.socket?.remoteAddress ||
    'unknown';

  return `ip:${ip}:${suffix}`;
}

module.exports = {
  checkRateLimit,
  getRateLimitKey,
  DEFAULT_WINDOW_MS,
};
