# Panduan AZKOI Hub (step by step)

Panduan ini untuk pemula — ikuti urut dari atas. Total waktu ±20 menit, cukup sekali.

Yang kamu butuhkan:
- Laptop/PC dengan browser (Chrome / Safari) dan login GitHub (akun **dradjamulya**).
- File **`azkoi-data-backup.json`** (dikirim lewat chat Claude — simpan baik-baik, isinya data order & keuangan kamu).
- HP / iPad.

---

## Bagian 1 — Gabungkan kode ke `main` (merge Pull Request)

1. Buka **https://github.com/dradjamulya/azkoi-management/pulls**
2. Klik Pull Request berjudul **"AZKOI Hub: orders, brew plan, finance, price lab"**.
3. Scroll ke bawah, klik tombol hijau **Merge pull request** → lalu **Confirm merge**.
4. Selesai. Kode website sekarang ada di branch `main`.

## Bagian 2 — Online-kan website (GitHub Pages)

1. Buka **https://github.com/dradjamulya/azkoi-management/settings/pages**
   (atau: di halaman repo klik **Settings** → menu kiri **Pages**).
2. Di bagian **Build and deployment** → **Source**, pilih **GitHub Actions**.
   (Kalau tadinya "Deploy from a branch", ganti ke **GitHub Actions**.)
3. Buka tab **Actions**: **https://github.com/dradjamulya/azkoi-management/actions**
   - Klik workflow **Deploy to GitHub Pages** di kiri.
   - Kalau belum ada yang jalan, klik **Run workflow** → **Run workflow** (tombol hijau).
   - Tunggu ±1–2 menit sampai ada centang hijau ✅.
4. Website kamu sekarang ada di:
   **https://dradjamulya.github.io/azkoi-management/**

> Kalau muncul ❌ merah: buka lagi Settings → Pages, pastikan Source = **GitHub Actions**, lalu ulangi Run workflow.

## Bagian 3 — Masukkan data lama kamu (sekali saja)

Data order & keuangan dari AZKOI.xlsx **tidak** ditaruh di kode (karena repo kamu public, semua orang bisa lihat). Jadi kita masukkan lewat file backup:

1. Di laptop, buka **https://dradjamulya.github.io/azkoi-management/**
2. Klik **Settings** (menu kiri) → scroll ke **Backup** → **Restore backup**.
3. Pilih file **`azkoi-data-backup.json`** → klik **OK**.
4. Buka **Home** — harusnya muncul "Left to break even Rp940.122". 🎉

## Bagian 4 — Sync HP, iPad, laptop (Supabase, gratis)

Tanpa ini, data hanya tersimpan di browser masing-masing device. Dengan ini semua device datanya sama.

### 4a. Bikin akun & project
1. Buka **https://supabase.com** → **Start your project** → daftar pakai akun GitHub (paling gampang).
2. Klik **New project**:
   - **Name**: `azkoi`
   - **Database Password**: klik *Generate a password* (tidak perlu diingat untuk app ini)
   - **Region**: **Southeast Asia (Singapore)**
   - Klik **Create new project**, tunggu ±1 menit.

### 4b. Bikin tabel
1. Di menu kiri Supabase klik **SQL Editor** (ikon `>_`).
2. Di AZKOI Hub: **Settings → Sync → "How to set it up"** → klik **Copy SQL**.
3. Paste di SQL Editor Supabase → klik **Run** (kanan bawah). Harus muncul **"Success. No rows returned"**.

### 4c. Ambil 2 kunci
1. Di Supabase klik **Project Settings** (ikon gerigi) → **API** (atau **Data API**).
2. Copy **Project URL** (contoh `https://abcd1234.supabase.co`).
3. Copy kunci **anon public** (tulisan panjang mulai `eyJ...`). ❗ Jangan pakai yang `service_role`.

### 4d. Sambungkan di laptop (device pertama)
1. AZKOI Hub → **Settings → Sync**:
   - **Supabase project URL** → paste Project URL
   - **Anon public key** → paste anon key
   - **Workspace code** → klik **Generate**
2. Klik **Upload this device**. Muncul "Uploaded — sync is on". ✅
3. **Catat 3 isian itu** (URL, key, workspace code) di Notes HP — nanti dipakai di HP & iPad. Workspace code ini seperti password: jangan dibagikan.

### 4e. Sambungkan di HP & iPad
1. Buka **https://dradjamulya.github.io/azkoi-management/** di Safari / Chrome.
2. Menu bawah **More → Settings → Sync** → isi 3 isian yang sama.
3. Klik **Pull from cloud** → **OK**.
4. Selesai — mulai sekarang semua perubahan otomatis tersinkron (sync waktu kamu buka/edit).

> ⚠️ Di device baru selalu pakai **Pull from cloud**, jangan "Upload this device" (itu akan menimpa data di cloud).

## Bagian 5 — Pasang seperti aplikasi di HP / iPad

- **iPhone / iPad (Safari)**: buka website → tombol **Share** (kotak dengan panah ke atas) → **Add to Home Screen** → **Add**.
- **Android (Chrome)**: buka website → titik tiga ⋮ → **Add to Home screen / Install app**.

Ikon AZKOI muncul di home screen dan terbuka layar penuh seperti app.

---

## Cara pakai sehari-hari

| Mau apa | Caranya |
|---|---|
| **Catat order baru** | Tombol **+** (HP: tombol cokelat kanan bawah). Isi nama, WA, tanggal ambil, produk & qty. Teman/diskon → tap chip **Promo / teman · Rp19.000**. |
| **Tahu besok bikin berapa** | **Brew** → **Tomorrow**: jumlah botol per produk + total bahan (gram). Tombol **Copy** untuk kirim ke WA/Notes. |
| **Update status order** | **Orders**: tap panah → di kartu, atau tahan lalu geser kartu ke kolom lain. Tap **Belum bayar/Lunas** untuk ubah status bayar. |
| **Kirim konfirmasi ke pembeli** | Buka order → tombol **WhatsApp** (pesan sudah terisi otomatis). Template pesan bisa diubah di Settings. |
| **Catat belanja bahan baku** | **Finance → + Expense** → isi item & harga → di "Restock an ingredient?" pilih bahannya & jumlah gram/pcs. Stok bertambah, HPP ikut harga terbaru. |
| **Cek stok** | **Menu & HPP → Ingredients & stock**: isi stok sekarang & "Warn at". Kalau di bawah batas, muncul **Stok menipis** di Home. |
| **Coba produk baru (misal 100 ml)** | **Price Lab → Price simulator**: pilih ukuran, botol, sticker, harga → lihat HPP & margin → **Save as product**. |
| **Bikin campaign / promo** | **Price Lab → Campaigns → New campaign**: produk, tanggal, harga promo, budget. Selama periode itu harga promo muncul di form order. |
| **Ubah harga jual / tambah harga promo** | **Menu & HPP → Products & prices**. |
| **Backup** | **Settings → Download backup** (sebulan sekali disarankan). |

## Kalau ada masalah

- **Data di HP beda dengan laptop** → pastikan Sync sudah diisi di kedua device. Tutup lalu buka lagi website-nya (sync jalan saat dibuka).
- **Muncul "Sync error"** → cek lagi URL & anon key (tidak boleh ada spasi), dan SQL di langkah 4b sudah di-Run.
- **Website belum update setelah ada perubahan kode** → tunggu Actions selesai (centang hijau), lalu refresh browser.
- **Data hilang di satu device** → Settings → Pull from cloud, atau Restore backup.
