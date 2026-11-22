/* =========================================================
   Photobooth Natal - logika aplikasi
   ========================================================= */

(function () {
  'use strict';

  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  const CFG_KEY = 'pb_natal_cfg_v1';
  const STATS_KEY = 'pb_natal_stats_v1';
  const SKIP_KEY = 'pb_natal_setup_skipped';
  const LOGO_KEY = 'pb_natal_logo_v1';
  const LAST_KEY = 'pb_natal_lastupload_v1';

  const DEFAULT_CFG = Object.assign({
    endpoint: '',
    token: 'NTL-7f3a9c2e',
    folderId: '1QmQuBTUXxEei_6-6a5Luqh8wBaRalFAl',
    eventName: 'Natal Sekolah Kristen Kalam Kudus Sentani 2026',
    codePrefix: 'NTL',
    autoResetMs: 30000
  }, window.PB_CONFIG || {});

  const TEMPLATES = window.PB.TEMPLATES;
  const renderTemplate = window.PB.renderTemplate;

  const state = {
    template: null,
    captures: [],
    stream: null,
    code: '',
    dataUrl: '',
    busy: false,
    audioCtx: null,
    doneTimer: null,
    idleTimer: null,
    current: 'start',
    seqId: 0
  };

  let cfg = loadCfg();

  /* =========================================================
     Konfigurasi
     ========================================================= */

  function loadCfg() {
    try {
      const raw = localStorage.getItem(CFG_KEY);
      if (!raw) return Object.assign({}, DEFAULT_CFG);
      const merged = Object.assign({}, DEFAULT_CFG, JSON.parse(raw));
      if (!merged.endpoint) merged.endpoint = DEFAULT_CFG.endpoint;
      return merged;
    } catch (e) {
      return Object.assign({}, DEFAULT_CFG);
    }
  }

  function saveCfg(patch) {
    cfg = Object.assign({}, cfg, patch);
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ }
    applyCfgToUI();
  }

  function applyCfgToUI() {
    $('#brandEvent').textContent = cfg.eventName || 'Photobooth Natal';
    const startEvent = $('#startEvent');
    if (startEvent) startEvent.textContent = cfg.eventName || '';
    document.title = 'Photobooth · ' + (cfg.eventName || 'Natal');
  }

  /* =========================================================
     Logo sekolah di halaman depan
     ========================================================= */

  function logoSource() {
    try {
      return localStorage.getItem(LOGO_KEY) || 'img/logo.png';
    } catch (e) {
      return 'img/logo.png';
    }
  }

  function applyLogo() {
    const img = $('#startLogo');
    if (!img) return;
    img.hidden = true;
    img.onload = function () { img.hidden = false; };
    img.onerror = function () { img.hidden = true; };
    img.src = logoSource();
    if (img.complete && img.naturalWidth > 0) img.hidden = false;
  }

  function shrinkImage(file, maxSize) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onerror = function () { reject(new Error('File tidak bisa dibaca')); };
      reader.onload = function () {
        const img = new Image();
        img.onerror = function () { reject(new Error('Format gambar tidak didukung')); };
        img.onload = function () {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/png'));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function folderUrl() {
    return 'https://drive.google.com/drive/folders/' + encodeURIComponent(cfg.folderId || '');
  }

  /* =========================================================
     Catatan upload terakhir (untuk panel operator)
     ========================================================= */

  function saveLastUpload(data) {
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({
        time: Date.now(),
        ok: !!data.ok,
        name: data.name || '',
        folderUrl: data.folderUrl || '',
        url: data.url || '',
        error: data.error || ''
      }));
    } catch (e) { /* ignore */ }
  }

  function showLastUpload() {
    const el = $('#opLastUpload');
    if (!el) return;
    let last = null;
    try { last = JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch (e) { last = null; }
    if (!last) {
      el.textContent = 'belum ada';
      el.className = 'op-note';
      return;
    }
    const jam = new Date(last.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (last.ok) {
      el.className = 'op-note ok';
      el.textContent = jam + ' · ' + (last.name || 'foto') + ' · berhasil';
    } else {
      el.className = 'op-note err';
      el.textContent = jam + ' · gagal: ' + (last.error || 'tidak diketahui');
    }
  }

  /* =========================================================
     Statistik sesi
     ========================================================= */

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function loadStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      const s = raw ? JSON.parse(raw) : null;
      if (!s || s.date !== today()) return { date: today(), count: 0 };
      return s;
    } catch (e) {
      return { date: today(), count: 0 };
    }
  }

  function bumpStats() {
    const s = loadStats();
    s.count += 1;
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
    return s;
  }

  function nextCode() {
    const s = loadStats();
    const prefix = (cfg.codePrefix || 'NTL').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'NTL';
    return prefix + '-' + String(s.count + 1).padStart(3, '0');
  }

  /* =========================================================
     Layar
     ========================================================= */

  const screens = {
    start: $('#screen-start'),
    templates: $('#screen-templates'),
    capture: $('#screen-capture'),
    review: $('#screen-review'),
    done: $('#screen-done')
  };

  function show(name) {
    state.current = name;
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle('active', key === name);
    });
    resetIdle();
  }

  function resetIdle() {
    clearTimeout(state.idleTimer);
    if (state.current === 'templates') {
      state.idleTimer = setTimeout(function () {
        if (state.current === 'templates') show('start');
      }, 120000);
    }
  }

  /* =========================================================
     Utilitas
     ========================================================= */

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function beep(freq, dur, vol) {
    try {
      if (!state.audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        state.audioCtx = new AC();
      }
      const ac = state.audioCtx;
      if (ac.state === 'suspended') ac.resume();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ac.destination);
      const t = ac.currentTime;
      const level = vol || 0.08;
      gain.gain.setValueAtTime(level, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (e) { /* audio opsional */ }
  }

  function toast(msg, ms) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, ms || 3200);
  }

  function flash() {
    const el = $('#flash');
    el.classList.remove('fire');
    void el.offsetWidth;
    el.classList.add('fire');
  }

  function spawnSnow() {
    const wrap = $('#snow');
    const count = 34;
    let html = '';
    for (let i = 0; i < count; i++) {
      const left = Math.random() * 100;
      const size = 8 + Math.random() * 14;
      const dur = 9 + Math.random() * 12;
      const delay = -Math.random() * 20;
      const opacity = 0.25 + Math.random() * 0.45;
      html += '<span class="flake" style="left:' + left.toFixed(2) + '%;font-size:' + size.toFixed(1) +
        'px;animation-duration:' + dur.toFixed(1) + 's;animation-delay:' + delay.toFixed(1) +
        's;opacity:' + opacity.toFixed(2) + '">❄</span>';
    }
    wrap.innerHTML = html;
  }

  /* =========================================================
     Template grid
     ========================================================= */

  function buildTemplateCard(tpl) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'template-card';
    card.setAttribute('aria-label', tpl.name + ', ' + tpl.shots + ' foto, rasio ' + (tpl.ratio || ''));

    const thumb = document.createElement('span');
    thumb.className = 'tpl-thumb';

    const canvas = document.createElement('canvas');
    const full = document.createElement('canvas');
    renderTemplate(full, tpl, [], { eventName: cfg.eventName, code: '' });

    const maxH = 236;
    const maxW = 150;
    const scale = Math.min(maxH / tpl.h, maxW / tpl.w, 1);
    canvas.width = Math.round(tpl.w * scale);
    canvas.height = Math.round(tpl.h * scale);
    canvas.getContext('2d').drawImage(full, 0, 0, canvas.width, canvas.height);

    thumb.appendChild(canvas);

    const badge = document.createElement('span');
    badge.className = 'tpl-badge';
    badge.textContent = tpl.shots + ' foto · ' + (tpl.ratio || '');

    const name = document.createElement('span');
    name.className = 'tpl-name';
    name.textContent = tpl.name;

    const desc = document.createElement('span');
    desc.className = 'tpl-desc';
    desc.textContent = tpl.desc;

    card.appendChild(thumb);
    card.appendChild(badge);
    card.appendChild(name);
    card.appendChild(desc);
    card.addEventListener('click', function () { selectTemplate(tpl); });

    return card;
  }

  function buildTemplateGrid() {
    const grid = $('#templateGrid');
    grid.innerHTML = '';

    const groups = window.PB.GROUPS || [];
    const used = [];

    groups.forEach(function (g) {
      const items = TEMPLATES.filter(function (t) { return t.group === g.id; });
      if (!items.length) return;
      used.push(g.id);

      const section = document.createElement('section');
      section.className = 'tpl-group';

      const head = document.createElement('div');
      head.className = 'tpl-group-head';
      const title = document.createElement('h3');
      title.textContent = g.label;
      const note = document.createElement('span');
      note.textContent = g.note || '';
      head.appendChild(title);
      head.appendChild(note);
      section.appendChild(head);

      const row = document.createElement('div');
      row.className = 'template-grid';
      items.forEach(function (tpl) { row.appendChild(buildTemplateCard(tpl)); });
      section.appendChild(row);

      grid.appendChild(section);
    });

    // jaga-jaga: template tanpa grup tetap tampil
    const rest = TEMPLATES.filter(function (t) { return used.indexOf(t.group) === -1; });
    if (rest.length) {
      const section = document.createElement('section');
      section.className = 'tpl-group';
      const row = document.createElement('div');
      row.className = 'template-grid';
      rest.forEach(function (tpl) { row.appendChild(buildTemplateCard(tpl)); });
      section.appendChild(row);
      grid.appendChild(section);
    }
  }

  function selectTemplate(tpl) {
    if (state.busy) return;
    state.template = tpl;
    state.captures = [];
    startSequence();
  }

  /* =========================================================
     Kamera
     ========================================================= */

  const CAM_HINTS = {
    NotAllowedError: 'Izin kamera ditolak. Klik ikon kunci atau kamera di kiri alamat halaman, pilih Kamera → Izinkan, lalu klik Coba Lagi. Setelah itu muat ulang halaman.',
    PermissionDeniedError: 'Izin kamera ditolak. Klik ikon kunci di kiri alamat halaman, pilih Kamera → Izinkan, lalu klik Coba Lagi.',
    NotFoundError: 'Tidak ada kamera yang terdeteksi. Pastikan webcam terpasang dan tidak dinonaktifkan di Device Manager Windows.',
    DevicesNotFoundError: 'Tidak ada kamera yang terdeteksi. Periksa sambungan webcam.',
    NotReadableError: 'Kamera sedang dipakai aplikasi lain. Tutup Zoom, Teams, Kamera Windows, atau tab lain yang memakai kamera, lalu klik Coba Lagi.',
    TrackStartError: 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.',
    OverconstrainedError: 'Kamera tidak mendukung resolusi yang diminta. Coba lagi, aplikasi akan memakai pengaturan standar.',
    SecurityError: 'Akses kamera diblokir browser. Pastikan halaman dibuka lewat http://localhost:8080, bukan dengan klik dua kali file index.html.',
    AbortError: 'Kamera gagal dimulai. Cabut dan pasang ulang webcam, lalu coba lagi.'
  };

  function cameraHint(err) {
    const name = (err && err.name) || '';
    const base = CAM_HINTS[name];
    if (base) return base;
    return 'Periksa izin kamera di browser dan pastikan webcam tidak dipakai aplikasi lain.';
  }

  function showCameraError(err) {
    $('#camErrorMsg').textContent = cameraHint(err);
    $('#camError').hidden = false;
  }

  function hideCameraError() {
    $('#camError').hidden = true;
  }

  async function ensureCamera() {
    if (state.stream && state.stream.active) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const e = new Error('Browser tidak mendukung kamera');
      e.name = 'SecurityError';
      throw e;
    }
    const video = $('#video');
    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
    } catch (err) {
      if (err && err.name === 'OverconstrainedError') {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } else {
        throw err;
      }
    }

    state.stream = stream;
    video.srcObject = stream;
    await video.play().catch(function () {});
    await sleep(500);
  }

  function stopCamera() {
    if (!state.stream) return;
    state.stream.getTracks().forEach(function (t) { t.stop(); });
    state.stream = null;
  }

  function grabFrame() {
    const video = $('#video');
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    // mirror supaya sama dengan tampilan di layar
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    return c;
  }

  function buildDots(total, filled) {
    const wrap = $('#shotDots');
    wrap.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('span');
      if (i < filled) dot.className = 'on';
      wrap.appendChild(dot);
    }
  }

  function countdown(from) {
    return new Promise(function (resolve) {
      let n = from;
      const el = $('#countdown');
      el.classList.add('show');

      function tick() {
        if (n === 0) {
          el.classList.remove('show', 'pop');
          el.textContent = '';
          resolve();
          return;
        }
        el.textContent = String(n);
        el.classList.remove('pop');
        void el.offsetWidth;
        el.classList.add('pop');
        beep(n === 1 ? 1040 : 720, 0.12, 0.07);
        n -= 1;
        setTimeout(tick, 1000);
      }
      tick();
    });
  }

  async function startSequence() {
    const tpl = state.template;
    if (!tpl) return;

    const seqId = ++state.seqId;
    state.busy = true;
    state.captures = [];
    show('capture');
    hideCameraError();
    buildDots(tpl.shots, 0);
    $('#camHint').textContent = 'Bersiap...';

    try {
      await ensureCamera();
    } catch (err) {
      state.busy = false;
      console.warn('Kamera gagal:', err);
      showCameraError(err);
      return;
    }

    if (seqId !== state.seqId) return;
    await sleep(800);

    for (let i = 0; i < tpl.shots; i++) {
      if (seqId !== state.seqId) return;
      $('#camHint').textContent = 'Foto ' + (i + 1) + ' dari ' + tpl.shots;
      await countdown(3);
      if (seqId !== state.seqId) return;

      state.captures.push(grabFrame());
      flash();
      beep(1300, 0.07, 0.1);
      buildDots(tpl.shots, i + 1);
      await sleep(750);
    }

    if (seqId !== state.seqId) return;

    $('#camHint').textContent = 'Menyiapkan hasil...';
    await sleep(350);

    if (seqId !== state.seqId) return;

    renderReview();
    show('review');
    state.busy = false;
  }

  function cancelSequence() {
    state.seqId += 1;
    state.busy = false;
    hideCameraError();
    $('#countdown').classList.remove('show', 'pop');
    $('#countdown').textContent = '';
  }

  /* =========================================================
     Review & simpan
     ========================================================= */

  function renderReview() {
    renderTemplate($('#previewCanvas'), state.template, state.captures, {
      eventName: cfg.eventName,
      code: ''
    });
  }

  function setDoneState(kind, detail) {
    const icon = $('#doneIcon');
    const title = $('#doneTitle');
    const msg = $('#doneMsg');

    if (kind === 'uploading') {
      icon.className = 'done-icon busy';
      icon.textContent = '↑';
      title.textContent = 'Menyimpan foto...';
      msg.textContent = 'Mohon tunggu sebentar, jangan tutup layar.';
      return;
    }
    if (kind === 'saved') {
      icon.className = 'done-icon ok';
      icon.textContent = '✓';
      title.textContent = 'Foto tersimpan di Drive!';
      msg.textContent = 'Terima kasih sudah berfoto. Silakan bergantian dengan temanmu.';
      return;
    }
    if (kind === 'queued') {
      icon.className = 'done-icon warn';
      icon.textContent = '!';
      title.textContent = 'Foto tersimpan di perangkat';
      msg.textContent = 'Foto belum terkirim ke Drive, tapi aman tersimpan di perangkat ini dan akan ' +
        'dikirim otomatis. Tunjukkan kode ini ke panitia: ' + state.code +
        (detail ? ' — penyebab: ' + detail : '');
      return;
    }
  }

  function startDoneTimer() {
    clearTimeout(state.doneTimer);
    const ms = Number(cfg.autoResetMs) || 30000;
    state.doneTimer = setTimeout(function () {
      if (state.current === 'done' && !state.busy) resetSession();
    }, ms);
  }

  async function approvePhoto() {
    if (state.busy || !state.template) return;
    state.busy = true;
    $('#btnApprove').disabled = true;

    const tpl = state.template;
    const finalCanvas = document.createElement('canvas');
    state.code = nextCode();

    renderTemplate(finalCanvas, tpl, state.captures, {
      eventName: cfg.eventName,
      code: state.code
    });

    const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.92);
    state.dataUrl = dataUrl;

    // tampilkan hasil lebih dulu
    const resultCanvas = $('#resultCanvas');
    resultCanvas.width = finalCanvas.width;
    resultCanvas.height = finalCanvas.height;
    resultCanvas.getContext('2d').drawImage(finalCanvas, 0, 0);

    $('#sessionCode').textContent = state.code;
    $('#folderLink').href = folderUrl();
    const fileLink = $('#fileLink');
    if (fileLink) {
      fileLink.hidden = true;
      fileLink.removeAttribute('href');
    }
    const qr = $('#qrImg');
    qr.hidden = true;
    qr.onload = function () { qr.hidden = false; };
    qr.onerror = function () { qr.hidden = true; };
    qr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=6&data=' + encodeURIComponent(folderUrl());

    bumpStats();
    show('done');
    setDoneState('uploading');
    clearTimeout(state.doneTimer);

    const filename = state.code + '_' + tpl.id + '.jpg';

    try {
      if (!cfg.endpoint) throw new Error('URL Web App belum diatur');
      const res = await window.Drive.upload({
        endpoint: cfg.endpoint,
        token: cfg.token,
        code: state.code,
        filename: filename,
        dataUrl: dataUrl
      });
      console.log('Tersimpan:', res);
      if (res && res.folderUrl) $('#folderLink').href = res.folderUrl;
      if (res && res.url && fileLink) {
        fileLink.href = res.url;
        fileLink.hidden = false;
      }
      saveLastUpload({
        ok: true,
        name: res && res.name,
        folderUrl: res && res.folderUrl,
        url: res && res.url
      });
      setDoneState('saved', res);
    } catch (err) {
      console.warn('Upload gagal:', err);
      const alasan = String((err && err.message) || err);
      saveLastUpload({ ok: false, name: filename, error: alasan });
      await window.Drive.queueAdd({
        code: state.code,
        filename: filename,
        dataUrl: dataUrl,
        createdAt: Date.now(),
        error: alasan
      });
      setDoneState('queued', alasan);
      toast('Gagal kirim ke Drive: ' + alasan, 8000);
    }

    state.busy = false;
    $('#btnApprove').disabled = false;
    startDoneTimer();
  }

  function resetSession() {
    clearTimeout(state.doneTimer);
    cancelSequence();
    state.template = null;
    state.captures = [];
    state.code = '';
    state.dataUrl = '';
    state.busy = false;
    $('#btnApprove').disabled = false;
    const rc = $('#resultCanvas');
    rc.getContext('2d').clearRect(0, 0, rc.width, rc.height);
    show('start');
  }

  /* =========================================================
     Setup & operator
     ========================================================= */

  function openSetup() {
    $('#inpEndpoint').value = cfg.endpoint || '';
    $('#inpToken').value = cfg.token || '';
    $('#inpFolder').value = folderUrl();
    $('#setupStatus').textContent = '';
    $('#setupStatus').className = 'status';
    $('#setupModal').classList.add('open');
  }

  function closeSetup() {
    $('#setupModal').classList.remove('open');
  }

  function readSetupInputs() {
    const folder = $('#inpFolder').value.trim();
    const match = folder.match(/folders\/([A-Za-z0-9_-]+)/);
    return {
      endpoint: $('#inpEndpoint').value.trim(),
      token: $('#inpToken').value.trim(),
      folderId: match ? match[1] : (folder || cfg.folderId)
    };
  }

  async function testEndpoint(endpoint, statusEl) {
    statusEl.className = 'status';
    statusEl.textContent = 'Menghubungi server...';
    try {
      const res = await window.Drive.ping(endpoint);
      statusEl.textContent = 'Terhubung. Server aktif sejak ' + (res.time || 'baru saja') + '.';
      return true;
    } catch (err) {
      statusEl.className = 'status err';
      statusEl.textContent = 'Gagal: ' + ((err && err.message) || err);
      return false;
    }
  }

  function openOperator() {
    $('#opEvent').value = cfg.eventName || '';
    $('#opEndpoint').value = cfg.endpoint || '';
    $('#opToken').value = cfg.token || '';
    $('#opFolder').value = cfg.folderId || '';
    $('#opSessions').textContent = String(loadStats().count);
    $('#opStatus').textContent = '';
    $('#opStatus').className = 'status';
    $('#operatorModal').classList.add('open');
    showLastUpload();
    refreshQueueCount();
  }

  function closeOperator() {
    $('#operatorModal').classList.remove('open');
  }

  async function refreshQueueCount() {
    const n = await window.Drive.queueCount();
    $('#opQueue').textContent = String(n);
    return n;
  }

  /* =========================================================
     Event wiring
     ========================================================= */

  function wireEvents() {
    $('#btnStart').addEventListener('click', function () {
      beep(880, 0.08, 0.05);
      show('templates');
    });

    $$('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.current === 'capture') cancelSequence();
        show(btn.getAttribute('data-back'));
      });
    });

    $('#btnRetake').addEventListener('click', function () {
      if (state.busy) return;
      startSequence();
    });

    $('#btnCamRetry').addEventListener('click', function () {
      hideCameraError();
      startSequence();
    });

    $('#btnApprove').addEventListener('click', approvePhoto);

    $('#btnDone').addEventListener('click', resetSession);

    $('#btnOperator').addEventListener('click', openOperator);

    // logo sekolah di halaman depan
    const logoInput = $('#opLogo');
    const pickLogo = $('#btnPickLogo');
    if (pickLogo && logoInput) {
      pickLogo.addEventListener('click', function () { logoInput.click(); });
      logoInput.addEventListener('change', async function () {
        const file = this.files && this.files[0];
        this.value = '';
        if (!file) return;
        const status = $('#opStatus');
        status.className = 'status';
        status.textContent = 'Memuat gambar...';
        try {
          const dataUrl = await shrinkImage(file, 420);
          localStorage.setItem(LOGO_KEY, dataUrl);
          applyLogo();
          status.textContent = 'Logo tersimpan di perangkat ini.';
          toast('Logo sekolah diperbarui');
        } catch (err) {
          status.className = 'status err';
          status.textContent = 'Gagal membaca gambar: ' + ((err && err.message) || err);
        }
      });
    }
    const clearLogo = $('#btnClearLogo');
    if (clearLogo) {
      clearLogo.addEventListener('click', function () {
        try { localStorage.removeItem(LOGO_KEY); } catch (e) { /* ignore */ }
        applyLogo();
        $('#opStatus').textContent = 'Logo dihapus, kembali ke gambar bawaan.';
      });
    }

    // setup
    $('#btnSaveSetup').addEventListener('click', function () {
      const v = readSetupInputs();
      if (!v.endpoint) {
        $('#setupStatus').className = 'status err';
        $('#setupStatus').textContent = 'URL Web App wajib diisi.';
        return;
      }
      if (!/\/exec(\?|$)/.test(v.endpoint)) {
        $('#setupStatus').className = 'status err';
        $('#setupStatus').textContent = 'URL harus berakhiran /exec. Kalau berakhiran /dev, ambil dari Deploy → Manage deployments.';
        return;
      }
      saveCfg(v);
      buildTemplateGrid();
      try { localStorage.removeItem(SKIP_KEY); } catch (e) { /* ignore */ }
      closeSetup();
      toast('Pengaturan disimpan');
    });

    $('#btnSkipSetup').addEventListener('click', function () {
      try { localStorage.setItem(SKIP_KEY, '1'); } catch (e) { /* ignore */ }
      closeSetup();
      toast('Mode tanpa Drive. Foto akan disimpan di perangkat sampai URL diatur.', 5000);
    });

    $('#btnTestSetup').addEventListener('click', function () {
      const v = readSetupInputs();
      testEndpoint(v.endpoint, $('#setupStatus'));
    });

    // operator
    $('#btnOpSave').addEventListener('click', function () {
      const folderInput = $('#opFolder').value.trim();
      const match = folderInput.match(/folders\/([A-Za-z0-9_-]+)/);
      saveCfg({
        eventName: $('#opEvent').value.trim() || DEFAULT_CFG.eventName,
        endpoint: $('#opEndpoint').value.trim(),
        token: $('#opToken').value.trim(),
        folderId: match ? match[1] : folderInput
      });
      buildTemplateGrid();
      $('#opStatus').textContent = 'Pengaturan disimpan.';
      toast('Pengaturan operator disimpan');
    });

    $('#btnOpClose').addEventListener('click', closeOperator);

    $('#btnRetryQueue').addEventListener('click', async function () {
      const status = $('#opStatus');
      status.className = 'status';
      status.textContent = 'Mengirim antrean...';
      const res = await window.Drive.flushQueue(cfg, function (done, total) {
        status.textContent = 'Mengirim ' + done + '/' + total + '...';
      });
      status.textContent = 'Selesai. Terkirim: ' + res.sent + ', gagal: ' + res.failed + '.';
      if (res.failed) status.className = 'status err';
      refreshQueueCount();
    });

    $('#btnResetStats').addEventListener('click', function () {
      try { localStorage.removeItem(STATS_KEY); } catch (e) { /* ignore */ }
      $('#opSessions').textContent = '0';
      toast('Penghitung sesi direset');
    });

    $('#btnTestUpload').addEventListener('click', async function () {
      const btn = this;
      const status = $('#opStatus');
      btn.disabled = true;
      status.className = 'status';
      status.textContent = 'Mengirim foto uji ke Drive...';

      const c = document.createElement('canvas');
      c.width = 900;
      c.height = 600;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 900, 600);
      g.addColorStop(0, '#6d0d18');
      g.addColorStop(1, '#0f3d2b');
      x.fillStyle = g;
      x.fillRect(0, 0, 900, 600);
      x.textAlign = 'center';
      x.fillStyle = '#e8c26a';
      x.font = 'bold 46px Georgia, serif';
      x.fillText('TES UPLOAD', 450, 268);
      x.fillStyle = '#f7e7c6';
      x.font = '20px "Trebuchet MS", sans-serif';
      x.fillText(new Date().toLocaleString('id-ID'), 450, 320);
      x.fillStyle = 'rgba(247,231,198,0.6)';
      x.font = '16px "Trebuchet MS", sans-serif';
      x.fillText('Photobooth Natal', 450, 356);

      const t0 = Date.now();
      try {
        const res = await window.Drive.upload({
          endpoint: cfg.endpoint,
          token: cfg.token,
          code: 'TES',
          filename: 'tes-upload-' + Date.now() + '.jpg',
          dataUrl: c.toDataURL('image/jpeg', 0.9)
        });
        const detik = ((Date.now() - t0) / 1000).toFixed(1);
        status.textContent = 'Berhasil dalam ' + detik + ' detik. File: ' + res.name + ' ';
        if (res.folderUrl && /^https:\/\/drive\.google\.com\//.test(res.folderUrl)) {
          const a = document.createElement('a');
          a.href = res.folderUrl;
          a.target = '_blank';
          a.rel = 'noopener';
          a.className = 'link';
          a.textContent = 'Buka folder';
          status.appendChild(a);
        }
        saveLastUpload({ ok: true, name: res.name, folderUrl: res.folderUrl, url: res.url });
        showLastUpload();
        toast('Upload ke Drive berhasil (' + detik + ' detik)');
      } catch (err) {
        const detik = ((Date.now() - t0) / 1000).toFixed(1);
        const alasan = String((err && err.message) || err);
        status.className = 'status err';
        status.textContent = 'Gagal setelah ' + detik + ' detik: ' + alasan;
        saveLastUpload({ ok: false, name: 'foto uji', error: alasan });
        showLastUpload();
      } finally {
        btn.disabled = false;
      }
    });

    $('#btnTestCam').addEventListener('click', async function () {
      const status = $('#opStatus');
      status.className = 'status';
      status.textContent = 'Membuka kamera...';
      try {
        await ensureCamera();
        const v = $('#video');
        status.textContent = 'Kamera aktif: ' + v.videoWidth + '×' + v.videoHeight + ' px';
      } catch (err) {
        status.className = 'status err';
        status.textContent = 'Kamera gagal: ' + cameraHint(err);
      }
    });

    // klik luar modal menutup
    $$('.modal').forEach(function (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal && modal.id !== 'setupModal') {
          modal.classList.remove('open');
        }
      });
    });

    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (state.current === 'templates') show('start');
        else if (state.current === 'review') startSequence();
      }
      // shortcut operator: Ctrl+Shift+O
      if (e.ctrlKey && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        openOperator();
      }
    });

    window.addEventListener('online', function () {
      toast('Koneksi kembali. Mengirim foto yang tertunda...');
      window.Drive.flushQueue(cfg).then(function (res) {
        if (res.sent) toast(res.sent + ' foto berhasil dikirim ke Drive');
      });
    });
  }

  /* =========================================================
     Init
     ========================================================= */

  function init() {
    applyCfgToUI();
    applyLogo();
    buildTemplateGrid();
    wireEvents();
    spawnSnow();
    show('start');

    if (!cfg.endpoint) {
      let skipped = false;
      try { skipped = !!localStorage.getItem(SKIP_KEY); } catch (e) { /* ignore */ }
      if (!skipped) setTimeout(openSetup, 400);
    } else {
      window.Drive.flushQueue(cfg).then(function (res) {
        if (res.sent) toast(res.sent + ' foto tertunda berhasil dikirim');
      });

      // coba kirim ulang antrean tiap 60 detik selama halaman terbuka
      setInterval(function () {
        if (!navigator.onLine) return;
        window.Drive.flushQueue(cfg).then(function (res) {
          if (res.sent) toast(res.sent + ' foto tertunda berhasil dikirim');
        });
      }, 60000);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
