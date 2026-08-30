// POST /api/checkout
// Creates a Billplz bill for the customer's cart and returns the hosted
// payment page URL to redirect the browser to.
//
// Deploy this repo to Vercel (as its own project — the static site can stay
// on GitHub Pages) and set these environment variables in the Vercel
// project settings:
//
//   BILLPLZ_API_KEY        Secret key from Billplz dashboard > Settings > API
//   BILLPLZ_COLLECTION_ID  The collection bills should be created in
//   BILLPLZ_BASE_URL       https://www.billplz-sandbox.com while testing,
//                          https://www.billplz.com once verified & live
//   SITE_URL               https://telekungmaryam.com.my
//   ALLOWED_ORIGIN          https://telekungmaryam.com.my (CORS allow-list)
//
// See PAYMENT_SETUP.md at the repo root for the full walkthrough.

const CATALOG = require('./_catalog');

module.exports = async (req, res) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { name, email, phone, items } = req.body || {};

    if (!name || !phone || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Sila lengkapkan nama, no. telefon, dan pastikan troli tidak kosong.' });
      return;
    }

    // Recompute the total server-side from the fixed catalog above — never
    // trust a price the browser sends.
    let totalSen = 0;
    const lines = [];
    for (const line of items) {
      const product = CATALOG[line && line.name];
      if (!product) {
        res.status(400).json({ error: `Produk tidak dikenali: ${line && line.name}` });
        return;
      }
      const qty = Math.max(1, Math.min(20, Number(line.qty) || 0));
      totalSen += product.priceSen * qty;
      lines.push(`${qty}x ${line.name}`);
    }

    if (totalSen <= 0) {
      res.status(400).json({ error: 'Troli tidak sah.' });
      return;
    }

    const apiKey = process.env.BILLPLZ_API_KEY;
    const collectionId = process.env.BILLPLZ_COLLECTION_ID;
    const baseUrl = process.env.BILLPLZ_BASE_URL || 'https://www.billplz-sandbox.com';
    const siteUrl = (process.env.SITE_URL || 'https://telekungmaryam.com.my').replace(/\/$/, '');

    if (!apiKey || !collectionId) {
      console.error('Missing BILLPLZ_API_KEY or BILLPLZ_COLLECTION_ID env var');
      res.status(500).json({ error: 'Payment belum dikonfigurasi. Sila hubungi kedai.' });
      return;
    }

    // callback_url must point at THIS API's own deployment (Vercel), not the
    // storefront (SITE_URL) — the storefront on GitHub Pages has no /api/
    // routes at all, so a webhook sent there would just 404. req.headers.host
    // is the API's own domain (its Vercel URL, or a custom domain if you map
    // one to this project) regardless of how it's deployed.
    const apiHost = req.headers.host;
    const apiOrigin = `https://${apiHost}`;

    const body = new URLSearchParams({
      collection_id: collectionId,
      email: email || '',
      mobile: phone,
      name,
      amount: String(totalSen),
      description: lines.join(', ').slice(0, 200),
      callback_url: `${apiOrigin}/api/billplz-webhook`,
      redirect_url: `${siteUrl}/?order=complete`,
    });

    const billplzRes = await fetch(`${baseUrl}/api/v3/bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64'),
      },
      body: body.toString(),
    });

    const data = await billplzRes.json();

    if (!billplzRes.ok) {
      console.error('Billplz error:', data);
      res.status(502).json({ error: 'Gagal cipta bil pembayaran. Sila cuba lagi sebentar.' });
      return;
    }

    res.status(200).json({ url: data.url, billId: data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ralat server. Sila cuba lagi.' });
  }
};
