/**
 * Simple request logger middleware.
 * Logs method, path, status code and response time.
 */
export default function logger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    console.log(`${method} ${originalUrl} ${statusCode} - ${duration}ms`);
  });

  next();
}
