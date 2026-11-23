# Photobooth Natal — Panduan Pasang

Aplikasi photobooth untuk **Natal Sekolah Kristen Kalam Kudus Sentani 2026**. Anak memilih bingkai, berfoto, menyetujui hasil, lalu foto otomatis masuk ke folder Google Drive Anda.

**Tanpa biaya.** Hanya butuh akun Google yang sudah Anda siapkan dan satu laptop.

---

## URL Web App Itu Seperti Apa?

URL ini **belum ada** sebelum Anda membuatnya. Anda yang membuatnya di Google Apps Script, dan Google yang memberikan alamatnya.

Bentuknya selalu seperti ini:

```
https://script.google.com/macros/s/AKfycbxQ8r2mNpLk3vT9wYzA1bC4dE6fG8hJ0kL2mN4/exec
                                        └──────────── ID acak dari Google ────────────┘
```

Ciri-cirinya:

| Bagian | Keterangan |
|---|---|
| `script.google.com/macros/s/` | selalu sama |
| `AKfycb...` | ID acak, beda untuk setiap project, panjang ±50 karakter |
| `/exec` | **wajib**. Ini tanda deployment produksi |

Yang **bukan** URL yang benar:

| Contoh | Kenapa salah |
|---|---|
| `https://script.google.com/home/projects/...` | itu link editor, bukan endpoint |
| `https://script.google.com/macros/s/AKfy.../dev` | `/dev` hanya untuk testing pemilik |
| `https://docs.google.com/...` | itu link Drive, bukan endpoint |

Cara mendapatkannya ada di Langkah 5 di bawah. Kalau Anda sudah punya URL-nya, tempel ke jendela **Pengaturan Awal** di aplikasi, lalu klik **Tes Koneksi**.

---

## Isi Folder

```
photobooth-natal/
├─ index.html          aplikasi utama
├─ css/style.css
├─ img/logo.png        logo sekolah (opsional, lihat bagian Logo)
├─ js/config.js        URL Apps Script & nama acara (sudah terisi)
├─ js/templates.js     mesin bingkai (digambar dengan canvas)
├─ js/drive.js         pengiriman ke Google Drive
├─ js/app.js           alur aplikasi
├─ apps-script/Code.gs endpoint Google Drive
├─ serve.ps1           server lokal untuk laptop
├─ tes-koneksi.ps1     tes URL tanpa membuka aplikasi
├─ deploy.ps1          deploy ke Vercel
├─ vercel.json         pengaturan hosting
└─ PANDUAN.md          file ini
```

---

## Bagian 1 — Menyiapkan Google Drive (sekali saja, ±10 menit)

### Langkah 1: Pastikan folder tujuan

Folder yang Anda kirim:
`https://drive.google.com/drive/folders/1QmQuBTUXxEei_6-6a5Luqh8wBaRalFAl`

Login dengan akun Google **pemilik folder tersebut**. ID folder sudah tertanam di `apps-script/Code.gs`, jadi tidak perlu diubah.

### Langkah 2: Buka Google Apps Script

1. Buka <https://script.google.com>
2. Klik **New project** (Project baru)
3. Ganti nama project menjadi `Photobooth Natal`

### Langkah 3: Tempel kode

1. Hapus semua isi file `Code.gs` di editor
2. Buka `apps-script/Code.gs` dari folder ini
3. Salin seluruh isinya, tempel ke editor
4. Cari baris:

```js
var TOKEN = 'NTL-7f3a9c2e';
```

5. Ganti dengan kata rahasia Anda sendiri, contoh:

```js
var TOKEN = 'natal-sd-mawar-2026';
```

Catat token ini, nanti dimasukkan ke aplikasi.

6. Tekan **Ctrl+S** untuk menyimpan

### Langkah 4: Tes dari editor

1. Di editor, pilih fungsi `testTulis` pada dropdown di atas
2. Klik **Run**
3. Google akan minta izin. Klik **Review permissions** → pilih akun → **Advanced** → **Go to Photobooth Natal (unsafe)** → **Allow**

   Ini normal. Peringatan muncul karena skrip buatan sendiri belum diverifikasi Google.

4. Buka folder Drive Anda. Harusnya muncul file `tes-photobooth.txt`

Kalau file itu muncul, berarti skrip sudah bisa menulis ke folder.

