// POST /api/admin/upload-image
// Admin-only. Body: { dataUrl } where dataUrl is a base64 data URI (e.g.
// "data:image/jpeg;base64,...") read client-side from an
// <input type="file"> via FileReader. Commits the image as a real file
// under images/ in the repo and returns its relative path for use as a
// product's `image` field.

const crypto = require('crypto');
const { requireAdmin } = require('../_auth');
const { applyCors } = require('../_cors');
const { putFile } = require('../_github');

const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

module.exports = async (req, res) => {
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { dataUrl } = req.body || {};
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl || '');
    if (!match) {
      res.status(400).json({ error: 'Format imej tidak disokong (guna JPG, PNG atau WebP).' });
      return;
    }
    const [, mime, base64] = match;
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_BYTES) {
      res.status(400).json({ error: 'Imej terlalu besar (maksimum 4MB).' });
      return;
    }

    const ext = ALLOWED_EXT[mime];
    const filename = `images/product-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
    await putFile(filename, buffer, `Admin: muat naik imej ${filename}`);
    res.status(200).json({ ok: true, path: filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal muat naik imej. Sila cuba lagi.', detail: String(err && err.message || err) });
  }
};
