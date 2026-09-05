/**
 * In-memory sliding window rate limiter middleware (Zero external dependencies)
 */
const requestCounts = new Map();

export function rateLimiter({ windowMs = 60 * 1000, max = 60, message = 'Too many requests, please try again shortly.' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = requestCounts.get(ip) || [];
    // Filter timestamps within current window
    timestamps = timestamps.filter(t => t > windowStart);

    if (timestamps.length >= max) {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message,
        retryAfterSeconds: Math.ceil((timestamps[0] + windowMs - now) / 1000)
      });
    }

    timestamps.push(now);
    requestCounts.set(ip, timestamps);
    next();
  };
}
