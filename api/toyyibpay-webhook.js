// POST /api/toyyibpay-webhook
// ToyyibPay calls this URL (the "billCallbackUrl" set in api/checkout.js)
// whenever a bill's payment status changes.
//
// IMPORTANT: unlike some gateways, ToyyibPay's callback payload is NOT
// cryptographically signed — anyone could POST fake data to this URL. So
// instead of trusting the posted "status" field directly, we call
// ToyyibPay's own getBillTransactions API (authenticated with our secret
// key) to independently confirm what actually happened before treating an
// order as paid.
//
// TODO before going live: replace the console.log below with a real write
// to an order database (Vercel KV, Supabase, Airtable, etc.) so paid
// orders are actually recorded somewhere and fulfilment can pick them up.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { billcode, order_id } = req.body || {};
  const secretKey = process.env.TOYYIBPAY_SECRET_KEY;
  const baseUrl = process.env.TOYYIBPAY_BASE_URL || 'https://dev.toyyibpay.com';

  if (!billcode) {
    res.status(400).end();
    return;
  }
  if (!secretKey) {
    console.error('TOYYIBPAY_SECRET_KEY not set');
    res.status(500).end();
    return;
  }

  try {
    const verifyRes = await fetch(`${baseUrl}/index.php/api/getBillTransactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ billCode: billcode, userSecretKey: secretKey }).toString(),
    });
    const transactions = await verifyRes.json().catch(() => null);
    const latest = Array.isArray(transactions) ? transactions[transactions.length - 1] : null;

    if (!latest) {
      console.warn(`No confirmed transaction yet for bill ${billcode} (order ${order_id})`);
      res.status(200).end(); // ack so ToyyibPay doesn't keep retrying
      return;
    }

    // billpaymentStatus: '1' = success, '2' = pending, '3' = fail, '4' = amount mismatch
    const paid = latest.billpaymentStatus === '1';
    console.log(
      `ToyyibPay bill ${billcode} (order ${order_id}): status=${latest.billpaymentStatus} paid=${paid} amount=${latest.billpaymentAmount}`
    );

    // TODO: look up the order by order_id / billcode and mark it paid here.

    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
};
