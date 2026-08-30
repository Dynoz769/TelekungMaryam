// POST/PUT/DELETE /api/admin/products
// Admin-only (requires a valid session token from /api/admin/login).
// Reads and writes products.json directly in the GitHub repo — every
// change is a real commit, so it's versioned and reversible from GitHub
// history if something goes wrong.
//
// Body shapes:
//   POST   { name, price, oldPrice, image, badge }   -> create a product
//   PUT    { id, name, price, oldPrice, image, badge } -> update one
//   DELETE { id }                                      -> remove one

const crypto = require('crypto');
const { requireAdmin } = require('../_auth');
const { applyCors } = require('../_cors');
const { getFile, putFile } = require('../_github');

function slugify(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'produk';
}

module.exports = async (req, res) => {
  applyCors(req, res, 'POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (!requireAdmin(req, res)) return;

  try {
    const { content, sha } = await getFile('products.json');
    const products = content ? JSON.parse(content) : [];

    if (req.method === 'POST') {
      const { name, price, oldPrice, image, badge } = req.body || {};
      if (!name || !(Number(price) > 0)) {
        res.status(400).json({ error: 'Nama dan harga (lebih besar dari 0) diperlukan.' });
        return;
      }
      const id = `${slugify(name)}-${crypto.randomBytes(3).toString('hex')}`;
      products.push({
        id,
        name: String(name).trim(),
        price: Number(price),
        oldPrice: oldPrice ? Number(oldPrice) : null,
        image: image || '',
        badge: badge || '',
      });
      await putFile('products.json', JSON.stringify(products, null, 2), `Admin: tambah produk "${name}"`, sha);
      res.status(200).json({ ok: true, id });
      return;
    }

    if (req.method === 'PUT') {
      const { id, name, price, oldPrice, image, badge } = req.body || {};
      const idx = products.findIndex((p) => p.id === id);
      if (idx === -1) {
        res.status(404).json({ error: 'Produk tidak dijumpai.' });
        return;
      }
      if (name !== undefined && name !== '') products[idx].name = String(name).trim();
      if (price !== undefined && price !== '') products[idx].price = Number(price);
      if (oldPrice !== undefined) products[idx].oldPrice = oldPrice ? Number(oldPrice) : null;
      if (image !== undefined && image !== '') products[idx].image = image;
      if (badge !== undefined) products[idx].badge = badge;
      await putFile('products.json', JSON.stringify(products, null, 2), `Admin: kemas kini produk "${products[idx].name}"`, sha);
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      const idx = products.findIndex((p) => p.id === id);
      if (idx === -1) {
        res.status(404).json({ error: 'Produk tidak dijumpai.' });
        return;
      }
      const [removed] = products.splice(idx, 1);
      await putFile('products.json', JSON.stringify(products, null, 2), `Admin: buang produk "${removed.name}"`, sha);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ralat menyimpan ke GitHub. Sila cuba lagi.' });
  }
};
