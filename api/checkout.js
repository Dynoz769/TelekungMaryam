// POST /api/checkout
// Creates a ToyyibPay bill for the customer's cart and returns the hosted
// payment page URL to redirect the browser to.
//
// Deploy this repo to Vercel (as its own project — the static site can stay
// on GitHub Pages) and set these environment variables in the Vercel
// project settings:
//
//   TOYYIBPAY_SECRET_KEY    User Secret Key from ToyyibPay > Profile > Get Started
//   TOYYIBPAY_CATEGORY_CODE Category code from ToyyibPay > Category
//   TOYYIBPAY_BASE_URL      https://dev.toyyibpay.com while testing,
//                           https://toyyibpay.com once verified & live
//   SITE_URL                https://telekungmaryam.com.my
//   ALLOWED_ORIGIN           Comma-separated list of origins allowed to call
//                            this API, e.g.
//                            "https://telekungmaryam.com.my,https://dynoz769.github.io"
//                            (useful while the custom domain's DNS isn't
//                            live yet and the storefront is only reachable
//                            at its default GitHub Pages URL)
//   GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH
//                            Needed by _catalog.js to read the live price
//                            list from products.json — see ADMIN_SETUP.md
//
// See PAYMENT_SETUP.md and ADMIN_SETUP.md at the repo root for the full
// walkthrough.

const { getCatalog } = require('./_catalog');
const { applyCors } = require('./_cors');

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

  try {
    const { name, email, phone, items } = req.body || {};

    if (!name || !phone || !email || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Sila lengkapkan nama, e-mel, no. telefon, dan pastikan troli tidak kosong.' });
      return;
    }

    // Recompute the total server-side from the live catalog (products.json
    // in this repo) — never trust a price the browser sends.
    const CATALOG = await getCatalog();
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

    const secretKey = process.env.TOYYIBPAY_SECRET_KEY;
    const categoryCode = process.env.TOYYIBPAY_CATEGORY_CODE;
    const baseUrl = process.env.TOYYIBPAY_BASE_URL || 'https://dev.toyyibpay.com';
    const siteUrl = (process.env.SITE_URL || 'https://telekungmaryam.com.my').replace(/\/$/, '');

    if (!secretKey || !categoryCode) {
      console.error('Missing TOYYIBPAY_SECRET_KEY or TOYYIBPAY_CATEGORY_CODE env var');
      res.status(500).json({ error: 'Payment belum dikonfigurasi. Sila hubungi kedai.' });
      return;
    }

    // billCallbackUrl must point at THIS API's own deployment (Vercel), not
    // the storefront (SITE_URL) — the storefront on GitHub Pages has no
    // /api/ routes at all, so a callback sent there would just 404.
    const apiOrigin = `https://${req.headers.host}`;
    const orderId = `TM${Date.now()}`;

    const body = new URLSearchParams({
      userSecretKey: secretKey,
      categoryCode,
      billName: 'Telekung Maryam Order'.slice(0, 30),
      billDescription: lines.join(', ').slice(0, 100),
      billPriceSetting: '1',
      billPayorInfo: '1',
      billAmount: String(totalSen),
      billReturnUrl: `${siteUrl}/?order=complete`,
      billCallbackUrl: `${apiOrigin}/api/toyyibpay-webhook`,
      billExternalReferenceNo: orderId,
      billTo: name,
      billEmail: email,
      billPhone: phone,
      billSplitPayment: '0',
      billPaymentChannel: '0', // 0 = FPX & credit card
      billContentEmail: 'Terima kasih kerana membeli-belah bersama Telekung Maryam!',
      billChargeToCustomer: '1', // customer bears the gateway fee
      billExpiryDays: '3',
    });

    const tyRes = await fetch(`${baseUrl}/index.php/api/createBill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await tyRes.json().catch(() => null);
    const billCode = Array.isArray(data) && data[0] && data[0].BillCode;

    if (!billCode) {
      console.error('ToyyibPay error:', data);
      res.status(502).json({ error: 'Gagal cipta bil pembayaran. Sila cuba lagi sebentar.' });
      return;
    }

    res.status(200).json({ url: `${baseUrl}/${billCode}`, billCode, orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ralat server. Sila cuba lagi.' });
  }
};