### Langkah 5: Deploy sebagai Web App

1. Klik **Deploy** → **New deployment**
2. Klik ikon gerigi di sebelah "Select type" → pilih **Web app**
3. Isi:

   | Kolom | Nilai |
   |---|---|
   | Description | `Photobooth Natal v1` |
   | Execute as | **Me (email Anda)** |
   | Who has access | **Anyone** |

   **"Anyone" wajib.** Kalau dipilih "Anyone with Google account", aplikasi tidak bisa mengirim foto tanpa login.

4. Klik **Deploy**
5. Salin **Web app URL**, bentuknya:

   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

   Pastikan berakhiran `/exec`, bukan `/dev`.

### Langkah 6: Tes endpoint di browser

Tempel URL tersebut di tab baru, tambahkan `?ping=1` di belakangnya:

```
https://script.google.com/macros/s/AKfycbx.../exec?ping=1
```

Harus muncul tulisan seperti:

```json
{"ok":true,"service":"photobooth-natal","folderId":"1Qm...","time":"2026-11-20T..."}
```

Kalau muncul halaman login Google, berarti akses deploy belum "Anyone". Ulangi langkah 5.

### Langkah 7: Tes dari laptop (opsional, tapi disarankan)

Setelah punya URL, Anda bisa mengujinya tanpa membuka aplikasi:

```powershell
.\tes-koneksi.ps1 -Url "https://script.google.com/macros/s/AKfy.../exec"
```

Skrip ini akan:

1. Menghubungi server (ping)
2. Mengirim satu gambar uji ke folder Drive
3. Menampilkan link file yang berhasil dibuat

Kalau muncul tulisan **OK** dan file `tes-koneksi.jpg` ada di Drive, berarti semuanya sudah benar. Hapus file itu setelah selesai.

Kalau gagal, pesan errornya akan menunjukkan penyebabnya (token salah, akses bukan "Anyone", atau URL salah).

### Memperbarui Apps Script (kalau kode berubah)

Fitur video memakai `Code.gs` versi baru. Kalau project Apps Script Anda masih versi lama, foto tetap masuk, tetapi video belum dipisah ke folder `Video`.

1. Buka <https://script.google.com> dan buka project `Photobooth Natal`
2. Di editor, pilih semua isi `Code.gs` (**Ctrl+A**), hapus
3. Tempel seluruh isi `apps-script/Code.gs` yang terbaru
4. Tekan **Ctrl+S**
5. Klik **Deploy** → **Manage deployments**
6. Klik ikon pensil pada deployment yang aktif
7. Pada **Version**, pilih **New version**
8. Klik **Deploy**

**Jangan** membuat deployment baru. Memperbarui deployment yang sama menjaga URL `/exec` tetap sama, jadi aplikasi tidak perlu diubah.

Setelah itu buka `...?ping=1` untuk memastikan server masih hidup, lalu tes lewat **Panel Operator → Kirim foto uji**.

Folder `Gambar` dan `Video` dibuat otomatis saat file pertama masuk. Tidak perlu membuatnya manual.


---

## Bagian 2 — Menjalankan di Laptop (±2 menit)

### Langkah 1: Jalankan server lokal

Buka PowerShell di folder `photobooth-natal`, lalu:

```powershell
.\serve.ps1
```

Kalau muncul error "running scripts is disabled", jalankan sekali:

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Browser akan terbuka otomatis di `http://localhost:8080/`.

> Kenapa perlu server? Browser hanya mengizinkan akses kamera pada `localhost` atau `https`. Membuka `index.html` langsung dengan klik dua kali bisa membuat kamera diblokir.

### Langkah 2: Isi pengaturan

Saat pertama dibuka, muncul jendela **Pengaturan Awal**:

| Kolom | Isi |
|---|---|
| URL Web App | tempel URL `/exec` dari langkah 5 |
| Token | sama dengan `TOKEN` di Code.gs |
| Link folder Drive | sudah terisi otomatis, biarkan |

Klik **Tes Koneksi**. Kalau muncul "Terhubung", klik **Simpan**.

### Langkah 3: Tes satu foto

1. Klik **Mulai Foto**
2. Pilih bingkai
3. Berpose, tunggu hitungan 3-2-1
4. Klik **Setuju & Simpan**
5. Tunggu tulisan **"Foto tersimpan di Drive!"**
6. Buka folder Drive, cek apakah foto muncul di subfolder tanggal hari ini

