// Server-side source of truth for the product catalog, read live from
// products.json committed in this repo. Fetched via GitHub's public raw
// content URL -- reading a public repo's file needs no credentials, so
// checkout keeps working even before GITHUB_TOKEN (used only by the write
// endpoints in api/admin/) is configured. This is the same file admin.html
// writes to and script.js renders on the storefront. checkout.js
// recomputes the order total against this; never trust a price the
// browser sends.

const REPO = process.env.GITHUB_REPO || 'Dynoz769/TelekungMaryam';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

async function getCatalog() {
  const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/products.json`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return {};
  const products = await res.json().catch(() => []);
  const catalog = {};
  for (const p of products) {
    catalog[p.name] = { priceSen: Math.round(Number(p.price) * 100) };
  }
  return catalog;
}

module.exports = { getCatalog };
