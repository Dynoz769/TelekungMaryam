# Setup Panel Admin (tukar harga & gambar produk)

`admin.html` bagi awak urus produk (tambah, buang, tukar nama/harga/gambar)
terus dari pelayar — tanpa perlu edit kod. Setiap perubahan disimpan sebagai
satu **commit sebenar** ke repo GitHub (fail `products.json` dan gambar
dalam `images/`), jadi ada sejarah penuh dan boleh undo dari GitHub bila-bila
masa.

Fail berkaitan:
- `admin.html` — panel admin (dilindungi password)
- `api/admin/login.js` — sahkan password, keluarkan token sesi
- `api/admin/products.js` — tambah/kemas kini/padam produk
- `api/admin/upload-image.js` — muat naik gambar produk sebagai fail sebenar
- `api/_github.js`, `api/_auth.js` — helper dalaman
- `products.json` — data produk sebenar (dibaca oleh laman & checkout)

## 1. Cipta GitHub Personal Access Token

Token ni bagi kuasa kepada API untuk commit perubahan (harga/gambar) ke
repo bagi pihak awak.

1. Pergi https://github.com/settings/personal-access-tokens/new
2. **Token name**: apa-apa (contoh "telekung-admin")
3. **Repository access**: pilih **Only select repositories** → pilih `Dynoz769/TelekungMaryam` sahaja (elak bagi akses kepada repo lain)
4. **Permissions → Repository permissions → Contents**: pilih **Read and write**
5. **Generate token** → salin token tu (bermula `github_pat_...`)

## 2. Pilih password admin & session secret

- **ADMIN_PASSWORD**: password pilihan awak untuk log masuk panel admin (pilih yang kuat — ini kunci kepada akses tulis ke repo awak).
- **ADMIN_SESSION_SECRET**: rentetan rawak untuk sahkan sesi log masuk. Boleh jana dengan:
  ```
  openssl rand -hex 32
  ```
  (atau apa-apa rentetan panjang & rawak)

## 3. Set Environment Variables di Vercel

Di project `telekung-maryam` → **Settings → Environment Variables**, tambah:

| Nama | Nilai |
|---|---|
| `GITHUB_TOKEN` | Token dari Langkah 1 |
| `GITHUB_REPO` | `Dynoz769/TelekungMaryam` |
| `GITHUB_BRANCH` | `main` |
| `ADMIN_PASSWORD` | Password pilihan awak |
| `ADMIN_SESSION_SECRET` | Rentetan rawak dari Langkah 2 |
| `ALLOWED_ORIGIN` | (pastikan dah ada, sama macam PAYMENT_SETUP.md) |

**Redeploy** projek supaya env vars baharu berkuat kuasa.

## 4. Akses panel admin

Pergi `https://<domain-laman-anda>/admin.html` (contoh: `https://dynoz769.github.io/TelekungMaryam/admin.html`, atau `https://telekungmaryam.com.my/admin.html` bila DNS dah siap).

Log masuk dengan `ADMIN_PASSWORD` yang awak set tadi. Sesi log masuk sah selama 12 jam.

## Cara guna

- **Tukar harga/gambar produk sedia ada**: kemas kini medan yang berkenaan pada produk tu → klik **Simpan**. Laman utama akan papar perubahan dalam beberapa saat (lepas GitHub Pages rebuild).
- **Tambah produk baharu**: isi borang "Tambah Produk Baharu" di bawah, muat naik gambar (opsyenal), klik **Tambah Produk**.
- **Padam produk**: klik **Padam** pada produk berkenaan (akan diminta pengesahan).

## ⚠️ Perkara penting

- **`admin.html` boleh dilihat sesiapa** (ia laman statik biasa) — tapi tanpa password yang betul, mereka tak boleh buat apa-apa perubahan (server sentiasa sahkan password/token sebelum terima sebarang tulisan).
- **Jangan kongsi `ADMIN_PASSWORD` atau `GITHUB_TOKEN`** — token tu ada akses tulis ke repo awak.
- Setiap perubahan = satu commit git. Kalau tersilap (contoh: padam produk salah), pergi ke halaman **Commits** repo GitHub untuk lihat sejarah & revert kalau perlu.
- Gambar yang dimuat naik disimpan terus dalam repo (folder `images/`) — hadkan saiz fail (maksimum 4MB setiap gambar) untuk elak repo jadi terlalu besar dari masa ke masa.