Kalau berhasil, semuanya siap.

---

## Bagian 3 — Deploy ke Vercel (opsional)

Lakukan ini kalau Anda ingin aplikasi bisa dibuka dari HP siswa atau dari lebih dari satu laptop.

### Kapan sebaiknya pakai Vercel

| Situasi | Pilihan |
|---|---|
| Satu laptop stand, wifi tidak pasti | Server lokal (`serve.ps1`) |
| Mau dibuka dari HP siswa | Vercel |
| Dua stand sekaligus | Vercel |

Vercel hanya menyajikan tampilan. Penyimpanan foto tetap lewat Apps Script.

### Cara deploy

Buka PowerShell di folder ini:

```powershell
.\deploy.ps1
```

Pertama kali akan diminta:

| Pertanyaan | Jawab |
|---|---|
| Set up and deploy? | **Y** |
| Which scope? | akun Anda |
| Link to existing project? | **N** |
| Project name? | `photobooth-natal` |
| Directory? | `./` |
| Framework preset | **Other** |
| Build command | kosongkan |
| Output directory | `./` |

Login lewat browser saat diminta. Gratis, tanpa kartu kredit.

Setelah selesai, Anda mendapat URL seperti:

```
https://photobooth-natal.vercel.app
```

Untuk deploy ulang setelah ada perubahan:

```powershell
.\deploy.ps1
```

Untuk tes di URL preview (tidak mengganggu yang produksi):

```powershell
.\deploy.ps1 -Preview
```

### URL Apps Script sudah tertanam

Karena URL dan token sudah diisi di `js/config.js`, jendela **Pengaturan Awal** tidak akan muncul lagi. Semua perangkat langsung bisa dipakai.

Kalau suatu saat URL berubah, edit `js/config.js` lalu deploy ulang.

### Yang perlu diingat

- **Butuh internet.** Kalau wifi sekolah mati, halaman tidak bisa dibuka sama sekali. Server lokal tidak punya masalah ini.
- **Link bersifat publik.** Siapa pun yang tahu alamatnya bisa mengirim file ke folder Drive Anda. Jangan sebar link-nya.
- File `.ps1` dan `.md` tidak ikut terunggah karena sudah dikecualikan di `.vercelignore`.

---

## Bagian 4 — Persiapan Hari-H

### Setel mode kios

Buka Chrome dengan pintasan khusus supaya layar penuh dan tidak bisa diutak-atik:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --kiosk http://localhost:8080/ `
  --autoplay-policy=no-user-gesture-required `
  --disable-pinch
```

Simpan sebagai file `jalankan-kiosk.bat` di Desktop:

```bat
@echo off
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk http://localhost:8080/ --autoplay-policy=no-user-gesture-required
```

### Checklist 30 menit sebelum acara

- [ ] Laptop dicas penuh, adaptor terpasang
- [ ] `serve.ps1` sudah jalan
- [ ] **Tes Koneksi** di panel operator berhasil
- [ ] Tes 1 foto, cek hasilnya di Drive
- [ ] Fitur video sudah diatur (nyala/mati) dan folder `Video` sudah dicek
- [ ] Lampu sudah dinyalakan dan diarahkan ke wajah
- [ ] Background sudah dipasang
- [ ] Notifikasi Windows dimatikan (Mode Fokus)
- [ ] Taskbar disembunyikan
- [ ] Kecerahan layar maksimal
- [ ] Wifi sekolah tersambung dan stabil

### Panel operator

Klik ikon ⚙ di kanan atas, atau tekan **Ctrl+Shift+O**.

Isinya:

- Ubah nama acara, URL, token, folder
- **Rekam video singkat tiap sesi**: hidupkan atau matikan perekaman video
- **Tes kamera** untuk memastikan resolusi
- **Antrean belum terkirim**: jumlah foto dan video yang gagal dikirim
- **Kirim ulang**: mengirim ulang semua foto dan video di antrean
- **Sesi tersimpan**: jumlah foto hari ini

---

## Cara Kerja di Balik Layar

