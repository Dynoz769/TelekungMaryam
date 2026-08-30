# Setup Payment (ToyyibPay + Vercel)

Panduan ini untuk sambungkan checkout di `telekungmaryam.com.my` kepada
pembayaran sebenar (FPX, kad kredit/debit) melalui **ToyyibPay**. Laman
utama kekal di GitHub Pages — kita cuma tambah satu "backend kecil"
(serverless function) di **Vercel** khusus untuk proses pembayaran, sebab
GitHub Pages tak boleh jalankan kod server.

Fail berkaitan dalam repo ni:
- `api/checkout.js` — cipta "bill" ToyyibPay apabila pelanggan klik Checkout
- `api/toyyibpay-webhook.js` — terima notifikasi dari ToyyibPay bila bil dibayar, sahkan semula dengan API `getBillTransactions` sebelum dipercayai
- `api/_catalog.js` — senarai harga sebenar (server sahkan harga, bukan browser)
- `.env.example` — senarai environment variable yang diperlukan

## 1. Daftar akaun ToyyibPay

1. Pergi ke [dev.toyyibpay.com](https://dev.toyyibpay.com) dan daftar akaun **dev/sandbox** dulu untuk testing (percuma, tak perlu banyak dokumen, transaksi tak real).
2. Bila dah sedia nak terima bayaran sebenar, daftar/log masuk pula di [toyyibpay.com](https://toyyibpay.com) (akaun production — perlukan pengesahan bank/akaun untuk payout sebenar).
3. Dalam dashboard, pergi **Profile** (atau halaman "Get Started") — salin **User Secret Key**.
4. Pergi **Category** → cipta satu category (contoh "Telekung Maryam Orders") → salin **Category Code**.

## 2. Deploy folder `api/` ke Vercel

1. Pergi [vercel.com](https://vercel.com), log masuk guna akaun GitHub.
2. **New Project** → pilih repo `Dynoz769/TelekungMaryam` (atau guna project sedia ada kalau dah connect).
3. Vercel akan detect folder `api/` secara automatik sebagai serverless functions — tak perlu ubah build setting.
4. Buka **Settings → Environment Variables** dan tambah (nilai dari Langkah 1):

   | Nama | Nilai |
   |---|---|
   | `TOYYIBPAY_SECRET_KEY` | User Secret Key dari ToyyibPay |
   | `TOYYIBPAY_CATEGORY_CODE` | Category Code dari ToyyibPay |
   | `TOYYIBPAY_BASE_URL` | `https://dev.toyyibpay.com` (testing) |
   | `SITE_URL` | `https://telekungmaryam.com.my` |
   | `ALLOWED_ORIGIN` | `https://telekungmaryam.com.my` |

5. **Deploy** (atau **Redeploy** kalau project dah wujud, supaya env var baharu diambil kira). Vercel bagi URL macam `https://telekung-maryam.vercel.app`.

## 3. Sambungkan laman ke API

1. Buka `script.js`, cari baris:
   ```js
   const API_BASE = '';
   ```
2. Tukar kepada URL Vercel dari Langkah 2:
   ```js
   const API_BASE = 'https://telekung-maryam.vercel.app';
   ```
3. Commit & push perubahan ni ke `main` — GitHub Pages akan auto-update laman utama.

## 4. Uji dalam mod dev/sandbox

1. Pastikan `TOYYIBPAY_BASE_URL` di Vercel masih `https://dev.toyyibpay.com`.
2. Buka laman, tambah produk ke troli, isi nama, telefon & e-mel, klik **Checkout & Bayar**.
3. Anda akan dibawa ke halaman bayar ToyyibPay (dev — tiada bayaran sebenar).
4. Selepas "bayar", anda patut redirect balik ke laman dengan mesej "Terima kasih!".

## 5. Bila dah sedia untuk bayaran sebenar

1. Pastikan akaun production ToyyibPay anda dah lengkap (akaun bank untuk payout, dsb.).
2. Di Vercel, tukar `TOYYIBPAY_BASE_URL` kepada `https://toyyibpay.com`, dan gunakan Secret Key/Category Code dari akaun **production** (bukan dev — set kunci berlainan).
3. Redeploy project di Vercel supaya env var baharu berkuat kuasa.

## ⚠️ Perkara penting sebelum go-live sebenar

- **Callback ToyyibPay tidak ditandatangani secara kriptografi** (tak macam sesetengah gateway lain) — sesiapa boleh cuba POST data palsu ke `api/toyyibpay-webhook.js`. Sebab itu handler ni **panggil balik API `getBillTransactions`** ToyyibPay untuk sahkan status sebenar sebelum dipercayai — jangan buang langkah ni.
- **Belum ada database order.** Webhook sekarang cuma `console.log` bila bil disahkan dibayar — ia **tidak** simpan rekod pesanan di mana-mana. Sebelum jual sebenar, tambah storan (contoh: [Vercel KV](https://vercel.com/docs/storage/vercel-kv), [Supabase](https://supabase.com), atau Google Sheets API) supaya anda boleh jejak siapa dah bayar dan proses penghantaran.
- **Harga disahkan di server** (`api/_catalog.js`) — kalau tambah produk baharu di `index.html`, ingat kemas kini fail ni juga, kalau tidak checkout produk baharu akan gagal.
- **Jangan letak Secret Key terus dalam `script.js`** — kekal guna environment variable di Vercel sahaja.
