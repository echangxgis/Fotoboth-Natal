/**
 * =========================================================
 *  PHOTOBOOTH NATAL — Endpoint upload ke Google Drive
 * =========================================================
 *
 *  Cara pakai singkat:
 *  1. Buka https://script.google.com  →  New project
 *  2. Hapus isi Code.gs, tempel seluruh file ini
 *  3. Ganti TOKEN di bawah dengan kata rahasia Anda
 *  4. Deploy  →  New deployment  →  Web app
 *       Execute as        : Me
 *       Who has access    : Anyone
 *  5. Salin URL yang berakhiran /exec ke aplikasi photobooth
 *
 *  Panduan lengkap ada di PANDUAN.md
 * =========================================================
 */

/** ID folder Drive tujuan (diambil dari link folder yang dibagikan). */
var ROOT_FOLDER_ID = '1QmQuBTUXxEei_6-6a5Luqh8wBaRalFAl';

/** Harus sama dengan Token yang diisi di aplikasi photobooth. */
var TOKEN = 'NTL-7f3a9c2e';

/** Buat subfolder per tanggal di dalam folder utama. */
var SUBFOLDER_PER_DAY = true;

/** Jadikan file bisa dilihat siapa saja yang punya link (untuk dibagikan ke guru). */
var MAKE_FILE_PUBLIC = true;

/** Batas ukuran base64 (karakter). 12 MB cukup untuk foto 4R kualitas tinggi. */
var MAX_BASE64_LENGTH = 12 * 1024 * 1024;

/** Zona waktu untuk penamaan folder. */
var TIMEZONE = 'Asia/Jakarta';


/* =========================================================
   Handler HTTP
   ========================================================= */

function doGet(e) {
  return json({
    ok: true,
    service: 'photobooth-natal',
    folderId: ROOT_FOLDER_ID,
    time: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Body kosong');
    }

    var body = JSON.parse(e.postData.contents);

    if (body.token !== TOKEN) {
      throw new Error('Token tidak cocok');
    }
    if (!body.data) {
      throw new Error('Data foto kosong');
    }
    if (body.data.length > MAX_BASE64_LENGTH) {
      throw new Error('Foto terlalu besar');
    }

    var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var target = SUBFOLDER_PER_DAY ? getOrCreateFolder(root, dayStamp()) : root;

    var code = sanitize(body.code || 'FOTO');
    var filename = sanitize(body.filename || (code + '_' + Date.now() + '.jpg'));
    if (!/\.jpe?g$/i.test(filename)) filename += '.jpg';

    var blob = Utilities.newBlob(
      Utilities.base64Decode(body.data),
      body.mimeType || 'image/jpeg',
      filename
    );

    var file = target.createFile(blob);

    if (MAKE_FILE_PUBLIC) {
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        // Folder sekolah kadang membatasi sharing. Upload tetap dianggap sukses.
        Logger.log('Gagal set sharing: ' + shareErr);
      }
    }

    return json({
      ok: true,
      id: file.getId(),
      name: filename,
      url: file.getUrl(),
      folderUrl: target.getUrl()
    });

  } catch (err) {
    return json({
      ok: false,
      error: String((err && err.message) ? err.message : err)
    });
  }
}


/* =========================================================
   Utilitas
   ========================================================= */

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function dayStamp() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

function getOrCreateFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function sanitize(value) {
  return String(value)
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}


/* =========================================================
   Alat bantu (jalankan manual dari editor kalau perlu)
   ========================================================= */

/**
 * Tes cepat: membuat satu file teks di folder tujuan.
 * Jalankan fungsi ini dari editor, lalu cek folder Drive.
 */
function testTulis() {
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var file = root.createFile(Utilities.newBlob('Tes photobooth ' + new Date(), 'text/plain', 'tes-photobooth.txt'));
  Logger.log('Berhasil: ' + file.getUrl());
}

/**
 * Cek isi folder tujuan.
 */
function testBaca() {
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  Logger.log('Nama folder: ' + root.getName());
  Logger.log('Jumlah file di root: ' + root.getFiles().getFiles().length);
}

/**
 * Hapus subfolder yang lebih lama dari N hari.
 * Jalankan manual di akhir acara. Ubah HARI sesuai kebutuhan.
 */
function hapusFolderLama() {
  var HARI = 30;
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var batas = new Date(Date.now() - HARI * 24 * 60 * 60 * 1000);
  var folders = root.getFolders();

  while (folders.hasNext()) {
    var f = folders.next();
    if (f.getDateCreated() < batas) {
      Logger.log('Hapus: ' + f.getName());
      f.setTrashed(true);
    }
  }
}