```
Anak pilih bingkai
      ↓
Kamera ambil 1–4 foto (sesuai bingkai)
      ↓
Canvas menggabungkan foto + dekorasi + kode sesi
      ↓
JPEG dikirim ke Apps Script (POST)  →  folder Gambar
      ↓
Video singkat ikut dikirim (kalau fitur video aktif)  →  folder Video
      ↓
Apps Script menyimpan ke folder Drive
      ↓
Aplikasi menampilkan kode + QR menuju folder
```

Kalau internet mati, foto dan video **tetap tersimpan di perangkat** (IndexedDB) dan otomatis dikirim saat koneksi kembali. Tidak ada yang hilang.

### Penamaan file

Foto:

```
NTL-001_strip3.jpg
NTL-002_square.jpg
```

Video singkat:

```
NTL-001_strip3.webm
NTL-002_square.webm
```

Foto dan video dipisah ke folder masing-masing, lalu dipecah lagi per tanggal:

```
Fotoboth/
├─ Gambar/
│  └─ 2026-12-15/
│     ├─ NTL-001_strip3.jpg
│     └─ NTL-002_square.jpg
└─ Video/
   └─ 2026-12-15/
      ├─ NTL-001_strip3.webm
      └─ NTL-002_square.webm
```

Kode `NTL-001` dipakai untuk foto dan videonya, jadi mudah dicocokkan.

---

## Video Singkat Sesi Foto

Selain foto, aplikasi bisa merekam video pendek **selama anak berpose**. Videonya tanpa suara, dimulai saat hitungan mundur dan berhenti setelah foto terakhir.

### Menyalakan atau mematikan

1. Klik ikon **⚙** di kanan atas (atau **Ctrl+Shift+O**)
2. Cari baris **Rekam video singkat tiap sesi**
3. Centang untuk menyalakan, kosongkan untuk mematikan
4. Klik **Simpan**

Pengaturan ini tersimpan di perangkat itu saja. Kalau memakai beberapa laptop, atur di masing-masing.

### Batas dan ukuran

| Hal | Nilai |
|---|---|
| Panjang maksimal | 25 detik |
| Resolusi | Mengikuti kamera (biasanya 1280×960) |
| Ukuran file | ±2–5 MB per sesi |
| Suara | Tidak direkam |

Kalau anak terlalu lama di layar periksa, rekaman sudah berhenti lebih dulu — jadi videonya tetap singkat.

### Kalau video gagal dikirim

Video masuk antrean yang sama dengan foto. Layar hasil menulis **"Video belum terkirim, akan dikirim otomatis nanti."** Tidak perlu panik: video aman di perangkat dan dikirim otomatis saat koneksi membaik, atau lewat **Panel Operator → Kirim ulang**.

### Syarat

- **Chrome atau Edge versi baru.** Firefox dan Safari biasanya juga bisa, tapi formatnya kadang berbeda.
- **Code.gs terbaru harus sudah di-deploy.** Versi lama belum mengenal folder `Gambar` dan `Video`. Lihat bagian **Memperbarui Apps Script** di bawah.

---

## Bingkai yang Tersedia

Layar **Pilih Bingkai** dibagi menjadi tiga kelompok.

### Strip Photobooth

| Bingkai | Ukuran | Jumlah foto |
|---|---|---|
| Strip Klasik | 600×1800 (2:3) | 3 |
| Strip Empat | 600×1800 (2:3) | 4 |

### Story & Reels

| Bingkai | Ukuran | Jumlah foto |
|---|---|---|
| Story Tunggal | 1080×1920 (9:16) | 1 |
| Story Kolase | 1080×1920 (9:16) | 3 |

Ukuran 9:16 pas untuk Instagram Story, Reels cover, WhatsApp Status, dan TikTok.
Teks penting sengaja diletakkan di area aman, jadi tidak tertutup tombol Instagram.

### Bingkai Besar

| Bingkai | Ukuran | Jumlah foto |
|---|---|---|
| Bingkai Lebar | 1800×1200 (3:2, 4R landscape) | 1 |
| Persegi | 1080×1080 (1:1) | 1 |

Semua bingkai digambar langsung dengan kode, jadi tidak ada file gambar yang bisa hilang. Untuk menambah atau mengubah bingkai, edit `js/templates.js`.

---

## Logo Sekolah di Halaman Depan

Ada dua cara memasang logo.

### Cara 1 — lewat Panel Operator (paling cepat)

