// POST /api/billplz-webhook
// Billplz calls this URL (the "callback_url" set in api/checkout.js) whenever
// a bill's payment state changes. Always verify x_signature before trusting
// the payload — anyone can POST fake data to this URL otherwise.
//
// TODO before going live: replace the console.log below with a real write
// to an order database (Vercel KV, Supabase, Airtable, etc.) so paid orders
// are actually recorded somewhere and stock/fulfilment can pick them up.

const crypto = require('crypto');

// Field order fixed by Billplz's callback signature spec — do not reorder.
const SIGNATURE_FIELD_ORDER = [
  'id', 'collection_id', 'paid', 'state', 'amount', 'paid_amount',
  'due_at', 'email', 'mobile', 'name', 'url', 'paid_at',
];

function isValidSignature(params, signatureKey) {
  const sourceString = SIGNATURE_FIELD_ORDER
    .filter((key) => params[key] !== undefined)
    .map((key) => `${key}${params[key]}`)
    .join('|');

  const expected = crypto.createHmac('sha256', signatureKey).update(sourceString).digest('hex');
  const received = String(params.x_signature || '');

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const signatureKey = process.env.BILLPLZ_X_SIGNATURE_KEY;
  if (!signatureKey) {
    console.error('BILLPLZ_X_SIGNATURE_KEY not set');
    res.status(500).end();
    return;
  }

  const params = req.body || {};

  if (!isValidSignature(params, signatureKey)) {
    console.warn('Invalid Billplz webhook signature for bill', params.id);
    res.status(400).end();
    return;
  }

  const paid = params.paid === 'true' || params.paid === true;
  console.log(`Billplz bill ${params.id}: paid=${paid} amount=${params.amount} name=${params.name}`);

  // TODO: look up the order by params.id and mark it paid/failed here.

  res.status(200).end();
};
