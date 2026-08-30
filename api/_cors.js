// Shared CORS handling for the admin endpoints -- same allow-list pattern
// as api/checkout.js: ALLOWED_ORIGIN is a comma-separated list so both the
// storefront's custom domain and its default GitHub Pages URL can call
// these APIs (useful while a custom domain's DNS isn't live yet).

function applyCors(req, res, methods) {
  const allowList = (process.env.ALLOWED_ORIGIN || '*').split(',').map((o) => o.trim());
  const requestOrigin = req.headers.origin;
  const allowedOrigin = allowList.includes('*')
    ? '*'
    : allowList.includes(requestOrigin)
      ? requestOrigin
      : allowList[0];

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = { applyCors };
