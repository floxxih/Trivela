const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 60;

function defaultKeyGenerator(req) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (apiKey) {
    return `api-key:${apiKey}`;
  }

  return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
}

export function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  maxRequests = DEFAULT_MAX_REQUESTS,
  timeProvider = () => Date.now(),
  keyGenerator = defaultKeyGenerator,
} = {}) {
  const buckets = new Map();

  return function rateLimit(req, res, next) {
    const now = timeProvider();
    const key = keyGenerator(req);
    const existing = buckets.get(key);
    const bucket =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(maxRequests - bucket.count, 0);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (bucket.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        keying: 'per API key when present, otherwise per IP address',
        limit: maxRequests,
        windowMs,
        retryAfterSeconds,
      });
    }

    return next();
  };
}
