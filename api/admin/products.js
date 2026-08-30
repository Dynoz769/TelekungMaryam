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
const { getFile, putFile, deleteFile } = require('../_github');

function slugify(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'produk';
}

// Only images/product-<timestamp>-<hex>.<ext> came from api/admin/upload-image.js
// -- match that exact shape so cleanup never touches anything else (the
// original seed photos, or a path an admin typed in by hand).
const UPLOADED_IMAGE_PATTERN = /^images\/product-\d+-[0-9a-f]+\.(jpg|jpeg|png|webp)$/;

// Deletes `oldImage` from the repo once it's no longer referenced by any
// product -- called after products.json has already been saved with the
// new state, so we only ever delete an image once nothing points to it
// any more. Failures here are logged but never fail the caller's request:
// a leftover image file is a minor cleanup issue, not worth losing the
// product edit/delete the admin actually asked for.
async function cleanupOrphanedImage(oldImage, stillReferenced) {
  if (!oldImage || stillReferenced || !UPLOADED_IMAGE_PATTERN.test(oldImage)) return;
  try {
    const { sha } = await getFile(oldImage);
    if (!sha) return; // already gone
    await deleteFile(oldImage, `Admin: buang gambar tidak digunakan lagi (${oldImage})`, sha);
  } catch (err) {
    console.warn(`Cleanup gagal untuk ${oldImage}:`, err.message);
  }
}

const isImageStillUsed = (imagePath, list) => list.some((p) => p.image === imagePath);

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
      const previousImage = products[idx].image;
      if (name !== undefined && name !== '') products[idx].name = String(name).trim();
      if (price !== undefined && price !== '') products[idx].price = Number(price);
      if (oldPrice !== undefined) products[idx].oldPrice = oldPrice ? Number(oldPrice) : null;
      if (image !== undefined && image !== '') products[idx].image = image;
      if (badge !== undefined) products[idx].badge = badge;
      await putFile('products.json', JSON.stringify(products, null, 2), `Admin: kemas kini produk "${products[idx].name}"`, sha);
      // Only worth checking when the image actually changed -- avoids an
      // extra GitHub round-trip on every plain price/name edit.
      if (previousImage !== products[idx].image) {
        await cleanupOrphanedImage(previousImage, isImageStillUsed(previousImage, products));
      }
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
      await cleanupOrphanedImage(removed.image, isImageStillUsed(removed.image, products));
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ralat menyimpan ke GitHub. Sila cuba lagi.' });
  }
};
