# Setup Payment (Billplz + Vercel)

Panduan ini untuk sambungkan checkout di `telekungmaryam.com.my` kepada
pembayaran sebenar (FPX, DuitNow, kad) melalui **Billplz**. Laman utama
kekal di GitHub Pages — kita cuma tambah satu "backend kecil" (serverless
function) di **Vercel** khusus untuk proses pembayaran, sebab GitHub Pages
tak boleh jalankan kod server.

Fail berkaitan dalam repo ni:
- `api/checkout.js` — cipta "bill" Billplz apabila pelanggan klik Checkout
- `api/billplz-webhook.js` — terima notifikasi rasmi dari Billplz bila bil dibayar
- `api/_catalog.js` — senarai harga sebenar (server sahkan harga, bukan browser)
- `.env.example` — senarai environment variable yang diperlukan

## 1. Daftar akaun Billplz

1. Pergi ke [billplz-sandbox.com](https://www.billplz-sandbox.com) dan daftar akaun **sandbox** dulu untuk testing (percuma, tak perlu dokumen bisnes, transaksi tak real).
2. Bila dah sedia nak terima bayaran sebenar, daftar pula akaun production di [billplz.com](https://www.billplz.com) — ini perlukan pengesahan bisnes (SSM dsb).
3. Dalam dashboard Billplz, pergi **Settings > API Keys** — salin **Secret Key**.
4. Pergi **Settings** juga untuk salin **X Signature Key** (untuk sahkan webhook betul-betul dari Billplz).
5. Pergi **Collections**, cipta satu collection (contoh: "Telekung Maryam Orders"), salin **Collection ID**.

## 2. Deploy folder `api/` ke Vercel

1. Pergi [vercel.com](https://vercel.com), log masuk guna akaun GitHub.
2. **New Project** → pilih repo `Dynoz769/TelekungMaryam`.
3. Vercel akan detect folder `api/` secara automatik sebagai serverless functions — tak perlu ubah apa-apa build setting.
4. Sebelum klik Deploy, buka **Environment Variables** dan tambah (nilai dari Langkah 1):

   | Nama | Nilai |
   |---|---|
   | `BILLPLZ_API_KEY` | Secret Key dari Billplz |
   | `BILLPLZ_COLLECTION_ID` | Collection ID dari Billplz |
   | `BILLPLZ_X_SIGNATURE_KEY` | X Signature Key dari Billplz |
   | `BILLPLZ_BASE_URL` | `https://www.billplz-sandbox.com` (testing) |
   | `SITE_URL` | `https://telekungmaryam.com.my` |
   | `ALLOWED_ORIGIN` | `https://telekungmaryam.com.my` |

5. Klik **Deploy**. Selepas siap, Vercel bagi URL macam `https://telekung-maryam-api.vercel.app`.

## 3. Sambungkan laman ke API

1. Buka `script.js`, cari baris:
   ```js
   const API_BASE = '';
   ```
2. Tukar kepada URL Vercel dari Langkah 2:
   ```js
   const API_BASE = 'https://telekung-maryam-api.vercel.app';
   ```
3. Commit & push perubahan ni ke GitHub — GitHub Pages akan auto-update laman utama.

## 4. Uji dalam mod sandbox

1. Pastikan `BILLPLZ_BASE_URL` di Vercel masih `https://www.billplz-sandbox.com`.
2. Buka laman, tambah produk ke troli, isi nama & telefon, klik **Checkout & Bayar**.
3. Anda akan dibawa ke halaman bayar Billplz (sandbox — tiada bayaran sebenar). Billplz sandbox ada kad ujian untuk simulasi berjaya/gagal (rujuk dokumentasi Billplz sandbox).
4. Selepas "bayar", anda patut redirect balik ke laman dengan mesej "Terima kasih!".

## 5. Bila dah sedia untuk bayaran sebenar

1. Pastikan akaun production Billplz anda dah disahkan.
2. Di Vercel, tukar `BILLPLZ_BASE_URL` kepada `https://www.billplz.com`, dan gunakan API Key/Collection ID/X Signature Key dari akaun **production** (bukan sandbox — ini set kunci berlainan).
3. Redeploy project di Vercel supaya env var baharu berkuat kuasa.

## ⚠️ Perkara penting sebelum go-live sebenar

- **Belum ada database order.** `api/billplz-webhook.js` sekarang cuma `console.log` bila bil dibayar — ia **tidak** simpan rekod pesanan di mana-mana. Sebelum jual sebenar, tambah storan (contoh: [Vercel KV](https://vercel.com/docs/storage/vercel-kv), [Supabase](https://supabase.com), atau Google Sheets API) supaya anda boleh jejak siapa dah bayar dan proses penghantaran.
- **Harga disahkan di server** (`api/_catalog.js`) — kalau tambah produk baharu di `index.html`, ingat kemas kini fail ni juga, kalau tidak checkout produk baharu akan gagal.
- **Jangan letak API key terus dalam `script.js`** — kekal guna environment variable di Vercel sahaja.
