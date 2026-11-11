/* Мебель и полы для изометрических офисов. KVF(W) возвращает набор функций, которые сами ставят предметы и блокируют клетки */
(function () {
  'use strict';
  window.KVF = function (W) {
    var shade = Iso.shade, hash = Iso.hash, FONT = (window.Kit && Kit.FONT) || "Onest, sans-serif";
    function circ(c, p, r, col) { c.fillStyle = col; c.beginPath(); c.arc(p[0], p[1], r, 0, 7); c.fill(); }
    function blockRect(x0, y0, x1, y1) { W.block(Math.floor(x0 + 0.01), Math.floor(y0 + 0.01), Math.floor(x1 - 0.01), Math.floor(y1 - 0.01)); }
    var F = { circ: circ };

    // ——— полы (вызывать внутри W.bakeGround) ———
    F.floor = function (c, x0, y0, x1, y1, kind, col) {
      for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
        var h = hash(x, y, 7);
        if (kind === 'parquet') {
          W.dia(x, y, 1, 1, shade(col || '#C9A27A', -0.12));
          for (var k = 0; k < 4; k++) W.dia(x + k * 0.25 + 0.01, y + 0.01, 0.23, 0.98, shade(col || '#C9A27A', (hash(x * 4 + k, y, 3) - 0.5) * 0.12));
        } else if (kind === 'carpet') {
          W.dia(x, y, 1, 1, shade(col || '#7D8A9E', (h - 0.5) * 0.05));
        } else if (kind === 'tile') {
          for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) W.dia(x + i * 0.5, y + j * 0.5, 0.5, 0.5, (i + j) % 2 ? (col || '#E9E4DA') : shade(col || '#E9E4DA', -0.1));
        } else if (kind === 'lab') {
          W.dia(x, y, 1, 1, '#C9CED3');
          for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) W.dia(x + a * 0.5 + 0.02, y + b * 0.5 + 0.02, 0.46, 0.46, '#F2F4F5');
        } else if (kind === 'concrete') {
          W.dia(x, y, 1, 1, shade(col || '#B8B4AD', (h - 0.5) * 0.08));
          if (h < 0.3) { var p = W.iso(x + 0.3 + h, y + 0.6); c.fillStyle = 'rgba(0,0,0,.06)'; c.beginPath(); c.ellipse(p[0], p[1], 9, 4, 0, 0, 7); c.fill(); }
        } else if (kind === 'stone') {
          W.dia(x, y, 1, 1, '#CFC6B8'); W.dia(x + 0.02, y + 0.02, 0.96, 0.96, shade(col || '#ECE5D9', (h - 0.5) * 0.06));
        } else {
          W.dia(x, y, 1, 1, shade(col || '#DAD3C6', (h - 0.5) * 0.04));
        }
      }
    };
    F.rug = function (c, x0, y0, x1, y1, col, edge) {
      W.dia(x0, y0, x1 - x0, y1 - y0, edge || shade(col, -0.2));
      W.dia(x0 + 0.12, y0 + 0.12, x1 - x0 - 0.24, y1 - y0 - 0.24, col);
    };
    F.floorText = function (c, x, y, text, color) {
      var p = W.iso(x, y);
      c.save(); c.transform(1, 0.5, -1, 0.5, p[0], p[1]);
      c.font = '800 13px ' + FONT; c.fillStyle = color || 'rgba(28,19,19,.22)'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText(text, 0, 0); c.restore();
    };

    // ——— окна на дальних наружных стенах (линии y=0 и x=0) ———
    F.windowsX = function (xs, y, z0, z1) { // стена вдоль x на линии y
      W.prop(-150 + y, function () {
        xs.forEach(function (a) {
          W.face('x', a[0] - 0.06, a[1] + 0.06, y + 0.065, z0 - 4, z1 + 4, '#F4EFE6');
          W.face('x', a[0], a[1], y + 0.067, z0, z1, W.night ? '#2D3A55' : '#9CC3DE');
          if (!W.night) W.poly([W.iso(a[0] + 0.1, y + 0.068, z1), W.iso(a[0] + 0.4, y + 0.068, z1), W.iso(a[0] + 0.1, y + 0.068, z0 + 8)], 'rgba(255,255,255,.35)');
          W.face('x', (a[0] + a[1]) / 2 - 0.02, (a[0] + a[1]) / 2 + 0.02, y + 0.069, z0, z1, '#F4EFE6');
        });
      });
    };
    F.windowsY = function (ys, x, z0, z1) { // стена вдоль y на линии x
      W.prop(-150 + x, function () {
        ys.forEach(function (a) {
          W.face('y', a[0] - 0.06, a[1] + 0.06, x + 0.065, z0 - 4, z1 + 4, '#E8E2D8');
          W.face('y', a[0], a[1], x + 0.067, z0, z1, W.night ? '#26324B' : '#8DB6D3');
          W.face('y', (a[0] + a[1]) / 2 - 0.02, (a[0] + a[1]) / 2 + 0.02, x + 0.069, z0, z1, '#E8E2D8');
        });
      });
    };
    // плакат или доска на стене: axis 'x' — стена вдоль x на линии at (смотрит в +y), 'y' — стена вдоль y (смотрит в +x)
    F.poster = function (axis, a0, a1, at, z0, z1, bg, lines, opt) {
      opt = opt || {};
      W.prop((axis === 'x' ? (a0 + a1) / 2 + at : at + (a0 + a1) / 2) + 0.02, function (c) {
        if (opt.frame) W.face(axis, a0 - 0.04, a1 + 0.04, at + 0.07, z0 - 3, z1 + 3, opt.frame);
        W.face(axis, a0, a1, at + 0.075, z0, z1, bg);
        (lines || []).forEach(function (L) {
          if (axis === 'x') W.faceText(L[0], a0 + 0.08, at + 0.08, z1 - L[1], 'x', L[2] || ('700 8px ' + FONT), L[3] || '#1C1313');
          else W.faceText(L[0], at + 0.08, a1 - 0.08, z1 - L[1], 'y', L[2] || ('700 8px ' + FONT), L[3] || '#1C1313');
        });
        if (opt.dots) opt.dots.forEach(function (d) { var p = axis === 'x' ? W.iso(a0 + d[0] * (a1 - a0), at + 0.08, z0 + d[1] * (z1 - z0)) : W.iso(at + 0.08, a1 - d[0] * (a1 - a0), z0 + d[1] * (z1 - z0)); circ(c, p, d[3] || 2.6, d[2]); });
      });
    };

    // ——— мебель ———
    F.chair = function (x, y, back, col) {
      W.prop(x + y, function () {
        var m = '#3A3F47', s = col || '#2F3540';
        W.cyl(x, y, 0, 0.05, 10, m);
        W.ell(x, y, 0, 0.22, 'rgba(0,0,0,.12)');
        if (back === 'n') W.box(x - 0.2, y - 0.25, 10, 0.4, 0.06, 20, s);
        else if (back === 'w') W.box(x - 0.25, y - 0.2, 10, 0.06, 0.4, 20, s);
        W.box(x - 0.2, y - 0.2, 10, 0.4, 0.4, 3, s);
      });
    };
    F.desk = function (x, y, o) {
      o = o || {};
      var w = o.w || 1.6, d = o.d || 0.8, col = o.col || '#EDE6DA', x0 = x - w / 2, y0 = y - d / 2;
      blockRect(x0, y0, x0 + w, y0 + d);
      if (o.chair !== false) F.chair(x + (o.cx || 0), y0 - 0.32, 'n', o.chairCol);
      W.prop(x + y, function (c) {
        W.shadow(x, y, w * 0.45, 0.12);
        var lg = '#4A4F57';
        W.box(x0 + 0.04, y0 + 0.04, 0, 0.06, 0.06, 22, lg); W.box(x0 + w - 0.1, y0 + 0.04, 0, 0.06, 0.06, 22, lg);
        W.box(x0 + 0.04, y0 + d - 0.1, 0, 0.06, 0.06, 22, lg); W.box(x0 + w - 0.1, y0 + d - 0.1, 0, 0.06, 0.06, 22, lg);
        W.box(x0, y0, 22, w, d, 3, col);
        if (o.mon !== false) {
          var mx = x + (o.cx || 0);
          W.box(mx - 0.04, y0 + 0.28, 25, 0.08, 0.08, 6, '#30353C');
          W.box(mx - 0.33, y0 + 0.24, 30, 0.66, 0.07, 19, '#262A31', { left: '#3A3F48' });
          W.face('x', mx - 0.31, mx + 0.31, y0 + 0.235, 32, 47, W.night ? '#9FD0FF' : '#7FB2FF');
          W.box(mx - 0.25, y0 + 0.08, 25, 0.5, 0.14, 1.2, '#D5D9DF');
        }
        if (o.laptop) { W.box(x + 0.25, y0 + 0.45, 25, 0.42, 0.3, 1.4, '#C9CED6'); W.face('x', x + 0.25, x + 0.67, y0 + 0.45, 26, 38, '#B8BEC7'); }
        if (o.mug !== false) W.cyl(x0 + w - 0.22, y0 + d - 0.22, 25, 0.06, 6, o.mugCol || '#E62020', '#3B2A20');
        if (o.papers) { W.box(x0 + 0.15, y0 + d - 0.42, 25, 0.32, 0.26, 2, '#FFFFFF'); W.box(x0 + 0.18, y0 + d - 0.4, 27, 0.32, 0.26, 2, '#F4F1EA'); }
        if (o.extra) o.extra(c, x0, y0, w, d);
      });
    };
    F.table = function (x, y, w, d, col, o) {
      o = o || {};
      var x0 = x - w / 2, y0 = y - d / 2;
      blockRect(x0, y0, x0 + w, y0 + d);
      W.prop(x + y, function (c) {
        W.shadow(x, y, Math.max(w, d) * 0.45, 0.12);
        var lg = o.leg || '#4A4F57';
        [[0.08, 0.08], [w - 0.14, 0.08], [0.08, d - 0.14], [w - 0.14, d - 0.14]].forEach(function (l) { W.box(x0 + l[0], y0 + l[1], 0, 0.06, 0.06, 22, lg); });
        W.box(x0, y0, 22, w, d, 3, col || '#D8B98E');
        if (o.items) o.items(c, x0, y0, w, d);
      });
    };
    F.sofa = function (x, y, axis, len, col) {
      var c0 = col || '#3E5C76';
      if (axis === 'x') {
        blockRect(x - len / 2, y - 0.4, x + len / 2, y + 0.4);
        W.prop(x + y, function () {
          W.shadow(x, y, len * 0.45, 0.14);
          W.box(x - len / 2, y - 0.4, 0, len, 0.8, 12, shade(c0, -0.1));
          W.box(x - len / 2, y - 0.42, 12, len, 0.22, 16, c0);
          W.box(x - len / 2, y - 0.4, 12, 0.18, 0.8, 8, c0); W.box(x + len / 2 - 0.18, y - 0.4, 12, 0.18, 0.8, 8, c0);
          W.box(x - len / 2 + 0.2, y - 0.2, 12, len - 0.4, 0.58, 4, shade(c0, 0.15));
        });
      } else {
        blockRect(x - 0.4, y - len / 2, x + 0.4, y + len / 2);
        W.prop(x + y, function () {
          W.shadow(x, y, len * 0.45, 0.14);
          W.box(x - 0.4, y - len / 2, 0, 0.8, len, 12, shade(c0, -0.1));
          W.box(x - 0.42, y - len / 2, 12, 0.22, len, 16, c0);
          W.box(x - 0.4, y - len / 2, 12, 0.8, 0.18, 8, c0); W.box(x - 0.4, y + len / 2 - 0.18, 12, 0.8, 0.18, 8, c0);
          W.box(x - 0.2, y - len / 2 + 0.2, 12, 0.58, len - 0.4, 4, shade(c0, 0.15));
        });
      }
    };
    F.plant = function (x, y, s, big) {
      s = s || 1;
      W.block(Math.floor(x), Math.floor(y));
      W.prop(x + y, function (c) {
        W.shadow(x, y, 0.3 * s, 0.15);
        W.cyl(x, y, 0, 0.2 * s, 14 * s, '#C46A42', '#5A3A28');
        var p = W.iso(x, y, 14 * s);
        if (big) {
          c.fillStyle = '#5A3A28'; c.fillRect(p[0] - 1.5, p[1] - 26 * s, 3, 26 * s);
          [[0, -40, 14], [-10, -32, 10], [10, -30, 10], [-4, -50, 9], [6, -48, 8]].forEach(function (b) { circ(c, [p[0] + (b[0] + 2) * s, p[1] + (b[1] + 2) * s], b[2] * s, '#3F8436'); });
          [[0, -40, 14], [-10, -32, 10], [10, -30, 10], [-4, -50, 9], [6, -48, 8]].forEach(function (b) { circ(c, [p[0] + b[0] * s, p[1] + b[1] * s], b[2] * s * 0.85, '#58A64A'); });
        } else {
          for (var i = 0; i < 7; i++) {
            var a = -Math.PI / 2 + (i - 3) * 0.42, L = (14 + (i % 2) * 5) * s;
            c.strokeStyle = i % 2 ? '#3F8A3A' : '#5BAA4C'; c.lineWidth = 4 * s; c.lineCap = 'round';
            c.beginPath(); c.moveTo(p[0], p[1] - 2); c.quadraticCurveTo(p[0] + Math.cos(a) * L * 0.5, p[1] + Math.sin(a) * L * 0.9 - 6 * s, p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L * 0.8); c.stroke();
          }
        }
      });
    };
    F.shelf = function (x, y, axis, len, o) { // вдоль стены; x,y — левый задний угол
      o = o || {};
      var h = o.h || 58, dep = 0.38, wood = o.col || '#8B6A4E';
      if (axis === 'x') blockRect(x, y, x + len, y + dep); else blockRect(x, y, x + dep, y + len);
      W.prop(axis === 'x' ? x + len / 2 + y + dep : x + dep + y + len / 2, function () {
        if (axis === 'x') {
          W.box(x, y, 0, len, dep, h, wood);
          for (var r = 0; r < 3; r++) {
            var z = 6 + r * (h - 8) / 3;
            for (var b = x + 0.05; b < x + len - 0.08; b += 0.11) {
              var hh = 10 + hash(Math.round(b * 100), r, 2) * 5;
              W.face('x', b, b + 0.09, y + dep + 0.004, z, z + hh, o.files ? ['#E62020', '#2F5BD3', '#E0A800', '#1E9E62'][Math.floor(hash(Math.round(b * 100), r, 4) * 4)] : ['#C0392B', '#2E86AB', '#F2B705', '#5B6B80', '#1E9E62', '#8E44D8', '#EDE6DA'][Math.floor(hash(Math.round(b * 100), r, 4) * 7)]);
            }
          }
          (o.labels || []).forEach(function (L, i) { W.faceText(L, x + 0.1 + i * len / o.labels.length, y + dep + 0.006, h - 4, 'x', '700 6.5px ' + FONT, '#FFFFFF'); });
        } else {
          W.box(x, y, 0, dep, len, h, wood);
          for (var r2 = 0; r2 < 3; r2++) {
            var z2 = 6 + r2 * (h - 8) / 3;
            for (var b2 = y + 0.05; b2 < y + len - 0.08; b2 += 0.11) {
              var h2 = 10 + hash(Math.round(b2 * 100), r2, 5) * 5;
              W.face('y', b2, b2 + 0.09, x + dep + 0.004, z2, z2 + h2, ['#C0392B', '#2E86AB', '#F2B705', '#5B6B80', '#1E9E62', '#8E44D8', '#EDE6DA'][Math.floor(hash(Math.round(b2 * 100), r2, 6) * 7)]);
            }
          }
        }
      });
    };
    F.cabinet = function (x, y, axis, len, labels) {
      var h = 40, dep = 0.45, col = '#AEB4BB';
      if (axis === 'x') blockRect(x, y, x + len, y + dep); else blockRect(x, y, x + dep, y + len);
      W.prop(axis === 'x' ? x + len / 2 + y + dep : x + dep + y + len / 2, function () {
        if (axis === 'x') {
          W.box(x, y, 0, len, dep, h, col);
          for (var i = 0; i < 3; i++) W.face('x', x + 0.05, x + len - 0.05, y + dep + 0.004, 4 + i * 12, 13 + i * 12, shade(col, 0.08));
          (labels || []).forEach(function (L, i) { W.faceText(L, x + 0.08, y + dep + 0.006, 34 - i * 12, 'x', '700 6.5px ' + FONT, '#1C1313'); });
        } else {
          W.box(x, y, 0, dep, len, h, col);
          for (var j = 0; j < 3; j++) W.face('y', y + 0.05, y + len - 0.05, x + dep + 0.004, 4 + j * 12, 13 + j * 12, shade(col, 0.04));
          (labels || []).forEach(function (L, i) { W.faceText(L, x + dep + 0.006, y + len - 0.08, 34 - i * 12, 'y', '700 6.5px ' + FONT, '#1C1313'); });
        }
      });
    };
    F.cooler = function (x, y) {
      W.block(Math.floor(x), Math.floor(y));
      W.prop(x + y, function () {
        W.shadow(x, y, 0.3, 0.15);
        W.box(x - 0.22, y - 0.22, 0, 0.44, 0.44, 30, '#F3F3F1');
        W.face('x', x - 0.1, x + 0.1, y + 0.225, 20, 25, '#E62020'); W.face('x', x - 0.1, x + 0.1, y + 0.226, 14, 18, '#2F5BD3');
        W.cyl(x, y, 30, 0.17, 20, '#8FD0F4', '#B5E2FA');
      });
    };
    F.fridge = function (x, y, label, col) {
      W.block(Math.floor(x), Math.floor(y));
      W.prop(x + y, function () {
        W.shadow(x, y, 0.35, 0.15);
        W.box(x - 0.3, y - 0.3, 0, 0.6, 0.6, 62, col || '#F1F1EE');
        W.face('x', x - 0.28, x + 0.28, y + 0.302, 40, 41.5, '#C9C9C4');
        W.face('x', x + 0.18, x + 0.22, y + 0.304, 46, 58, '#9A9A96'); W.face('x', x + 0.18, x + 0.22, y + 0.304, 20, 34, '#9A9A96');
        if (label) { W.face('x', x - 0.22, x + 0.12, y + 0.304, 47, 57, '#FFF59E'); W.faceText(label, x - 0.2, y + 0.306, 52, 'x', '700 5.5px ' + FONT, '#1C1313'); }
      });
    };
    F.printer = function (x, y) {
      W.block(Math.floor(x), Math.floor(y));
      W.prop(x + y, function () {
        W.shadow(x, y, 0.35, 0.15);
        W.box(x - 0.32, y - 0.25, 0, 0.64, 0.5, 26, '#D5D8DC');
        W.box(x - 0.32, y - 0.25, 26, 0.64, 0.5, 8, '#E8EAED');
        W.face('x', x - 0.2, x + 0.2, y + 0.252, 14, 18, '#2B2F36');
        W.box(x - 0.18, y + 0.25, 13, 0.36, 0.18, 1.5, '#FFFFFF');
        W.face('x', x + 0.18, x + 0.26, y + 0.252, 28, 31, '#1E9E62');
      });
    };
    F.tvStand = function (x, y, text) { // экран на ножках, смотрит в +y
      W.block(Math.floor(x), Math.floor(y));
      W.prop(x + y, function () {
        W.box(x - 0.05, y - 0.05, 0, 0.1, 0.1, 40, '#30353C');
        W.box(x - 0.8, y - 0.06, 36, 1.6, 0.1, 40, '#1C1F24');
        W.face('x', x - 0.74, x + 0.74, y + 0.042, 40, 72, W.night ? '#5E8FD8' : '#3F6FB8');
        if (text) W.faceText(text, x - 0.66, y + 0.045, 62, 'x', '800 8.5px ' + FONT, '#FFFFFF');
      });
    };
    F.easel = function (x, y, title, lines) {
      W.block(Math.floor(x), Math.floor(y));
      W.prop(x + y, function () {
        W.box(x - 0.5, y - 0.04, 0, 0.06, 0.06, 66, '#5A4634'); W.box(x + 0.44, y - 0.04, 0, 0.06, 0.06, 66, '#5A4634');
        W.box(x - 0.55, y - 0.03, 22, 1.1, 0.06, 44, '#FFFFFF', { left: '#FAFAF8' });
        W.faceText(title || '', x - 0.48, y + 0.035, 60, 'x', '800 7px ' + FONT, '#E62020');
        (lines || []).forEach(function (L, i) { W.face('x', x - 0.48 + (i % 3) * 0.33, x - 0.2 + (i % 3) * 0.33, y + 0.035, 30 + Math.floor(i / 3) * 9, 36 + Math.floor(i / 3) * 9, L); });
      });
    };
    F.labTable = function (x, y, w) {
      var d = 0.7, x0 = x - w / 2, y0 = y - d / 2;
      blockRect(x0, y0, x0 + w, y0 + d);
      W.prop(x + y, function () {
        W.shadow(x, y, w * 0.45, 0.12);
        W.box(x0, y0, 0, w, d, 24, '#E9ECEE', { top: '#F7F9FA' });
        for (var i = 0; i < w * 3 - 1; i++) {
          var bx = x0 + 0.25 + i * 0.32;
          W.cyl(bx, y0 + 0.3, 24, 0.07, 12, ['#FFFFFF', '#FFF4D6', '#FFE3EC'][i % 3], '#2F5BD3');
        }
      });
    };
    F.coats = function (x, y) {
      W.block(Math.floor(x), Math.floor(y));
      W.prop(x + y, function (c) {
        W.shadow(x, y, 0.25, 0.15);
        W.cyl(x, y, 0, 0.03, 64, '#5A4634');
        var p = W.iso(x, y, 56);
        [[-7, 0], [6, 2]].forEach(function (o) { c.fillStyle = '#FFFFFF'; W.rr(c, p[0] + o[0] - 6, p[1] + o[1], 12, 30, 4); c.fill(); c.strokeStyle = '#D5D9DD'; c.lineWidth = 1; c.stroke(); });
      });
    };
    F.pallet = function (x, y, col, h) {
      W.block(Math.floor(x), Math.floor(y));
      W.prop(x + y, function () {
        W.shadow(x, y, 0.45, 0.15);
        W.box(x - 0.42, y - 0.42, 0, 0.84, 0.84, 5, '#B98A5A');
        var hh = h || 2;
        for (var k = 0; k < hh; k++) for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++)
          W.box(x - 0.4 + i * 0.41, y - 0.4 + j * 0.41, 5 + k * 13, 0.38, 0.38, 12, k % 2 ? shade(col || '#E9DCC4', -0.05) : (col || '#E9DCC4'));
        W.face('x', x - 0.3, x + 0.05, y + 0.425, 8, 14, '#E62020');
      });
    };
    F.conveyor = function (x, y0, y1) {
      blockRect(x - 0.35, y0, x + 0.35, y1);
      for (var yy = Math.floor(y0); yy < Math.ceil(y1); yy++) (function (yy) {
        var a = Math.max(y0, yy), b = Math.min(y1, yy + 1);
        W.prop(x + (a + b) / 2, function () {
          W.box(x - 0.35, a, 0, 0.7, b - a, 18, '#7D838B');
          W.box(x - 0.3, a, 18, 0.6, b - a, 2, '#2B2F36');
          for (var k = 0; k < 3; k++) {
            var t = ((W.t * 0.35 + k / 3 + yy * 0.33) % 1), by = a + t * (b - a);
            if (by > a + 0.05 && by < b - 0.05) { W.cyl(x, by, 20, 0.11, 14, '#FFFFFF', '#E62020'); }
          }
        });
      })(yy);
    };
    F.machine = function (x, y, label, col) {
      W.block(Math.floor(x), Math.floor(y), Math.floor(x + 0.99), Math.floor(y));
      W.prop(x + 1 + y + 0.5, function () {
        W.shadow(x + 0.5, y + 0.5, 0.6, 0.15);
        W.box(x + 0.05, y + 0.1, 0, 0.9, 0.8, 44, col || '#5B6B80');
        W.face('x', x + 0.2, x + 0.8, y + 0.902, 24, 38, '#1C1F24');
        W.face('x', x + 0.25, x + 0.75, y + 0.904, 27, 35, '#7FE3A0');
        if (label) W.faceText(label, x + 0.27, y + 0.906, 31, 'x', '800 6px ' + FONT, '#1C1F24');
        W.face('x', x + 0.2, x + 0.4, y + 0.902, 8, 16, '#E62020');
      });
    };
    F.counter = function (x0, y0, x1, y1, col) {
      blockRect(x0, y0, x1, y1);
      W.prop((x0 + x1) / 2 + (y0 + y1) / 2, function () {
        W.shadow((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) * 0.45, 0.12);
        W.box(x0, y0, 0, x1 - x0, y1 - y0, 30, col || '#E62020', { top: '#F4EFE6' });
      });
    };
    F.beanbag = function (x, y, col) {
      W.prop(x + y, function (c) {
        var p = W.iso(x, y, 0);
        c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(p[0], p[1], 22, 10, 0, 0, 7); c.fill();
        c.fillStyle = shade(col, -0.15); c.beginPath(); c.ellipse(p[0] + 2, p[1] - 8, 20, 13, 0, 0, 7); c.fill();
        c.fillStyle = col; c.beginPath(); c.ellipse(p[0], p[1] - 11, 18, 12, 0, 0, 7); c.fill();
        c.fillStyle = shade(col, 0.2); c.beginPath(); c.ellipse(p[0] - 5, p[1] - 16, 7, 4, -0.3, 0, 7); c.fill();
      });
    };
    // талисман «Бурёнки в кедах»
    F.cow = function (x, y) {
      W.block(Math.floor(x - 0.6), Math.floor(y - 0.4), Math.floor(x + 0.6), Math.floor(y + 0.4));
      W.prop(x + y + 0.5, function (c) {
        W.shadow(x, y, 0.95, 0.16);
        W.box(x - 0.85, y - 0.5, 0, 1.7, 1.0, 12, '#B9B2A7', { top: '#D8D2C8' });
        W.faceText('БУРЁНКА В КЕДАХ', x - 0.75, y + 0.505, 6, 'x', '800 6.5px ' + FONT, '#1C1313');
        var leg = function (lx, ly) { W.box(lx - 0.06, ly - 0.06, 12, 0.12, 0.12, 18, '#F7F5F0'); W.box(lx - 0.1, ly - 0.08, 12, 0.22, 0.16, 6, '#E62020', { top: '#FF5A4E' }); W.box(lx - 0.1, ly - 0.08, 12, 0.22, 0.16, 1.5, '#FFFFFF'); };
        leg(x - 0.45, y - 0.18); leg(x + 0.35, y - 0.18);
        W.box(x - 0.6, y - 0.28, 28, 1.1, 0.56, 24, '#F7F5F0', { top: '#FFFFFF', left: '#F2EFE8', right: '#DFDAD0' });
        leg(x - 0.45, y + 0.2); leg(x + 0.35, y + 0.2);
        W.face('x', x - 0.45, x - 0.15, y + 0.282, 36, 48, '#1C1313'); W.face('x', x + 0.1, x + 0.3, y + 0.282, 32, 42, '#1C1313');
        W.face('y', y - 0.2, y + 0.05, x + 0.502, 34, 46, '#1C1313');
        W.box(x + 0.45, y - 0.18, 40, 0.4, 0.36, 22, '#F7F5F0', { top: '#FFFFFF', left: '#F2EFE8', right: '#DFDAD0' });
        W.box(x + 0.82, y - 0.12, 40, 0.1, 0.24, 9, '#F4A6B5');
        var e = W.iso(x + 0.86, y + 0.12, 56); circ(c, e, 2.2, '#1C1313');
        var h1 = W.iso(x + 0.6, y - 0.2, 64), h2 = W.iso(x + 0.6, y + 0.2, 64);
        c.strokeStyle = '#E8DCC2'; c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.moveTo(h1[0], h1[1]); c.lineTo(h1[0] - 4, h1[1] - 8); c.stroke(); c.beginPath(); c.moveTo(h2[0], h2[1]); c.lineTo(h2[0] + 2, h2[1] - 9); c.stroke();
        var tl = W.iso(x - 0.62, y, 46); c.strokeStyle = '#F2EFE8'; c.lineWidth = 2; c.beginPath(); c.moveTo(tl[0], tl[1]); c.quadraticCurveTo(tl[0] - 10, tl[1] + 6, tl[0] - 6, tl[1] + 18); c.stroke();
      });
    };
    return F;
  };
})();
