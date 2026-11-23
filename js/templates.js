/* Bingkai Natal digambar di canvas agar tetap berfungsi offline. */
(function () {
  'use strict';

  const GROUPS = [
    { id: 'strip', label: 'Strip Photobooth', note: 'Cetak klasik, 3–4 foto berurutan' },
    { id: 'story', label: 'Story & Reels', note: 'Potret 9:16 · pilih 1, 3, atau 6 foto' },
    { id: 'besar', label: 'Bingkai Besar', note: 'Satu foto · persegi atau landscape' }
  ];
  const palettes = {
    berry: ['#d22c69', '#451759', '#ffabd0'],
    mint: ['#07897e', '#103759', '#99ffe1'],
    violet: ['#734bd5', '#282258', '#d2baff'],
    blue: ['#227eb5', '#192756', '#9ceaff']
  };
  const slot = (x, y, w, h, r = 22) => ({ x, y, w, h, r });
  const story = (id, name, palette, slots) => ({
    id, name, palette, slots, group: 'story', ratio: '9:16', w: 1080, h: 1920,
    desc: `${slots.length} foto · 1080 × 1920`, title: [540, 214, 780, 65], tree: [915, 220, 152]
  });
  const TEMPLATES = [
    { id: 'strip3', name: 'Strip Klasik', desc: '3 foto · Nuansa permen Natal', group: 'strip', ratio: '1:3',
      w: 600, h: 1800, scale: 1.8, palette: 'berry', title: [270, 1635, 440, 38], tree: [522, 1695, 94],
      slots: [0, 1, 2].map(i => slot(32, 72 + i * 504, 536, 477, 15)) },
    { id: 'strip4', name: 'Strip Empat', desc: '4 foto · Nuansa mint', group: 'strip', ratio: '1:3',
      w: 600, h: 1800, scale: 1.8, palette: 'mint', title: [270, 1672, 440, 35], tree: [522, 1720, 86],
      slots: [0, 1, 2, 3].map(i => slot(32, 58 + i * 392, 536, 372, 15)) },
    story('story1', 'Story Tunggal', 'berry', [slot(70, 430, 940, 1110, 32)]),
    story('story3', 'Story Kolase 3 Foto', 'violet', [slot(70, 425, 940, 628), slot(70, 1081, 455, 475), slot(555, 1081, 455, 475)]),
    story('story6', 'Story Kolase 6 Foto', 'blue', Array.from({ length: 6 }, (_, i) => slot(70 + (i % 2) * 483, 420 + Math.floor(i / 2) * 405, 457, 379))),
    { id: 'landscape', name: 'Bingkai Lebar', desc: '1 foto + panel ucapan', group: 'besar', ratio: '3:2',
      w: 1920, h: 1280, palette: 'mint', title: [1530, 522, 620, 63], tree: [1530, 880, 310],
      slots: [slot(58, 60, 1100, 1160, 36)] },
    { id: 'landscapeOverlay', name: 'Landscape Teks Timbul', desc: '1 foto penuh · 1920 × 1280', group: 'besar', ratio: '3:2',
      w: 1920, h: 1280, palette: 'violet', title: [960, 1004, 1380, 83], tree: [1710, 1070, 220], embossed: true,
      slots: [slot(28, 28, 1864, 1224, 38)] },
    { id: 'square', name: 'Persegi', desc: '1 foto · 1440 × 1440', group: 'besar', ratio: '1:1',
      w: 1080, h: 1080, scale: 4 / 3, palette: 'berry', title: [510, 876, 825, 52], tree: [952, 944, 166],
      slots: [slot(66, 65, 948, 747, 25)] }
  ].map(tpl => ({ ...tpl, shots: tpl.slots.length }));

  function rounded(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function dot(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function star(ctx, x, y, r, color, points = 5) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = i * Math.PI / points - Math.PI / 2;
      const d = i % 2 ? r * 0.32 : r;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function christmasTree(ctx, x, y, height) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(height / 100, height / 100);
    ctx.fillStyle = '#f4a776';
    ctx.fillRect(-7, 28, 14, 13);
    const tiers = [[-18, 32, 36, '#09a983'], [-31, 17, 27, '#46d4a0'], [-43, 2, 19, '#8cf4bd']];
    tiers.forEach(([top, bottom, half, color]) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(half, bottom - 5);
      ctx.quadraticCurveTo(half + 3, bottom, half - 3, bottom);
      ctx.lineTo(-half + 3, bottom);
      ctx.quadraticCurveTo(-half - 3, bottom, -half, bottom - 5);
      ctx.closePath();
      ctx.fill();
    });
    [[-12, 3, '#ff709d'], [14, 12, '#fff2a8'], [-19, 24, '#b9f5ff'], [4, 25, '#ff93b5'], [3, -12, '#fff2a8']]
      .forEach(([px, py, color]) => dot(ctx, px, py, 3.1, color));
    dot(ctx, 0, -43, 15, 'rgba(255,229,117,0.22)');
    star(ctx, 0, -43, 13, '#ffe583');
    star(ctx, -35, -25, 6, '#fff4bd', 4);
    star(ctx, 39, -12, 7, '#fff4bd', 4);
    ctx.restore();
  }

  function drawBackground(ctx, tpl, colors) {
    const g = ctx.createLinearGradient(0, 0, tpl.w, tpl.h);
    g.addColorStop(0, colors[0]);
    g.addColorStop(1, colors[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tpl.w, tpl.h);
    const [x, y, h] = tpl.tree;
    const glow = ctx.createRadialGradient(x, y - h * 0.43, 0, x, y - h * 0.43, h * 2.3);
    glow.addColorStop(0, 'rgba(255,225,128,0.29)');
    glow.addColorStop(1, 'rgba(255,225,128,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, tpl.w, tpl.h);
    // Deterministic light trail: the exported image never changes between renders.
    for (let i = 0; i < 82; i++) {
      const px = 20 + ((i * 149) % (tpl.w - 40));
      const py = 20 + ((i * 223) % (tpl.h - 40));
      if (i % 5 === 0) star(ctx, px, py, 7 + i % 9, i % 2 ? colors[2] : '#ffe798', 4);
      else dot(ctx, px, py, 2 + i % 4, 'rgba(255,255,255,0.38)');
    }
  }

  function drawSlot(ctx, s, img, accent, index) {
    ctx.save();
    rounded(ctx, s.x, s.y, s.w, s.h, s.r);
    ctx.clip();
    if (img) {
      const iw = img.videoWidth || img.width;
      const ih = img.videoHeight || img.height;
      const scale = Math.max(s.w / iw, s.h / ih);
      const sw = s.w / scale, sh = s.h / scale;
      ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, s.x, s.y, s.w, s.h);
    } else {
      ctx.fillStyle = 'rgba(23,17,63,0.58)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(Math.min(s.w, s.h) * 0.09)}px "Trebuchet MS", sans-serif`;
      ctx.fillStyle = accent;
      ctx.fillText(`FOTO ${index + 1}`, s.x + s.w / 2, s.y + s.h / 2);
    }
    ctx.restore();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    rounded(ctx, s.x, s.y, s.w, s.h, s.r);
    ctx.stroke();
  }

  function drawTitle(ctx, tpl, accent) {
    const [x, y, maxWidth, size] = tpl.title;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const lines = [
      ['Merry Christmas', 0, 1, '#fff5dc'],
      ['SKKK Sentani.', 0.87, 0.73, accent],
      ['Theme: "Follow the Light"', 1.64, 0.57, '#ffe583'],
      ['(Math.2:2 & John.8:12)', 2.23, 0.44, '#ffffff']
    ];
    lines.forEach(([text, offset, factor, color]) => {
      const py = y + offset * size;
      ctx.font = `800 ${Math.round(size * factor)}px "Trebuchet MS", sans-serif`;
      if (tpl.embossed) {
        ctx.strokeStyle = '#281632';
        ctx.lineWidth = Math.max(3, size * factor * 0.12);
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, py + size * 0.07, maxWidth);
        ctx.fillStyle = '#623938';
        ctx.fillText(text, x, py + size * 0.065, maxWidth);
        ctx.fillStyle = '#fffef0';
        ctx.fillText(text, x, py - size * 0.022, maxWidth);
      }
      ctx.fillStyle = color;
      ctx.fillText(text, x, py, maxWidth);
    });
    ctx.restore();
  }

  function renderTemplate(canvas, tpl, photos, meta, scaleOverride) {
    const scale = Number(scaleOverride) > 0 ? Number(scaleOverride) : (tpl.scale || 1);
    canvas.width = Math.round(tpl.w * scale);
    canvas.height = Math.round(tpl.h * scale);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const colors = palettes[tpl.palette];
    drawBackground(ctx, tpl, colors);
    tpl.slots.forEach((s, i) => drawSlot(ctx, s, photos && photos[i], colors[2], i));
    if (tpl.embossed) {
      const s = tpl.slots[0];
      ctx.save();
      rounded(ctx, s.x, s.y, s.w, s.h, s.r);
      ctx.clip();
      const shade = ctx.createLinearGradient(0, 810, 0, 1252);
      shade.addColorStop(0, 'rgba(25,12,43,0)');
      shade.addColorStop(1, 'rgba(25,12,43,0.86)');
      ctx.fillStyle = shade;
      ctx.fillRect(s.x, 810, s.w, 442);
      ctx.restore();
    } else {
      ctx.strokeStyle = colors[2];
      ctx.lineWidth = 2;
      rounded(ctx, 14, 14, tpl.w - 28, tpl.h - 28, 18);
      ctx.stroke();
    }
    christmasTree(ctx, ...tpl.tree);
    drawTitle(ctx, tpl, colors[2]);
    return canvas;
  }

  window.PB = window.PB || {};
  Object.assign(window.PB, { GROUPS, TEMPLATES, renderTemplate });
})();
