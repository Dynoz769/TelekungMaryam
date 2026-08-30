// Minimal signed-session helper for the single-admin login flow
// (admin.html + /api/admin/*). Not a general auth system -- just enough to
// gate the write endpoints behind a password, without a database.

const crypto = require('crypto');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function sign(payload, secret) {
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(json).digest('base64url');
  return `${json}.${sig}`;
}

function verify(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [json, sig] = token.split('.');
  if (!json || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', secret).update(json).digest('base64url');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(json, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
  if (!payload.exp || Date.now() > payload.exp) return null;
  return payload;
}

function issueToken() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET not configured');
  return sign({ exp: Date.now() + TOKEN_TTL_MS }, secret);
}

// Call first in every admin endpoint. Returns true when the request carries
// a valid session token; otherwise writes a 401 response and returns false.
function requireAdmin(req, res) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!secret || !verify(token, secret)) {
    res.status(401).json({ error: 'Sesi admin tamat atau tidak sah. Sila log masuk semula.' });
    return false;
  }
  return true;
}

module.exports = { issueToken, requireAdmin };
