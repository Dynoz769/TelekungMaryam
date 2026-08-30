// POST /api/admin/login
// Body: { password }
// Returns { token } on success. The token is an HMAC-signed, time-limited
// (12h) bearer token — admin.html stores it and sends it as
// "Authorization: Bearer <token>" on every other /api/admin/* call.

const crypto = require('crypto');
const { issueToken } = require('../_auth');
const { applyCors } = require('../_cors');

module.exports = async (req, res) => {
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password } = req.body || {};
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD not set');
    res.status(500).json({ error: 'Admin belum dikonfigurasi.' });
    return;
  }

  const given = Buffer.from(String(password || ''));
  const expected = Buffer.from(adminPassword);
  const match = given.length === expected.length && crypto.timingSafeEqual(given, expected);

  if (!match) {
    res.status(401).json({ error: 'Password salah.' });
    return;
  }

  try {
    res.status(200).json({ token: issueToken() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ralat server.' });
  }
};
