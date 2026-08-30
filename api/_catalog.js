// Server-side source of truth for prices, in sen (RM1 = 100 sen).
// Keep this in sync with the product cards in index.html.
// NEVER trust a price sent from the browser — always recompute the total
// here on the server before creating a bill.
module.exports = {
  'Telekung Sakinah (Soft Rose)': { priceSen: 23900 },
  'Telekung Hawa Travel': { priceSen: 19900 },
  'Telekung Deluxe Lace': { priceSen: 30900 },
  'Telekung Basic Ivory': { priceSen: 15900 },
};
