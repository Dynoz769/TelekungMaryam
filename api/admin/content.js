// PUT /api/admin/content
// Admin-only (requires a valid session token from /api/admin/login).
// Overwrites content.json wholesale with the object in the request body --
// admin.html fetches the current content, edits it client-side, and PUTs
// the entire updated object back in one go. Simpler and safer than
// building granular per-field endpoints for the many sections on the page,
// at the cost of two admins not being able to safely edit at the same time
// (fine for a single-admin site).
//
// Every save is a real commit to content.json in the GitHub repo -- see
// api/_github.js and ADMIN_SETUP.md.

const { requireAdmin } = require('../_auth');
const { applyCors } = require('../_cors');
const { getFile, putFile } = require('../_github');

// Only validate shape loosely -- this endpoint trusts the admin (it's
// already behind requireAdmin) and mirrors whatever admin.html sends, so a
// new section can be added to content.json/admin.html later without this
// file needing a matching update.
function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

module.exports = async (req, res) => {
  applyCors(req, res, 'PUT, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const content = req.body;
    if (!isPlainObject(content)) {
      res.status(400).json({ error: 'Data kandungan tidak sah.' });
      return;
    }

    const { sha } = await getFile('content.json');
    await putFile('content.json', JSON.stringify(content, null, 2), 'Admin: kemas kini kandungan laman', sha);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ralat menyimpan ke GitHub. Sila cuba lagi.' });
  }
};