1. Klik ikon **⚙** di kanan atas
2. Pada baris **Logo sekolah di halaman depan**, klik **Pilih gambar**
3. Pilih file logo (PNG/JPG). Logo langsung muncul di halaman depan.
4. Logo tersimpan di browser perangkat itu. Klik **Hapus** untuk membatalkannya.

Cocok kalau logo hanya dipakai di satu laptop.

### Cara 2 — lewat file (untuk Vercel dan semua perangkat)

1. Simpan logo sebagai `img/logo.png` di folder aplikasi
2. Deploy ulang (`.\deploy.ps1` atau `git push`)

Logo akan muncul otomatis di semua perangkat, tanpa perlu diatur satu per satu.
Kalau `img/logo.png` tidak ada, halaman depan tetap jalan tanpa logo.

> Gunakan PNG dengan latar transparan supaya menyatu dengan latar merah gelap.
> Ukuran 300–500 px sudah cukup.

---

## Masalah yang Sering Muncul

| Gejala | Penyebab | Solusi |
|---|---|---|
| Kamera tidak muncul | Dibuka lewat `file://` | Jalankan `serve.ps1`, akses `http://localhost:8080` |
| "Tidak bisa menghubungi Apps Script" | Deploy bukan "Anyone" | Ulangi deploy, pilih **Anyone** |
| "Token tidak cocok" | Token di aplikasi beda dengan Code.gs | Samakan keduanya |
| Foto masuk tapi tidak bisa dibuka guru | Izin file | Biarkan `MAKE_FILE_PUBLIC = true` di Code.gs |
| "Foto tersimpan di perangkat" | Upload gagal / koneksi lambat | Foto tetap aman. Cek **Panel Operator → Kirim ulang**, atau tunggu 60 detik (dikirim otomatis) |
| Upload terasa lama | Foto besar + wifi lambat | Aplikasi mencoba ulang otomatis. Kalau tetap gagal, gunakan wifi yang lebih kuat |
| Foto tidak kelihatan di Drive | Foto masuk ke subfolder tanggal | Buka folder **Fotoboth → Gambar → 2026-11-22** (sesuai tanggal acara) |
| Video tidak ada di Drive | Code.gs lama belum mendukung folder video | Tempel ulang `Code.gs` terbaru lalu **Manage deployments → New version** |
| Nama video berakhiran `.webm.jpg` | Code.gs lama menambahkan `.jpg` ke semua file | Sama: perbarui `Code.gs` dan deploy versi baru |
| Video tidak direkam | Fitur video dimatikan, atau browser tidak mendukung | Panel Operator → centang **Rekam video singkat tiap sesi**, pakai Chrome/Edge terbaru |
| Mau tahu penyebab upload gagal | — | **Panel Operator → Kirim foto uji**. Pesan hasilnya menyebut penyebab persisnya |
| Layar hitam di kamera | Kamera dipakai aplikasi lain | Tutup Zoom/Teams, lalu muat ulang |
| Foto blur | Kurang cahaya | Tambah lampu, jangan andalkan lampu ruangan |
| Antrean menumpuk | Internet lambat | Panel operator → **Kirim ulang** setelah acara |

---

## Setelah Acara

1. Buka folder Drive, pastikan semua foto sudah masuk
2. Ganti izin folder dari **"Anyone with the link"** menjadi **"Restricted"**
3. Bagikan ke guru lewat akun sekolah saja
4. Hapus file `tes-photobooth.txt` kalau masih ada
5. Simpan salinan folder ke hard disk sekolah sebagai arsip

### Catatan privasi

Foto wajah anak adalah data pribadi. Sebelum acara:

- Minta izin orang tua lewat surat atau grup kelas
- Jangan unggah ke media sosial sekolah tanpa izin tertulis
- Setelah dokumentasi selesai, batasi akses folder
- Jangan biarkan tautan folder tersebar di grup umum

---

## Biaya

| Layanan | Biaya |
|---|---|
| Google Apps Script | Gratis |
| Google Drive (15 GB) | Gratis |
| Aplikasi photobooth | Gratis |
| Hosting | Tidak perlu (jalan di laptop) |

Foto 4R sekitar 400–800 KB. Untuk 300 sesi, totalnya sekitar 200–400 MB. Jauh di bawah kuota 15 GB.
