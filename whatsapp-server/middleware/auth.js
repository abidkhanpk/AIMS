/**
 * WhatsApp Session API — Auth Middleware
 * Validates the X-WA-SECRET header against either the API_SECRETS_MAP or API_SECRET env var.
 * Auto-prefixes clientId based on the matched app to isolate sessions.
 */

function authMiddleware(req, res, next) {
  const secret = req.headers['x-wa-secret'];

  // 1. Try to load and parse API_SECRETS_MAP
  let secretsMap = {};
  if (process.env.API_SECRETS_MAP) {
    try {
      secretsMap = JSON.parse(process.env.API_SECRETS_MAP);
    } catch (e) {
      console.error('Failed to parse API_SECRETS_MAP env var as JSON:', e.message);
    }
  }

  let matchedPrefix = null;
  let isAuthorized = false;

  // 2. Validate against map
  if (secret && secretsMap[secret]) {
    matchedPrefix = secretsMap[secret];
    isAuthorized = true;
  } 
  // 3. Fallback to single API_SECRET
  else {
    const expected = process.env.API_SECRET;
    if (expected && secret === expected) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing X-WA-SECRET header' });
  }

  // 4. If prefix is found, automatically prepend it to any clientId parameter
  if (matchedPrefix) {
    // Prepend to body if present
    if (req.body && req.body.clientId && !req.body.clientId.startsWith(`${matchedPrefix}_`)) {
      req.body.clientId = `${matchedPrefix}_${req.body.clientId}`;
    }
    // Prepend to query strings if present
    if (req.query && req.query.clientId && !req.query.clientId.startsWith(`${matchedPrefix}_`)) {
      req.query.clientId = `${matchedPrefix}_${req.query.clientId}`;
    }
    
    // Prepend to URL path parameters (e.g. /init/:clientId, /status/:clientId)
    // Note: In Express, route params are parsed on the router level, meaning req.params is empty
    // when this parent middleware runs. We rewrite req.url to inject the prefix for the router.
    const urlParts = req.url.split('?');
    const pathParts = urlParts[0].split('/');
    if (pathParts.length > 1) {
      const lastPart = pathParts[pathParts.length - 1];
      const keywords = ['init', 'qr', 'status', 'queue', 'settings', 'send', 'send-bulk'];
      if (lastPart && !keywords.includes(lastPart) && !lastPart.startsWith(`${matchedPrefix}_`)) {
        pathParts[pathParts.length - 1] = `${matchedPrefix}_${lastPart}`;
        urlParts[0] = pathParts.join('/');
        req.url = urlParts.join('?');
      }
    }
  }

  next();
}

module.exports = authMiddleware;
