/* =========================================================
   Photobooth Natal - template engine
   Setiap template digambar dengan canvas, jadi tidak butuh
   file gambar eksternal (aman saat offline).
   ========================================================= */

(function () {
  'use strict';

  /* ---------------- helpers ---------------- */

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r || 0, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function drawPhoto(ctx, img, x, y, w, h, r) {
    if (!img) return;
    ctx.save();
    roundRect(ctx, x, y, w, h, r || 0);
    ctx.clip();

    const iw = img.width || img.videoWidth;
    const ih = img.height || img.videoHeight;
    const imgRatio = iw / ih;
    const slotRatio = w / h;

    let sw, sh, sx, sy;
    if (imgRatio > slotRatio) {
      sh = ih;
      sw = sh * slotRatio;
      sx = (iw - sw) / 2;
      sy = 0;
    } else {
      sw = iw;
      sh = sw / slotRatio;
      sx = 0;
      sy = (ih - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  }

  function placeholder(ctx, s) {
    ctx.save();
    roundRect(ctx, s.x, s.y, s.w, s.h, s.r || 0);
    ctx.clip();
    const g = ctx.createLinearGradient(s.x, s.y, s.x + s.w, s.y + s.h);
    g.addColorStop(0, 'rgba(255,255,255,0.10)');
    g.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = g;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(232,194,106,0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    roundRect(ctx, s.x + 1, s.y + 1, s.w - 2, s.h - 2, s.r || 0);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(232,194,106,0.35)';
    ctx.font = '600 ' + Math.round(Math.min(s.w, s.h) * 0.09) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FOTO', s.x + s.w / 2, s.y + s.h / 2);
    ctx.restore();
  }

  function snowflake(ctx, cx, cy, r, color, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(1.5, r * 0.11);
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -r);
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(-r * 0.3, -r * 0.82);
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(r * 0.3, -r * 0.82);
      ctx.stroke();
    }
    ctx.restore();
  }

  function star(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.44;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function spacedText(ctx, text, x, y, spacing) {
    if (ctx.letterSpacing !== undefined) {
      ctx.letterSpacing = spacing + 'px';
      ctx.fillText(text, x, y);
      ctx.letterSpacing = '0px';
      return;
    }
    // fallback manual
    const chars = String(text).split('');
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = x - total / 2;
    const align = ctx.textAlign;
    ctx.textAlign = 'left';
    chars.forEach((c, i) => {
      ctx.fillText(c, cx, y);
      cx += widths[i] + spacing;
    });
    ctx.textAlign = align;
  }

  /* ---------------- template definitions ---------------- */

  /**
   * Kelompok bingkai di layar "Pilih Bingkai".
   * Urutan array ini menentukan urutan tampil.
   */
  const GROUPS = [
    { id: 'strip', label: 'Strip Photobooth', note: 'Cetak klasik, 3–4 foto berurutan' },
    { id: 'story', label: 'Story & Reels', note: 'Ukuran 9:16, pas untuk Instagram Story dan Reels' },
    { id: 'besar', label: 'Bingkai Besar', note: 'Satu foto, ukuran besar' }
  ];

  const TEMPLATES = [
    /* ---------- 1. Strip 3 foto ---------- */
    {
      id: 'strip3',
      name: 'Strip Klasik',
      desc: '3 foto, gaya photobooth',
      group: 'strip',
      ratio: '2:3',
      w: 600,
      h: 1800,
      shots: 3,
      slots: [
        { x: 30, y: 60, w: 540, h: 480, r: 4 },
        { x: 30, y: 564, w: 540, h: 480, r: 4 },
        { x: 30, y: 1068, w: 540, h: 480, r: 4 }
      ],
      bg: function (ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, 1800);
        g.addColorStop(0, '#6d0d18');
        g.addColorStop(0.5, '#4a0710');
        g.addColorStop(1, '#2b0409');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 600, 1800);

        const rg = ctx.createRadialGradient(300, 260, 30, 300, 260, 720);
        rg.addColorStop(0, 'rgba(232,194,106,0.20)');
        rg.addColorStop(1, 'rgba(232,194,106,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, 600, 1000);

        const pts = [
          [66, 118, 15], [524, 92, 21], [118, 618, 13],
          [486, 760, 17], [78, 1298, 19], [512, 1424, 13],
          [300, 1652, 11], [158, 1742, 15]
        ];
        pts.forEach(function (p) { snowflake(ctx, p[0], p[1], p[2], '#f3e3c0', 0.17); });
      },
      overlay: function (ctx, m) {
        ctx.strokeStyle = 'rgba(232,194,106,0.85)';
        ctx.lineWidth = 4;
        ctx.strokeRect(16, 16, 568, 1768);
        ctx.strokeStyle = 'rgba(232,194,106,0.30)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(26, 26, 548, 1748);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        star(ctx, 300, 1578, 13, '#e8c26a');

        ctx.fillStyle = '#f7e7c6';
        ctx.font = '400 46px Georgia, "Times New Roman", serif';
        ctx.fillText('SELAMAT NATAL', 300, 1652);

        drawEventBlock(ctx, m.eventName, 300, {
          y: 1694,
          size: 21,
          maxWidth: 520,
          lineGap: 25,
          forceTwo: true,
          color: 'rgba(247,231,198,0.78)'
        });

        ctx.fillStyle = 'rgba(247,231,198,0.42)';
        ctx.font = '400 16px "Trebuchet MS", sans-serif';
        ctx.fillText(m.code || '', 300, 1762);
      }
    },

    /* ---------- 2. Strip 4 foto ---------- */
    {
      id: 'strip4',
      name: 'Strip Empat',
      desc: '4 foto berurutan',
      group: 'strip',
      ratio: '2:3',
      w: 600,
      h: 1800,
      shots: 4,
      slots: [
        { x: 30, y: 50, w: 540, h: 380, r: 4 },
        { x: 30, y: 446, w: 540, h: 380, r: 4 },
        { x: 30, y: 842, w: 540, h: 380, r: 4 },
        { x: 30, y: 1238, w: 540, h: 380, r: 4 }
      ],
      bg: function (ctx) {
        const g = ctx.createLinearGradient(0, 0, 600, 1800);
        g.addColorStop(0, '#0f3d2b');
        g.addColorStop(0.55, '#0a2b1e');
        g.addColorStop(1, '#051710');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 600, 1800);

        const rg = ctx.createRadialGradient(480, 140, 20, 480, 140, 620);
        rg.addColorStop(0, 'rgba(232,194,106,0.18)');
        rg.addColorStop(1, 'rgba(232,194,106,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, 600, 900);

        const pts = [
          [72, 96, 16], [520, 300, 12], [96, 700, 18],
          [506, 1010, 14], [82, 1450, 13], [524, 1620, 19]
        ];
        pts.forEach(function (p) { snowflake(ctx, p[0], p[1], p[2], '#f3e3c0', 0.15); });
      },
      overlay: function (ctx, m) {
        ctx.strokeStyle = 'rgba(232,194,106,0.80)';
        ctx.lineWidth = 4;
        ctx.strokeRect(16, 16, 568, 1768);
        ctx.strokeStyle = 'rgba(232,194,106,0.26)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(26, 26, 548, 1748);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        star(ctx, 300, 1642, 10, '#e8c26a');

        ctx.fillStyle = '#f7e7c6';
        ctx.font = '400 32px Georgia, "Times New Roman", serif';
        ctx.fillText('SELAMAT NATAL', 300, 1690);

        drawEventBlock(ctx, m.eventName, 300, {
          y: 1716,
          size: 16,
          maxWidth: 520,
          lineGap: 20,
          forceTwo: true,
          color: 'rgba(247,231,198,0.66)'
        });

        ctx.fillStyle = 'rgba(247,231,198,0.38)';
        ctx.font = '400 13px "Trebuchet MS", sans-serif';
        ctx.fillText(m.code || '', 300, 1772);
      }
    },

    /* ---------- 3. Bingkai 4R landscape ---------- */
    {
      id: 'landscape',
      name: 'Bingkai Lebar',
      desc: '1 foto besar + ucapan',
      group: 'besar',
      ratio: '3:2',
      w: 1800,
      h: 1200,
      shots: 1,
      slots: [
        { x: 50, y: 60, w: 1110, h: 1080, r: 6 }
      ],
      bg: function (ctx) {
        ctx.fillStyle = '#150a07';
        ctx.fillRect(0, 0, 1800, 1200);

        const g = ctx.createLinearGradient(1200, 0, 1800, 1200);
        g.addColorStop(0, '#0f3d2b');
        g.addColorStop(1, '#061a12');
        ctx.fillStyle = g;
        ctx.fillRect(1200, 0, 600, 1200);

        ctx.fillStyle = 'rgba(232,194,106,0.65)';
        ctx.fillRect(1180, 60, 3, 1080);

        const rg = ctx.createRadialGradient(1500, 300, 30, 1500, 300, 520);
        rg.addColorStop(0, 'rgba(232,194,106,0.16)');
        rg.addColorStop(1, 'rgba(232,194,106,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(1200, 0, 600, 1200);

        snowflake(ctx, 1300, 150, 20, '#f3e3c0', 0.16);
        snowflake(ctx, 1700, 980, 16, '#f3e3c0', 0.13);
        snowflake(ctx, 1640, 220, 12, '#f3e3c0', 0.12);
      },
      overlay: function (ctx, m) {
        ctx.strokeStyle = 'rgba(232,194,106,0.8)';
        ctx.lineWidth = 6;
        ctx.strokeRect(50, 60, 1110, 1080);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        star(ctx, 1500, 250, 22, '#e8c26a');

        ctx.fillStyle = 'rgba(247,231,198,0.7)';
        ctx.font = '400 30px "Trebuchet MS", sans-serif';
        spacedText(ctx, 'SELAMAT', 1500, 330, 7);

        ctx.fillStyle = '#f7e7c6';
        ctx.font = '400 96px Georgia, "Times New Roman", serif';
        ctx.fillText('NATAL', 1500, 430);

        ctx.strokeStyle = 'rgba(232,194,106,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(1370, 480);
        ctx.lineTo(1630, 480);
        ctx.stroke();

        drawEventBlock(ctx, m.eventName, 1500, {
          y: 540,
          size: 22,
          maxWidth: 460,
          lineGap: 30,
          forceTwo: true,
          color: 'rgba(247,231,198,0.8)'
        });

        ctx.fillStyle = 'rgba(247,231,198,0.4)';
        ctx.font = '400 19px "Trebuchet MS", sans-serif';
        ctx.fillText(m.code || '', 1500, 1090);
      }
    },

    /* ---------- 4. Persegi untuk media sosial ---------- */
    {
      id: 'square',
      name: 'Persegi',
      desc: '1 foto, pas untuk medsos',
      group: 'besar',
      ratio: '1:1',
      w: 1080,
      h: 1080,
      shots: 1,
      slots: [
        { x: 100, y: 60, w: 880, h: 880, r: 26 }
      ],
      bg: function (ctx) {
        const g = ctx.createLinearGradient(0, 0, 1080, 1080);
        g.addColorStop(0, '#5c0a14');
        g.addColorStop(0.6, '#3a0610');
        g.addColorStop(1, '#0f3d2b');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1080, 1080);

        const rg = ctx.createRadialGradient(540, 120, 40, 540, 120, 700);
        rg.addColorStop(0, 'rgba(232,194,106,0.18)');
        rg.addColorStop(1, 'rgba(232,194,106,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, 1080, 700);

        snowflake(ctx, 46, 500, 18, '#f3e3c0', 0.18);
        snowflake(ctx, 1036, 430, 14, '#f3e3c0', 0.15);
        snowflake(ctx, 60, 980, 12, '#f3e3c0', 0.12);
      },
      overlay: function (ctx, m) {
        ctx.strokeStyle = 'rgba(232,194,106,0.85)';
        ctx.lineWidth = 5;
        roundRect(ctx, 100, 60, 880, 880, 26);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        ctx.fillStyle = '#f7e7c6';
        ctx.font = '400 40px Georgia, "Times New Roman", serif';
        ctx.fillText('SELAMAT NATAL', 540, 1010);

        drawEventBlock(ctx, m.eventName, 540, {
          y: 1046,
          size: 19,
          maxWidth: 820,
          maxLines: 1,
          color: 'rgba(247,231,198,0.62)'
        });

        ctx.fillStyle = 'rgba(247,231,198,0.34)';
        ctx.font = '400 15px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(m.code || '', 1010, 1066);
      }
    },

    /* ---------- 5. Story tunggal 9:16 ---------- */
    {
      id: 'story1',
      name: 'Story Tunggal',
      desc: '1 foto, 9:16 untuk Story & Reels',
      group: 'story',
      ratio: '9:16',
      w: 1080,
      h: 1920,
      shots: 1,
      slots: [
        { x: 60, y: 520, w: 960, h: 720, r: 26 }
      ],
      bg: function (ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, 1920);
        g.addColorStop(0, '#6d0d18');
        g.addColorStop(0.42, '#3f0610');
        g.addColorStop(1, '#07170f');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1080, 1920);

        const rg = ctx.createRadialGradient(540, 380, 40, 540, 380, 760);
        rg.addColorStop(0, 'rgba(232,194,106,0.22)');
        rg.addColorStop(1, 'rgba(232,194,106,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, 1080, 1300);

        const pts = [
          [92, 200, 17], [988, 258, 13], [72, 980, 19],
          [1008, 1120, 15], [124, 1500, 13], [956, 1532, 17],
          [540, 1690, 11]
        ];
        pts.forEach(function (p) { snowflake(ctx, p[0], p[1], p[2], '#f3e3c0', 0.16); });
      },
      overlay: function (ctx, m) {
        ctx.strokeStyle = 'rgba(232,194,106,0.85)';
        ctx.lineWidth = 5;
        ctx.strokeRect(34, 34, 1012, 1852);
        ctx.strokeStyle = 'rgba(232,194,106,0.26)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(46, 46, 988, 1828);

        ctx.strokeStyle = 'rgba(232,194,106,0.7)';
        ctx.lineWidth = 5;
        roundRect(ctx, 60, 520, 960, 720, 26);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        ctx.fillStyle = 'rgba(247,231,198,0.5)';
        ctx.font = '600 24px "Trebuchet MS", sans-serif';
        spacedText(ctx, 'PHOTOBOOTH', 540, 186, 10);

        star(ctx, 540, 258, 15, '#e8c26a');

        ctx.fillStyle = 'rgba(247,231,198,0.85)';
        ctx.font = '400 54px "Trebuchet MS", sans-serif';
        spacedText(ctx, 'SELAMAT', 540, 346, 14);

        ctx.fillStyle = '#f7e7c6';
        ctx.font = '400 132px Georgia, "Times New Roman", serif';
        ctx.fillText('NATAL', 540, 470);

        ctx.strokeStyle = 'rgba(232,194,106,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(390, 1320);
        ctx.lineTo(690, 1320);
        ctx.stroke();

        drawEventBlock(ctx, m.eventName, 540, {
          y: 1392,
          size: 34,
          maxWidth: 880,
          lineGap: 46,
          forceTwo: true,
          color: 'rgba(247,231,198,0.85)'
        });

        ctx.fillStyle = 'rgba(247,231,198,0.45)';
        ctx.font = '400 23px "Trebuchet MS", sans-serif';
        ctx.fillText(m.code || '', 540, 1606);
      }
    },

    /* ---------- 6. Story kolase 9:16 ---------- */
    {
      id: 'story3',
      name: 'Story Kolase',
      desc: '3 foto, 9:16 untuk Story & Reels',
      group: 'story',
      ratio: '9:16',
      w: 1080,
      h: 1920,
      shots: 3,
      slots: [
        { x: 60, y: 292, w: 960, h: 636, r: 24 },
        { x: 60, y: 952, w: 470, h: 436, r: 20 },
        { x: 550, y: 952, w: 470, h: 436, r: 20 }
      ],
      bg: function (ctx) {
        const g = ctx.createLinearGradient(0, 0, 1080, 1920);
        g.addColorStop(0, '#0f3d2b');
        g.addColorStop(0.45, '#24060c');
        g.addColorStop(1, '#4a0710');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1080, 1920);

        const rg = ctx.createRadialGradient(540, 160, 40, 540, 160, 700);
        rg.addColorStop(0, 'rgba(232,194,106,0.20)');
        rg.addColorStop(1, 'rgba(232,194,106,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, 1080, 900);

        const pts = [
          [86, 150, 15], [992, 196, 12], [70, 760, 13],
          [1010, 860, 16], [112, 1440, 15], [968, 1470, 12],
          [540, 1600, 10]
        ];
        pts.forEach(function (p) { snowflake(ctx, p[0], p[1], p[2], '#f3e3c0', 0.16); });
      },
      overlay: function (ctx, m) {
        ctx.strokeStyle = 'rgba(232,194,106,0.85)';
        ctx.lineWidth = 5;
        ctx.strokeRect(34, 34, 1012, 1852);
        ctx.strokeStyle = 'rgba(232,194,106,0.26)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(46, 46, 988, 1828);

        ctx.strokeStyle = 'rgba(232,194,106,0.62)';
        ctx.lineWidth = 4;
        roundRect(ctx, 60, 292, 960, 636, 24);
        ctx.stroke();
        roundRect(ctx, 60, 952, 470, 436, 20);
        ctx.stroke();
        roundRect(ctx, 550, 952, 470, 436, 20);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        ctx.fillStyle = 'rgba(247,231,198,0.5)';
        ctx.font = '600 22px "Trebuchet MS", sans-serif';
        spacedText(ctx, 'PHOTOBOOTH', 540, 158, 10);

        ctx.fillStyle = '#f7e7c6';
        ctx.font = '400 62px Georgia, "Times New Roman", serif';
        ctx.fillText('SELAMAT NATAL', 540, 252);

        ctx.strokeStyle = 'rgba(232,194,106,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(390, 1444);
        ctx.lineTo(690, 1444);
        ctx.stroke();

        drawEventBlock(ctx, m.eventName, 540, {
          y: 1512,
          size: 32,
          maxWidth: 860,
          lineGap: 44,
          forceTwo: true,
          color: 'rgba(247,231,198,0.85)'
        });

        ctx.fillStyle = 'rgba(247,231,198,0.45)';
        ctx.font = '400 22px "Trebuchet MS", sans-serif';
        ctx.fillText(m.code || '', 540, 1690);
      }
    }
  ];

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(/\s+/);
    let line = '';
    let ly = y;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, ly);
        line = words[i];
        ly += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, ly);
  }

  /**
   * Pecah teks jadi maksimal 2 baris yang seimbang (bukan baris kedua pendek).
   * Mengembalikan array baris yang sudah muat di maxWidth.
   */
  function balancedLines(ctx, text, maxWidth, maxLines, forceTwo) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    if (!forceTwo && ctx.measureText(raw).width <= maxWidth) return [raw];
    if (maxLines < 2) return [raw];

    const words = raw.split(/\s+/);
    let best = null;

    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const wa = ctx.measureText(a).width;
      const wb = ctx.measureText(b).width;
      if (wa > maxWidth || wb > maxWidth) continue;
      const score = Math.max(wa, wb);
      if (!best || score < best.score) best = { lines: [a, b], score: score };
    }

    return best ? best.lines : [raw];
  }

  /**
   * Gambar nama acara (boleh 2 baris) dengan auto-shrink kalau kepanjangan.
   */
  function drawEventBlock(ctx, text, cx, opts) {
    const upper = String(text || '').toUpperCase();
    ctx.fillStyle = opts.color || 'rgba(247,231,198,0.75)';
    ctx.font = '400 ' + opts.size + 'px "Trebuchet MS", sans-serif';

    const lines = balancedLines(ctx, upper, opts.maxWidth, opts.maxLines || 2, opts.forceTwo);

    // kalau masih kepanjangan dalam satu baris, kecilkan font
    if (lines.length === 1 && ctx.measureText(lines[0]).width > opts.maxWidth) {
      let size = opts.size;
      while (size > 11 && ctx.measureText(lines[0]).width > opts.maxWidth) {
        size -= 1;
        ctx.font = '400 ' + size + 'px "Trebuchet MS", sans-serif';
      }
    }

    lines.forEach(function (line, i) {
      ctx.fillText(line, cx, opts.y + i * (opts.lineGap || 24));
    });

    return lines.length;
  }

  /**
   * Gambar template lengkap ke canvas.
   * @param {HTMLCanvasElement} canvas
   * @param {object} tpl
   * @param {Array<HTMLCanvasElement|HTMLImageElement>} photos
   * @param {{eventName?:string, code?:string}} meta
   */
  function renderTemplate(canvas, tpl, photos, meta) {
    const m = meta || {};
    canvas.width = tpl.w;
    canvas.height = tpl.h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, tpl.w, tpl.h);

    tpl.bg(ctx, m);

    tpl.slots.forEach(function (slot, i) {
      if (photos && photos[i]) {
        drawPhoto(ctx, photos[i], slot.x, slot.y, slot.w, slot.h, slot.r || 0);
      } else {
        placeholder(ctx, slot);
      }
    });

    tpl.overlay(ctx, m);
    return canvas;
  }

  window.PB = window.PB || {};
  window.PB.TEMPLATES = TEMPLATES;
  window.PB.GROUPS = GROUPS;
  window.PB.renderTemplate = renderTemplate;
})();
