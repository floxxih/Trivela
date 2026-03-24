/**
 * Optional API key authentication middleware.
 *
 * If the environment variable TRIVELA_API_KEY is set, all requests that pass
 * through this middleware must include a matching key via one of:
 *   - Header:  X-API-Key: <key>
 *   - Query:   ?api_key=<key>
 *
 * If TRIVELA_API_KEY is **not** set the middleware is a no-op, keeping the API
 * open for local development.
 */

const API_KEY = process.env.TRIVELA_API_KEY || '';

export default function requireApiKey(req, res, next) {
  if (!API_KEY) {
    return next();
  }

  const provided =
    req.headers['x-api-key'] || req.query.api_key;

  if (provided === API_KEY) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized – valid API key required.' });
}
