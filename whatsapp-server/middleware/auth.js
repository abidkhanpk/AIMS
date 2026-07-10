/**
 * WhatsApp Session API — Auth Middleware
 * Validates the X-WA-SECRET header against the API_SECRET env var.
 * Generic — no app-specific logic.
 */

function authMiddleware(req, res, next) {
  const secret = req.headers['x-wa-secret'];
  const expected = process.env.API_SECRET;

  if (!expected) {
    console.error('API_SECRET is not set in environment variables');
    return res.status(500).json({ error: 'Server misconfigured: API_SECRET not set' });
  }

  if (!secret || secret !== expected) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing X-WA-SECRET header' });
  }

  next();
}

module.exports = authMiddleware;
