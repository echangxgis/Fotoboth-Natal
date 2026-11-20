/* =========================================================
   Photobooth Natal - pengiriman ke Google Drive
   Endpoint: Google Apps Script Web App (lihat apps-script/Code.gs)
   ========================================================= */

(function () {
  'use strict';

  const DB_NAME = 'pb_natal_db';
  const DB_VERSION = 1;
  const STORE = 'queue';
  const TIMEOUT_MS = 60000;

  /* ---------------- IndexedDB (antrean offline) ---------------- */

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) {
        reject(new Error('Browser tidak mendukung IndexedDB'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function tx(mode) {
    return openDB().then(function (db) {
      return db.transaction(STORE, mode).objectStore(STORE);
    });
  }

  function queueAdd(item) {
    return tx('readwrite').then(function (store) {
      return new Promise(function (resolve, reject) {
        const req = store.add(item);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function (err) {
      console.warn('Gagal menambah antrean', err);
      return null;
    });
  }

  function queueAll() {
    return tx('readonly').then(function (store) {
      return new Promise(function (resolve, reject) {
        const req = store.getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () { return []; });
  }

  function queueDelete(id) {
    return tx('readwrite').then(function (store) {
      return new Promise(function (resolve) {
        const req = store.delete(id);
        req.onsuccess = function () { resolve(true); };
        req.onerror = function () { resolve(false); };
      });
    }).catch(function () { return false; });
  }

  function queueCount() {
    return tx('readonly').then(function (store) {
      return new Promise(function (resolve) {
        const req = store.count();
        req.onsuccess = function () { resolve(req.result || 0); };
        req.onerror = function () { resolve(0); };
      });
    }).catch(function () { return 0; });
  }

  /* ---------------- HTTP ---------------- */

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      const t = setTimeout(function () {
        reject(new Error('Koneksi terlalu lama (timeout ' + Math.round(ms / 1000) + ' detik)'));
      }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); },
                   function (e) { clearTimeout(t); reject(e); });
    });
  }

  /**
   * Kirim satu foto ke Apps Script.
   * @returns {Promise<{ok:boolean, url?:string, id?:string, name?:string}>}
   */
  function upload(opts) {
    const endpoint = String(opts.endpoint || '').trim();
    if (!endpoint) return Promise.reject(new Error('URL Web App belum diatur'));

    const base64 = String(opts.dataUrl || '').split(',')[1] || '';
    if (!base64) return Promise.reject(new Error('Data foto kosong'));

    const payload = {
      token: opts.token || '',
      code: opts.code || '',
      filename: opts.filename || ('foto_' + Date.now() + '.jpg'),
      mimeType: 'image/jpeg',
      data: base64
    };

    const request = fetch(endpoint, {
      method: 'POST',
      // text/plain menghindari preflight CORS yang tidak didukung Apps Script
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    }).then(function (res) {
      return res.text().then(function (text) {
        let data = null;
        try { data = JSON.parse(text); } catch (e) { /* bukan JSON */ }

        if (!data) {
          throw new Error('Respon tidak dikenali. Pastikan Web App di-deploy dengan akses "Anyone".');
        }
        if (!data.ok) {
          throw new Error(data.error || 'Upload ditolak server');
        }
        return data;
      });
    }).catch(function (err) {
      if (err && err.name === 'TypeError') {
        throw new Error('Tidak bisa menghubungi Apps Script (CORS/izin deploy). Cek akses "Anyone".');
      }
      throw err;
    });

    return withTimeout(request, TIMEOUT_MS);
  }

  function ping(endpoint) {
    const url = String(endpoint || '').trim();
    if (!url) return Promise.reject(new Error('URL Web App belum diatur'));
    const sep = url.indexOf('?') === -1 ? '?' : '&';

    return withTimeout(
      fetch(url + sep + 'ping=1&t=' + Date.now(), { method: 'GET', cache: 'no-store' })
        .then(function (res) { return res.text(); })
        .then(function (text) {
          let data = null;
          try { data = JSON.parse(text); } catch (e) { /* ignore */ }
          if (!data || !data.ok) {
            throw new Error('Respon tidak valid. Cek akses deploy "Anyone".');
          }
          return data;
        })
        .catch(function (err) {
          if (err && err.name === 'TypeError') {
            throw new Error('Gagal terhubung. Pastikan URL berakhiran /exec dan akses "Anyone".');
          }
          throw err;
        }),
      20000
    );
  }

  /* ---------------- antrean ---------------- */

  async function flushQueue(cfg, onProgress) {
    if (!navigator.onLine) return { sent: 0, failed: 0, total: 0 };
    const items = await queueAll();
    let sent = 0, failed = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        await upload({
          endpoint: cfg.endpoint,
          token: cfg.token,
          code: item.code,
          filename: item.filename,
          dataUrl: item.dataUrl
        });
        await queueDelete(item.id);
        sent++;
      } catch (err) {
        failed++;
        console.warn('Kirim ulang gagal', item.code, err);
      }
      if (typeof onProgress === 'function') onProgress(i + 1, items.length);
    }
    return { sent: sent, failed: failed, total: items.length };
  }

  window.Drive = {
    upload: upload,
    ping: ping,
    queueAdd: queueAdd,
    queueAll: queueAll,
    queueDelete: queueDelete,
    queueCount: queueCount,
    flushQueue: flushQueue
  };
})();
