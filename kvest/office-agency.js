/* Офис агентства «Финал Финал 2»: кирпичный лофт на бывшей фабрике. Формат как в kvest/office-client.js.
   Квест может задать night: true (ночь в офисе) и places: { id: {x, y, pose, ax, ay, cup, coat} } — где стоят люди в этом квесте. */
(function () {
  'use strict';
  window.KVOffice = window.KVOffice || {};
  window.KVOffice.agency = function (W, F) {
    var COLS = 24, ROWS = 18, shade = Iso.shade, hash = Iso.hash, FONT = (window.Kit && Kit.FONT) || 'Onest, sans-serif';
    var ROOMS = [
      { name: 'КАБИНЕТ ДИРЕКТОРА', x0: 0, y0: 0, x1: 5, y1: 6, floor: 'parquet', col: '#9C6B48' },
      { name: 'OPEN SPACE АККАУНТОВ', x0: 5, y0: 0, x1: 15, y1: 7, floor: 'concrete', col: '#C9C2B6' },
      { name: 'ПЕРЕГОВОРНАЯ «ПИТЧ»', x0: 15, y0: 0, x1: 20, y1: 6, floor: 'parquet', col: '#B98C5E', glass: true },
      { name: 'КУХНЯ', x0: 20, y0: 0, x1: 24, y1: 7, floor: 'tile', col: '#EDE6D6' },
      { name: 'КРЕАТИВНАЯ', x0: 0, y0: 8, x1: 7, y1: 14, floor: 'parquet', col: '#D8B387' },
      { name: 'ПРОДАКШН', x0: 8, y0: 9, x1: 14, y1: 14, floor: 'concrete', col: '#B3ACA1' },
      { name: 'ПЕРФОРМАНС', x0: 15, y0: 9, x1: 24, y1: 14, floor: 'carpet', col: '#4F5B70' },
      { name: 'БУХГАЛТЕРИЯ', x0: 0, y0: 14, x1: 5, y1: 18, floor: 'carpet', col: '#A39785' }
    ];
    var DOORS = {};
    ['h:3:6', 'v:5:4', 'h:6:7', 'h:7:7', 'h:12:7', 'h:13:7', 'v:15:3', 'h:17:6', 'v:20:6', 'h:22:7',
      'h:5:8', 'v:7:11', 'h:6:14', 'v:8:12', 'v:14:12', 'h:12:14', 'h:17:9', 'v:15:11', 'h:20:14', 'v:5:16', 'v:0:6', 'v:0:7'].forEach(function (k) { DOORS[k] = 1; });

    // ——— помощники рисования ———
    function onX(x, y, z, fn) { var c = W.ctx, p = W.iso(x, y, z); c.save(); if (W.flat) c.transform(W.TS / 32, 0, 0, W.ZK, p[0], p[1]); else c.transform(1, 0.5, 0, 1, p[0], p[1]); fn(c); c.restore(); } // плоскость y=const, ось u вдоль +x (32 px на клетку)
    function onY(x, y, z, fn) { if (W.flat) return; var c = W.ctx, p = W.iso(x, y, z); c.save(); c.transform(1, -0.5, 0, 1, p[0], p[1]); fn(c); c.restore(); } // плоскость x=const, ось u вдоль −y
    function txt(c, s, x, y, font, col, align) { c.font = font; c.fillStyle = col; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillText(s, x, y); }
    // рисунок на низкой внутренней стене: режем по клеткам, чтобы каждый кусок шёл сразу после своего отрезка стены
    function wallArt(axis, a0, a1, at, z0, z1, draw) {
      for (var u = Math.floor(a0); u < a1; u++) (function (u) {
        var s0 = u === Math.floor(a0) ? a0 - 0.12 : u, s1 = u + 1 >= a1 ? a1 + 0.12 : u + 1;
        W.prop(u + 0.5 + at + 0.03, function (c) {
          var I = W.iso.bind(W), d = at + 0.09;
          var q = axis === 'x' ? [I(s0, d, z0 - 6), I(s1, d, z0 - 6), I(s1, d, z1 + 6), I(s0, d, z1 + 6)] : [I(d, s0, z0 - 6), I(d, s1, z0 - 6), I(d, s1, z1 + 6), I(d, s0, z1 + 6)];
          c.save(); c.beginPath(); q.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); c.clip();
          draw(c); c.restore();
        });
      })(u);
    }
    function hx(hex, k) { return '#' + shade(hex, k).match(/\d+/g).map(function (v) { return ('0' + (+v).toString(16)).slice(-2); }).join(''); }
    function blockR(x0, y0, x1, y1) { W.block(Math.floor(x0 + 0.01), Math.floor(y0 + 0.01), Math.floor(x1 - 0.01), Math.floor(y1 - 0.01)); }
    // диван: axis 'x' — спинкой к −y, 'y' — спинкой к −x
    function sofa(x, y, axis, len, col) {
      var cb = hx(col, -0.14), cs = hx(col, 0.14), cp = hx(col, 0.3), L = len / 2;
      if (axis === 'x') {
        blockR(x - L, y - 0.4, x + L, y + 0.4);
        W.prop(x + y, function () {
          W.shadow(x, y, len * 0.45, 0.14);
          W.box(x - L, y - 0.4, 0, len, 0.8, 12, cb);
          W.box(x - L, y - 0.42, 12, len, 0.22, 17, col);
          W.box(x - L, y - 0.4, 12, 0.18, 0.8, 8, col);
          var n = Math.max(2, Math.round(len / 0.9)), w = (len - 0.36) / n;
          for (var i = 0; i < n; i++) W.box(x - L + 0.18 + i * w + 0.02, y - 0.2, 12, w - 0.04, 0.58, 4, cs);
          W.box(x - L + 0.3, y - 0.2, 16, 0.32, 0.1, 9, cp);
          W.box(x + L - 0.18, y - 0.4, 12, 0.18, 0.8, 8, col);
        });
      } else {
        blockR(x - 0.4, y - L, x + 0.4, y + L);
        W.prop(x + y, function () {
          W.shadow(x, y, len * 0.45, 0.14);
          W.box(x - 0.4, y - L, 0, 0.8, len, 12, cb);
          W.box(x - 0.42, y - L, 12, 0.22, len, 17, col);
          W.box(x - 0.4, y - L, 12, 0.8, 0.18, 8, col);
          var n = Math.max(2, Math.round(len / 0.9)), w = (len - 0.36) / n;
          for (var i = 0; i < n; i++) W.box(x - 0.2, y - L + 0.18 + i * w + 0.02, 12, 0.58, w - 0.04, 4, cs);
          W.box(x - 0.2, y - L + 0.3, 16, 0.1, 0.32, 9, cp);
          W.box(x - 0.4, y + L - 0.18, 12, 0.8, 0.18, 8, col);
        });
      }
    }
    function poster(axis, a0, a1, at, z0, z1, bg, lines, frame) {
      wallArt(axis, a0, a1, at, z0, z1, function () {
        if (frame) W.face(axis, a0 - 0.04, a1 + 0.04, at + 0.07, z0 - 3, z1 + 3, frame);
        W.face(axis, a0, a1, at + 0.075, z0, z1, bg);
        lines.forEach(function (L) {
          if (axis === 'x') W.faceText(L[0], a0 + 0.08, at + 0.08, z1 - L[1], 'x', L[2], L[3]);
          else W.faceText(L[0], at + 0.08, a1 - 0.08, z1 - L[1], 'y', L[2], L[3]);
        });
      });
    }
    function bricks(len, h, base, seed) {
      var s = 2, cv = document.createElement('canvas'); cv.width = Math.ceil(len * 32 * s); cv.height = Math.ceil(h * s);
      var c = cv.getContext('2d'); c.scale(s, s);
      c.fillStyle = '#CBB5A3'; c.fillRect(0, 0, len * 32, h);
      for (var row = 0, y = h; y > 0; y -= 6, row++) {
        for (var x = -(row % 2) * 8; x < len * 32; x += 16) {
          var k = hash(Math.round(x + 40), row, seed);
          c.fillStyle = shade(base, (k - 0.5) * 0.22 + (k > 0.94 ? -0.18 : 0));
          c.fillRect(x + 0.5, y - 5.5, 15, 5);
        }
      }
      var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,.14)'); g.addColorStop(0.25, 'rgba(0,0,0,0)'); g.addColorStop(0.9, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
      c.fillStyle = g; c.fillRect(0, 0, len * 32, h);
      return cv;
    }
    var BRICK_BACK_X = bricks(COLS, 92, '#A9573F', 3), BRICK_BACK_Y = bricks(ROWS, 92, '#A9573F', 5);
    var BRICK_FRONT_X = bricks(COLS, 30, '#9C4E39', 7), BRICK_FRONT_Y = bricks(ROWS, 30, '#9C4E39', 9);

    // ——— пол ———
    W.bakeGround(function (W, c) {
      F.floor(c, 0, 0, COLS, ROWS, 'concrete', '#C3BCAF');
      ROOMS.forEach(function (r) { F.floor(c, r.x0, r.y0, r.x1, r.y1, r.floor, r.col); });
      F.floor(c, 5, 14, 24, 18, 'concrete', '#CEC7BA');
      F.floor(c, 6, 1, 11, 6, 'parquet', '#BF9468');              // деревянный подиум под столами аккаунтов
      F.rug(c, 0.6, 2.6, 4.6, 5.6, '#7E3B33', '#5E2A24');          // кабинет директора
      F.rug(c, 15.6, 1.8, 19.4, 5.2, '#2F4858', '#22343F');        // переговорная
      F.rug(c, 0.8, 11.6, 5.4, 13.8, '#E8C468', '#C9A23F');        // креативная, под креслами-мешками
      F.rug(c, 15.6, 14.6, 19.6, 17.6, '#3F6E5D', '#2D5244');      // лаунж
      F.rug(c, 8.3, 16.9, 10.1, 17.9, '#5A4A3F', '#3E332B');       // коврик у двери
      F.rug(c, 0.8, 16.7, 4.4, 17.8, '#7C8A9E', '#5E6B7D');        // бухгалтерия
      ROOMS.forEach(function (r) { F.floorText(c, r.x0 + 0.25, r.y0 + 0.55, r.name); });
      F.floorText(c, 6.3, 15.3, 'ВХОД'); F.floorText(c, 19.7, 15.2, 'ЛАУНЖ');
    });

    // ——— стены: дальние кирпичные с окнами, внутренние низкие, переговорная стеклянная ———
    function wl(x0, y0, x1, y1, o) {
      var gaps = [], horiz = y0 === y1, a = horiz ? Math.min(x0, x1) : Math.min(y0, y1), b = horiz ? Math.max(x0, x1) : Math.max(y0, y1), oo = {};
      for (var k in o) oo[k] = o[k];
      for (var u = a; u < b; u++) if (DOORS[horiz ? 'h:' + u + ':' + y0 : 'v:' + x0 + ':' + u]) gaps.push(u);
      oo.gaps = gaps; W.wall(x0, y0, x1, y1, oo);
    }
    var back = { h: 92, col: '#A9573F', top: '#6E3426', dk: -200 }, front = { h: 30, col: '#9C4E39', top: '#6E3426' };
    var inner = { h: 34, col: '#ECE5DA', top: '#4A4F57' }, glass = { h: 34, col: '#C6DCE4', top: '#2F3439' };
    wl(0, 0, COLS, 0, back); wl(0, 0, 0, ROWS, back);
    wl(COLS, 0, COLS, ROWS, front); wl(0, ROWS, COLS, ROWS, front);
    ROOMS.forEach(function (r) {
      if (!r.glass) return;
      wl(r.x0, r.y1, r.x1, r.y1, glass); wl(r.x0, r.y0, r.x0, r.y1, glass);
    });
    ROOMS.forEach(function (r) {
      wl(r.x0, r.y0, r.x1, r.y0, inner); wl(r.x0, r.y1, r.x1, r.y1, inner);
      wl(r.x0, r.y0, r.x0, r.y1, inner); wl(r.x1, r.y0, r.x1, r.y1, inner);
    });
    // кирпич поверх дальних стен
    W.prop(-170, function () {
      onX(0, 0.062, 0, function (c) { c.drawImage(BRICK_BACK_X, 0, -92, COLS * 32, 92); });
      onY(0.062, ROWS, 0, function (c) { c.drawImage(BRICK_BACK_Y, 0, -92, ROWS * 32, 92); });
    });
    // трубы под потолком
    W.prop(-160, function () {
      W.box(0.2, 0.08, 82, COLS - 0.4, 0.09, 4, '#8E8478', { top: '#B5AC9F', left: '#8E8478', right: '#6E665C' });
      W.box(0.08, 0.2, 76, 0.09, ROWS - 0.4, 4, '#8E8478', { top: '#B5AC9F', left: '#7E766B', right: '#6E665C' });
    });
    // окна-лофт: чёрный переплёт, мелкая расстекловка, батарея под окном
    function loftWin(axis, a0, a1, z0, z1) {
      W.prop(-150, function () {
        var at = 0.066, glassCol = W.night ? '#2B3956' : '#A7CBE2';
        W.face(axis, a0 - 0.07, a1 + 0.07, at, z0 - 4, z1 + 4, '#2A2E33');
        W.face(axis, a0, a1, at + 0.002, z0, z1, glassCol);
        if (!W.night) {
          var I = W.iso.bind(W), d = at + 0.003;
          if (axis === 'x') W.poly([I(a0 + 0.08, d, z1), I(a0 + 0.42, d, z1), I(a0 + 0.08, d, z0 + 10)], 'rgba(255,255,255,.32)');
          else W.poly([I(d, a1 - 0.08, z1), I(d, a1 - 0.42, z1), I(d, a1 - 0.08, z0 + 10)], 'rgba(255,255,255,.28)');
        }
        var n = Math.max(2, Math.round((a1 - a0) / 0.5));
        for (var i = 1; i < n; i++) { var m = a0 + (a1 - a0) * i / n; W.face(axis, m - 0.018, m + 0.018, at + 0.004, z0, z1, '#2A2E33'); }
        for (var j = 1; j < 3; j++) { var zz = z0 + (z1 - z0) * j / 3; W.face(axis, a0, a1, at + 0.004, zz - 1, zz + 1, '#2A2E33'); }
        W.face(axis, a0 - 0.1, a1 + 0.1, at + 0.005, z0 - 6, z0 - 3, '#D9D2C7');
        var r0 = a0 + 0.1, r1 = a1 - 0.1;
        if (axis === 'x') W.box(r0, 0.07, 6, r1 - r0, 0.1, 14, '#EDE8E0', { top: '#FFFFFF', left: '#E4DED4', right: '#C9C3B9' });
        else W.box(0.07, r0, 6, 0.1, r1 - r0, 14, '#EDE8E0', { top: '#FFFFFF', left: '#D6D0C6', right: '#E4DED4' });
        for (var f = r0 + 0.08; f < r1 - 0.04; f += 0.12) W.face(axis, f, f + 0.03, 0.172, 7, 19, '#CFC9BF');
      });
    }
    loftWin('x', 0.6, 2.2, 34, 74); loftWin('x', 2.9, 4.5, 34, 74);
    loftWin('x', 5.5, 7.4, 30, 76); loftWin('x', 12.6, 14.5, 30, 76);
    loftWin('x', 20.6, 22.0, 36, 74); loftWin('x', 22.6, 23.8, 36, 74);
    loftWin('y', 6.3, 7.7, 34, 74); loftWin('y', 12.1, 13.7, 34, 74); loftWin('y', 15.6, 17.2, 34, 74);
    // кирпич на фасаде (передние стены видны снаружи, их рисуем последними)
    W.prop(99, function () {
      onX(0, ROWS + 0.062, 0, function (c) { c.drawImage(BRICK_FRONT_X, 0, -30, COLS * 32, 30); });
      onY(COLS + 0.062, ROWS, 0, function (c) { c.drawImage(BRICK_FRONT_Y, 0, -30, ROWS * 32, 30); });
      // дверь во двор на фасаде
      W.face('x', 8.55, 9.85, ROWS + 0.07, 0, 29, '#2A2E33');
      W.face('x', 8.62, 9.18, ROWS + 0.072, 2, 27, '#6B4A35'); W.face('x', 9.22, 9.78, ROWS + 0.072, 2, 27, '#6B4A35');
      W.face('x', 8.7, 9.1, ROWS + 0.074, 16, 25, W.night ? '#3B4A6A' : '#A7CBE2'); W.face('x', 9.3, 9.7, ROWS + 0.074, 16, 25, W.night ? '#3B4A6A' : '#A7CBE2');
      W.face('x', 9.05, 9.12, ROWS + 0.075, 10, 14, '#D9B55A'); W.face('x', 9.28, 9.35, ROWS + 0.075, 10, 14, '#D9B55A');
    });

    // ——— неоновая вывеска на дальней стене ———
    W.prop(-140, function (c) {
      var t = W.t, flick = Math.sin(t * 13) > 0.92 || (t % 7 > 6.7);
      W.face('x', 7.85, 12.2, 0.07, 58, 88, 'rgba(25,18,24,.55)');
      onX(8.05, 0.075, 76, function (c) {
        c.shadowColor = 'rgba(255,60,130,.95)'; c.shadowBlur = W.night ? 16 : 9;
        txt(c, 'Финал_Финал', 0, 0, '800 17px ' + FONT, '#FFD3E2');
        var w = c.measureText('Финал_Финал').width;
        c.shadowColor = flick ? 'rgba(0,0,0,0)' : 'rgba(255,60,130,.95)';
        txt(c, '_2', w + 1, 0, '800 17px ' + FONT, flick ? '#7A4A5A' : '#FFD3E2');
        c.shadowColor = 'rgba(80,200,255,.9)'; c.shadowBlur = W.night ? 10 : 6;
        txt(c, 'первого финала не было', 2, 13, '700 7px ' + FONT, '#D6F3FF');
      });
    });

    // ——— кабинет директора ———
    F.desk(3.0, 3, { w: 2.0, d: 0.8, col: '#5A3B2A', chairCol: '#1C1F24', papers: true, mugCol: '#C9A227', extra: function (c, x0, y0) {
      W.box(x0 + 0.2, y0 + 0.62, 25, 0.55, 0.1, 5, '#C9A227', { top: '#E8CB66' });
      W.faceText('СТАС', x0 + 0.26, y0 + 0.722, 27.5, 'x', '800 4.5px ' + FONT, '#3B2A10');
    } });
    sofa(0.62, 4.5, 'y', 1.7, '#7A4A35');
    F.plant(4.5, 5.4, 1, true); F.plant(0.5, 0.5, 0.9);
    // буфет с кубком «За смелость 2017» под окном
    W.block(2, 0, 4, 0);
    W.prop(3.3 + 0.35, function (c) {
      W.shadow(3.3, 0.4, 0.8, 0.12);
      W.box(2.4, 0.1, 0, 1.8, 0.48, 20, '#4A3326', { top: '#6B4A35' });
      W.face('x', 2.48, 3.28, 0.582, 4, 17, '#5A3F2E'); W.face('x', 3.32, 4.12, 0.582, 4, 17, '#5A3F2E');
      W.box(3.05, 0.22, 20, 0.3, 0.22, 4, '#2B2B2B');
      W.cyl(3.2, 0.33, 24, 0.07, 10, '#D4AF37', '#F2D675'); W.cyl(3.2, 0.33, 34, 0.15, 12, '#E2BE45', '#F7E08A');
      var l = W.iso(3.07, 0.33, 41), r = W.iso(3.33, 0.33, 41); c.strokeStyle = '#D4AF37'; c.lineWidth = 2;
      c.beginPath(); c.arc(l[0], l[1], 4, Math.PI * 0.5, Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(r[0], r[1], 4, -Math.PI * 0.5, Math.PI * 0.5); c.stroke();
      W.faceText('ЗА СМЕЛОСТЬ 2017', 2.52, 0.585, 11, 'x', '800 4.6px ' + FONT, '#E8CB66');
      W.box(3.65, 0.2, 20, 0.36, 0.06, 13, '#2A2E33'); W.face('x', 3.68, 3.98, 0.262, 22, 31, '#F4EFE6');
      W.box(2.55, 0.2, 20, 0.3, 0.06, 10, '#2A2E33'); W.face('x', 2.58, 2.82, 0.262, 22, 28, '#E8CB66');
    });
    // стена наград и табличка «Мы семья»
    W.prop(-130, function () {
      var fr = [[0.7, 1.4, 54, 72, '#E8CB66'], [1.55, 2.25, 54, 72, '#F4EFE6'], [2.4, 3.1, 54, 72, '#E8CB66'], [0.9, 1.6, 34, 50, '#F4EFE6'], [1.75, 2.45, 34, 50, '#C0C6CF'], [2.6, 3.2, 36, 50, '#F4EFE6']];
      fr.forEach(function (f, i) {
        W.face('y', f[0] - 0.05, f[1] + 0.05, 0.07, f[2] - 3, f[3] + 3, i % 2 ? '#2A2E33' : '#8A6A2F');
        W.face('y', f[0], f[1], 0.072, f[2], f[3], f[4]);
        W.face('y', f[0] + 0.12, f[1] - 0.12, 0.074, f[2] + 4, f[2] + 6, 'rgba(0,0,0,.25)');
      });
      W.face('y', 3.65, 5.3, 0.07, 50, 64, '#1F2328');
      W.faceText('МЫ СЕМЬЯ', 0.075, 5.18, 57, 'y', '800 9px ' + FONT, '#FFFFFF');
    });

    // ——— open space аккаунтов ———
    F.desk(7.2, 2, { w: 1.6, mugCol: '#2F5BD3', papers: true, chairCol: '#2F3540' });                         // Вера
    F.desk(9.8, 2, { w: 1.6, mugCol: '#9FD356', extra: function (c, x0, y0) { W.box(x0 + 0.15, y0 + 0.55, 25, 0.22, 0.14, 7, '#F2C6DE'); } }); // Ника
    F.desk(12.4, 2, { w: 1.6, mon: false, laptop: false, mug: false, chair: false, extra: function (c, x0, y0) {    // пустой стол
      W.poly([W.iso(x0 + 0.5, y0 + 0.45, 25), W.iso(x0 + 1.1, y0 + 0.45, 25), W.iso(x0 + 1.1, y0 + 0.4, 34), W.iso(x0 + 0.5, y0 + 0.4, 34)], '#FFFFFF');
      W.faceText('УШЛА В ИНХАУС', x0 + 0.53, y0 + 0.43, 30, 'x', '800 4.2px ' + FONT, '#E62020');
      W.cyl(x0 + 0.3, y0 + 0.3, 25, 0.1, 9, '#C46A42', '#5A3A28'); W.ell(x0 + 0.3, y0 + 0.3, 36, 0.1, '#8AA36B');
    } });
    F.chair(12.9, 1.0, 'n', '#2F3540');
    F.desk(7.2, 5, { w: 1.6, mugCol: '#8E44D8', chairCol: '#8E44D8', extra: function (c, x0, y0) { W.face('x', x0 + 0.95, x0 + 1.13, y0 + 0.232, 40, 46, '#FFE36E'); } }); // Женя
    F.desk(9.8, 5, { w: 1.6, mon: false, laptop: true, papers: true, mugCol: '#16A3B8' });
    F.printer(14.45, 6.45);
    F.plant(14.5, 0.6, 1.1, true); F.plant(5.5, 6.5, 0.9);
    // доска «Клиенты: статус»
    W.block(13, 5);
    W.prop(13.4 + 5.0, function (c) {
      W.shadow(13.4, 5.0, 0.6, 0.12);
      W.box(12.6, 4.98, 0, 0.05, 0.05, 64, '#3A3F47'); W.box(14.15, 4.98, 0, 0.05, 0.05, 64, '#3A3F47');
      W.box(12.55, 4.95, 18, 1.7, 0.06, 46, '#F8F8F6', { left: '#F8F8F6', right: '#C9CCD1', top: '#B8BCC2' });
      W.faceText('КЛИЕНТЫ: СТАТУС', 12.65, 5.012, 58, 'x', '800 6.2px ' + FONT, '#1C1313');
      ['Бурёнка в кедах', 'Саморезъ', 'Сеть', 'Тендер 2027'].forEach(function (s, i) {
        W.faceText(s, 12.82, 5.012, 49 - i * 8, 'x', '600 5px ' + FONT, '#2F3540');
        var p = W.iso(12.7, 5.012, 49 - i * 8); c.fillStyle = '#E62020'; c.beginPath(); c.arc(p[0], p[1], 2.6, 0, 7); c.fill();
      });
    });

    // ——— переговорная «Питч» ———
    F.table(17.5, 3.4, 1.0, 2.6, '#C69C6D', { leg: '#2F3439', items: function () {
      W.box(17.3, 2.3, 25, 0.4, 0.34, 7, '#E8EAED', { top: '#F8F9FA' }); W.cyl(17.5, 2.27, 28, 0.06, 0.01, '#1C1F24', '#3A6EA5');
      W.cyl(17.35, 3.6, 25, 0.06, 12, '#BFE6F7', '#2F5BD3'); W.cyl(17.7, 4.2, 25, 0.06, 12, '#BFE6F7', '#2F5BD3');
      W.box(17.2, 3.9, 25, 0.3, 0.22, 1.5, '#FFFFFF');
    } });
    [2.6, 3.4, 4.2].forEach(function (y) { F.chair(16.55, y, 'w', '#2F3540'); });
    [2.6, 3.4, 4.2].forEach(function (y) {
      W.prop(18.45 + y, function () { var x = 18.45; W.cyl(x, y, 0, 0.05, 10, '#3A3F47'); W.ell(x, y, 0, 0.22, 'rgba(0,0,0,.12)'); W.box(x - 0.2, y - 0.2, 10, 0.4, 0.4, 3, '#2F3540'); W.box(x + 0.19, y - 0.2, 10, 0.06, 0.4, 20, '#2F3540'); });
    });
    W.prop(-135, function () { // экран на стене и луч проектора
      W.face('x', 15.6, 19.4, 0.07, 26, 80, '#2A2E33');
      var on = (W.t % 11) > 1.2, scr = on ? '#F6F4EE' : '#D9D6CE';
      W.face('x', 15.68, 19.32, 0.072, 29, 77, scr);
      if (on) {
        W.face('x', 15.9, 17.2, 0.074, 50, 72, '#E62020');
        W.faceText('БУРЁНКА', 15.98, 0.076, 64, 'x', '800 8px ' + FONT, '#FFFFFF'); W.faceText('В КЕДАХ', 15.98, 0.076, 56, 'x', '800 8px ' + FONT, '#FFFFFF');
        W.faceText('ПИТЧ_финал_финал_2.pdf', 15.92, 0.076, 36, 'x', '700 5.5px ' + FONT, '#5B6B80');
        [[17.5, 70], [17.5, 62], [17.5, 54]].forEach(function (b, i) { W.face('x', b[0], b[0] + 1.5 - i * 0.35, 0.074, b[1] - 3, b[1], '#C9CCD1'); });
      } else W.faceText('НЕТ СИГНАЛА', 16.9, 0.076, 53, 'x', '800 7px ' + FONT, '#8A8F96');
    });
    W.prop(19.95, function () {
      if ((W.t % 11) <= 1.2) return;
      var I = W.iso.bind(W), L = I(17.5, 2.27, 31);
      W.ctx.globalAlpha = 0.13; W.poly([L, I(15.72, 0.08, 76), I(19.28, 0.08, 76), I(19.28, 0.08, 30), I(15.72, 0.08, 30)], '#FFF6D8'); W.ctx.globalAlpha = 1;
    });
    F.plant(15.5, 5.45, 0.9); F.plant(19.5, 5.45, 1, true);

    // ——— кухня ———
    // столешница по клеткам, чтобы человек у кофемашины не прятался за ней
    W.block(20, 0, 23, 0);
    [20, 21, 22, 23].forEach(function (u) {
      W.prop(u + 0.5 + 0.44, function () {
        var a = Math.max(20.1, u), b = Math.min(23.9, u + 1);
        W.box(a, 0.1, 0, b - a, 0.68, 30, '#2F5D50', { top: '#E9E2D4', left: '#2F5D50', right: '#244A40' });
        W.face('x', a + 0.06, b - 0.06, 0.782, 4, 26, '#356A5B');
        W.face('x', (a + b) / 2 - 0.08, (a + b) / 2 + 0.08, 0.784, 22, 23.5, '#C9A06A');
        if (u === 20) { // кофемашина
          W.box(20.35, 0.2, 30, 0.6, 0.48, 26, '#2B2F35', { top: '#4A4F57' });
          W.face('x', 20.45, 20.85, 0.682, 44, 52, '#1C1F24'); W.face('x', 20.5, 20.6, 0.684, 47, 49, W.t % 2 > 1 ? '#7FE3A0' : '#2E7D52');
          W.box(20.56, 0.5, 30, 0.2, 0.14, 4, '#9AA0A8'); W.cyl(20.66, 0.6, 34, 0.05, 5, '#FFFFFF', '#5A3A28');
          W.faceText('ФФ2', 20.47, 0.684, 58, 'x', '800 5px ' + FONT, '#E8CB66');
        }
        if (u === 21) { W.cyl(21.4, 0.45, 30, 0.06, 5, '#E62020', '#FFFFFF'); W.cyl(21.6, 0.5, 30, 0.06, 5, '#2F5BD3', '#FFFFFF'); W.cyl(21.5, 0.3, 30, 0.06, 5, '#F2C14E', '#FFFFFF'); }
        if (u === 22) { W.box(22.2, 0.25, 30, 0.7, 0.4, 3, '#C9CCD1', { top: '#DDE1E5' }); W.box(22.4, 0.32, 33, 0.3, 0.26, 1, '#7FA7C9'); }
        if (u === 23) W.box(23.2, 0.3, 30, 0.12, 0.12, 14, '#9AA0A8');
      });
    });
    W.prop(-128, function () { // полка с банками над столешницей
      W.box(22.3, 0.07, 80, 1.4, 0.22, 2.5, '#6B4A35');
      [['#F2C14E', 22.4], ['#E07A5F', 22.7], ['#9FD356', 23.0], ['#FFFFFF', 23.35]].forEach(function (j) { W.cyl(j[1] + 0.08, 0.17, 82.5, 0.07, 8, j[0], shade(j[0], -0.2)); });
    });
    F.fridge(23.55, 1.85, 'Молоко ФФ2', '#E9E6E0');
    F.table(22.6, 3.6, 1.2, 0.9, '#C69C6D', { items: function () { W.cyl(22.3, 3.5, 25, 0.06, 5, '#FFFFFF', '#6B4A35'); W.box(22.7, 3.7, 25, 0.3, 0.2, 2, '#F2C14E'); } });
    F.chair(22.3, 2.85, 'n', '#E07A5F'); F.chair(23.0, 2.85, 'n', '#2F5D50');
    // гонг и табличка над ним
    poster('y', 1.0, 3.2, 20, 5, 32, '#FFF8E6', [['БЬЁМ ЗА ВЫИГРАННЫЙ', 4.5, '800 5px ' + FONT, '#B3121A'], ['ТЕНДЕР', 9.5, '800 5px ' + FONT, '#B3121A'], ['За «клиенту всё', 14.5, '600 4.2px ' + FONT, '#1C1313'], ['понравилось, но…»', 19, '600 4.2px ' + FONT, '#1C1313'], ['не бьём', 23.5, '600 4.2px ' + FONT, '#1C1313']], '#6B4A35');
    W.block(20, 4); W.block(20, 5);
    W.prop(20 + 5.5 + 0.06, function (c) {
      W.shadow(20.7, 4.6, 0.45, 0.14);
      W.box(20.62, 4.05, 0, 0.08, 0.08, 46, '#5A3B2A'); W.box(20.62, 5.07, 0, 0.08, 0.08, 46, '#5A3B2A'); W.box(20.62, 4.05, 46, 0.08, 1.1, 4, '#6B4A35');
      W.box(20.5, 4.0, 0, 0.32, 0.2, 3, '#4A3326'); W.box(20.5, 5.0, 0, 0.32, 0.2, 3, '#4A3326');
      onY(20.68, 4.61, 26, function (c) {
        var g = c.createRadialGradient(-3, -4, 1, 0, 0, 13); g.addColorStop(0, '#F7DD84'); g.addColorStop(0.6, '#D4A63A'); g.addColorStop(1, '#8F6A1E');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 12.5, 0, 7); c.fill(); c.strokeStyle = '#7A5A18'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 5, 0, 7); c.stroke();
        c.strokeStyle = '#3A2A1C'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-6, -15); c.lineTo(-5, -11); c.moveTo(6, -15); c.lineTo(5, -11); c.stroke();
      });
      W.box(20.85, 4.95, 0, 0.05, 0.05, 20, '#6B4A35'); W.ell(20.87, 4.97, 21, 0.06, '#E62020');
    });
    // коробка с образцами клиента
    W.block(23, 5);
    W.prop(23.4 + 5.4, function () {
      W.shadow(23.4, 5.4, 0.45, 0.14);
      W.box(23.0, 5.05, 0, 0.8, 0.7, 14, '#C9A06A', { top: '#B48A55' });
      W.face('x', 23.05, 23.75, 5.752, 4, 11, '#E62020'); W.faceText('БУРЁНКА В КЕДАХ', 23.08, 5.754, 7.5, 'x', '800 3.8px ' + FONT, '#FFFFFF');
      [[23.15, 5.2], [23.4, 5.2], [23.62, 5.2], [23.15, 5.45], [23.4, 5.45]].forEach(function (b, i) { W.cyl(b[0], b[1], 14, 0.07, i === 2 ? 14 : 9, i === 2 ? '#2F5BD3' : '#FFFFFF', i === 2 ? '#E62020' : '#E8E2D6'); });
      W.box(23.1, 5.3, 0, 0.6, 0.3, 0.1, '#C9A06A');
    });

    // ——— креативная ———
    W.prop(-125, function (c) { // стена референсов на кирпиче
      W.face('y', 8.35, 11.75, 0.07, 18, 82, '#7A5638');
      W.face('y', 8.42, 11.68, 0.072, 21, 79, '#B98E5F');
      var cols = ['#FFFFFF', '#F2C14E', '#E07A5F', '#3D85C6', '#9FD356', '#F2C6DE', '#1C1313', '#E62020'];
      for (var i = 0; i < 26; i++) {
        var a = 8.5 + hash(i, 1, 11) * 2.8, z = 24 + hash(i, 2, 11) * 46, w = 0.25 + hash(i, 3, 11) * 0.3, h = 7 + hash(i, 4, 11) * 9;
        W.face('y', a, Math.min(11.62, a + w), 0.074 + i * 0.0004, z, Math.min(77, z + h), cols[i % cols.length]);
        var p = W.iso(0.08, a + w / 2, Math.min(77, z + h) - 1.5); c.fillStyle = '#E62020'; c.beginPath(); c.arc(p[0], p[1], 1.1, 0, 7); c.fill();
      }
      onY(0.08, 11.55, 74, function (c) { c.strokeStyle = 'rgba(230,32,32,.8)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(10, 8); c.lineTo(46, 22); c.lineTo(70, 6); c.lineTo(92, 30); c.stroke(); });
    });
    poster('x', 0.4, 2.5, 8, 6, 31, '#1C1313', [['ВИРУСНОСТЬ', 6, '800 6px ' + FONT, '#FFD447'], ['запланировать нельзя.', 13, '600 4.6px ' + FONT, '#FFFFFF'], ['Дедлайн можно.', 20, '800 4.6px ' + FONT, '#FFFFFF']], '#FFD447');
    // полка с дипломами шорт-листов
    W.block(2, 8); W.block(3, 8); W.block(4, 8);
    W.prop(4 + 0.5 + 8 + 0.06, function () {
      W.box(2.85, 8.08, 0, 1.8, 0.38, 18, '#3A3F47', { top: '#4A4F57' });
      W.faceText('ШОРТ-ЛИСТЫ', 2.95, 8.462, 9, 'x', '800 4.6px ' + FONT, '#E8CB66');
      for (var i = 0; i < 5; i++) { var x = 2.95 + i * 0.33; W.box(x, 8.2, 18, 0.28, 0.04, 12 + (i % 2) * 3, '#2A2E33'); W.face('x', x + 0.03, x + 0.25, 8.242, 20, 28 + (i % 2) * 3, i === 2 ? '#E8CB66' : '#F4EFE6'); }
    });
    // флипчарт с недорисованной коровой
    W.block(2, 10);
    W.prop(2.4 + 10.2, function () {
      var x = 2.4, y = 10.2;
      W.box(x - 0.5, y - 0.04, 0, 0.06, 0.06, 64, '#5A4634'); W.box(x + 0.44, y - 0.04, 0, 0.06, 0.06, 64, '#5A4634'); W.box(x - 0.03, y - 0.3, 0, 0.06, 0.06, 60, '#5A4634');
      W.box(x - 0.56, y - 0.03, 20, 1.12, 0.06, 46, '#FFFFFF', { left: '#FAFAF8', top: '#E6E6E2' });
      W.faceText('А ЧТО, ЕСЛИ…', x - 0.48, y + 0.035, 60, 'x', '800 5.5px ' + FONT, '#E62020');
      onX(x - 0.45, y + 0.036, 30, function (c) {
        c.strokeStyle = '#1C1313'; c.lineWidth = 1.1; c.lineCap = 'round';
        c.beginPath(); c.ellipse(12, -10, 9, 5.5, 0, Math.PI * 0.15, Math.PI * 1.25); c.stroke();     // полкоровы
        c.beginPath(); c.moveTo(7, -5); c.lineTo(7, 1); c.moveTo(11, -4.5); c.lineTo(11, 1.5); c.stroke();
        c.beginPath(); c.arc(3, -14, 3, Math.PI * 0.5, Math.PI * 1.8); c.stroke();
        c.fillStyle = '#1C1313'; c.beginPath(); c.arc(13, -11, 1.6, 0, 7); c.fill();
        c.setLineDash([1.5, 2]); c.beginPath(); c.moveTo(20, -10); c.lineTo(28, -10); c.stroke(); c.setLineDash([]);
        txt(c, '?', 30, -10, '800 7px ' + FONT, '#E62020');
      });
    });
    F.beanbag(1.4, 12.3, '#E07A5F'); F.beanbag(2.3, 13.4, '#3D85C6'); F.beanbag(4.4, 12.4, '#F2C14E');
    F.table(3.0, 12.45, 0.5, 0.5, '#FFFFFF', { leg: '#C9CCD1', items: function () { W.cyl(2.92, 12.4, 25, 0.06, 5, '#F2C14E', '#5A3A28'); } });
    // пёс Дедлайн на лежанке
    W.prop(5.8 + 12.9, function (c) {
      var p = W.iso(5.8, 12.9, 0), br = Math.sin(W.t * 2) * 0.6;
      c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(p[0], p[1], 21, 9, 0, 0, 7); c.fill();
      c.fillStyle = '#8A4F7D'; c.beginPath(); c.ellipse(p[0], p[1] - 3, 19, 8.5, 0, 0, 7); c.fill();
      c.fillStyle = '#B57BA6'; c.beginPath(); c.ellipse(p[0], p[1] - 4, 14, 5.6, 0, 0, 7); c.fill();
      c.fillStyle = '#C98F55'; c.beginPath(); c.ellipse(p[0] - 1, p[1] - 8 - br, 10, 5.5 + br * 0.3, 0, 0, 7); c.fill();
      c.beginPath(); c.ellipse(p[0] + 8, p[1] - 9, 5, 4.4, 0, 0, 7); c.fill();
      c.fillStyle = '#9A6A3A'; c.beginPath(); c.ellipse(p[0] + 6, p[1] - 11.5, 2.2, 3.4, 0.5, 0, 7); c.fill();
      c.fillStyle = '#1C1313'; c.beginPath(); c.arc(p[0] + 12.5, p[1] - 8.6, 1.1, 0, 7); c.fill();
      c.strokeStyle = '#1C1313'; c.lineWidth = 0.8; c.beginPath(); c.arc(p[0] + 9, p[1] - 9.6, 1.3, 0.1, Math.PI - 0.1); c.stroke();
      if (!W.night || true) { c.fillStyle = 'rgba(28,19,19,.55)'; c.font = '700 7px ' + FONT; c.textAlign = 'left'; c.fillText('z', p[0] + 13, p[1] - 17 - (W.t * 6 % 6)); }
    });
    F.plant(6.45, 8.55, 1.1, true); F.plant(0.55, 13.45, 0.9);

    // ——— продакшн ———
    F.desk(9.6, 11, { w: 1.6, mugCol: '#E25D8B', chairCol: '#E25D8B', extra: function (c, x0, y0) { // второй монитор и стикер
      var mx = x0 + 1.42;
      W.box(mx - 0.04, y0 + 0.28, 25, 0.08, 0.08, 6, '#30353C'); W.box(mx - 0.17, y0 + 0.24, 30, 0.34, 0.07, 15, '#262A31', { left: '#3A3F48' });
      W.face('x', mx - 0.15, mx + 0.15, y0 + 0.235, 32, 43, W.night ? '#B9A6FF' : '#A68BFF');
      W.face('x', x0 + 0.42, x0 + 0.58, y0 + 0.232, 40, 46, '#FFE36E');
    } });
    F.desk(11.6, 11, { w: 1.6, mugCol: '#1C1313', chairCol: '#1C1313', mug: true });
    W.prop(10.6 + 11.62, function (c) { // тёплая видеокарта
      W.shadow(10.6, 11.6, 0.2, 0.15);
      W.box(10.47, 11.45, 0, 0.26, 0.34, 20, '#1C1F24', { top: '#30353C' });
      W.face('x', 10.5, 10.7, 11.792, 3, 17, '#2A1A1A');
      var g = 0.5 + Math.sin(W.t * 3) * 0.25; W.face('x', 10.52, 10.68, 11.794, 4, 16, 'rgba(255,' + Math.round(90 + g * 60) + ',40,' + (0.55 + g * 0.3) + ')');
      var p = W.iso(10.6, 11.6, 24); c.strokeStyle = 'rgba(255,140,60,.55)'; c.lineWidth = 1;
      for (var i = 0; i < 3; i++) { var o = (W.t * 8 + i * 5) % 14; c.beginPath(); c.moveTo(p[0] - 4 + i * 4, p[1] - o); c.quadraticCurveTo(p[0] - 2 + i * 4, p[1] - o - 3, p[0] - 4 + i * 4, p[1] - o - 6); c.stroke(); }
    });
    // стопка распечаток с коровами
    W.prop(13.3 + 9.7, function () {
      [[12.9, 9.4, 9], [13.4, 9.55, 6], [13.15, 10.0, 12]].forEach(function (s) {
        W.box(s[0] - 0.2, s[1] - 0.15, 0, 0.4, 0.3, s[2], '#F4F1EA', { top: '#FFFFFF' });
        W.box(s[0] - 0.12, s[1] - 0.08, s[2], 0.1, 0.08, 0.2, '#1C1313'); W.box(s[0] + 0.04, s[1] + 0.02, s[2], 0.08, 0.06, 0.2, '#1C1313');
      });
    });
    W.block(12, 9); W.block(13, 9); W.block(13, 10);
    F.beanbag(12.9, 13.0, '#9FD356');
    poster('x', 8.3, 9.6, 9, 8, 30, '#FFE36E', [['СЧИТАТЬ НОГИ', 6, '800 5px ' + FONT, '#1C1313'], ['Коровы: 4. Люди: 2.', 13, '600 4.2px ' + FONT, '#1C1313'], ['Пальцы: 5.', 19, '600 4.2px ' + FONT, '#1C1313']]);
    F.plant(8.5, 13.45, 0.9);

    // ——— перформанс ———
    F.desk(19.5, 11, { w: 3.0, cx: 1.25, mon: false, mugCol: '#2F7D6D', chairCol: '#2F7D6D', extra: function (c, x0, y0) { // шесть мониторов слева от Тимура
      var cols = ['#7FB2FF', '#7FE3A0', '#FFB86B'];
      [x0 + 0.4, x0 + 1.15, x0 + 1.9].forEach(function (mx, i) {
        W.box(mx - 0.04, y0 + 0.3, 25, 0.08, 0.06, 32, '#30353C');
        [[30, 17], [52, 17]].forEach(function (zz, j) {
          W.box(mx - 0.35, y0 + 0.24, zz[0], 0.7, 0.07, zz[1], '#262A31', { left: '#3A3F48' });
          var sc = W.night ? shade(cols[(i + j) % 3], 0.25) : cols[(i + j) % 3];
          W.face('x', mx - 0.33, mx + 0.33, y0 + 0.235, zz[0] + 2, zz[0] + zz[1] - 2, '#1E2430');
          for (var k = 0; k < 4; k++) W.face('x', mx - 0.28 + k * 0.15, mx - 0.18 + k * 0.15, y0 + 0.233, zz[0] + 3, zz[0] + 5 + hash(i * 7 + j, k, 3) * 9, sc);
        });
      });
      W.face('x', x0 + 2.0, x0 + 2.2, y0 + 0.231, 32, 38, '#FFE36E');
      W.faceText('KEDY20?', x0 + 2.01, y0 + 0.229, 35, 'x', '800 2.6px ' + FONT, '#1C1313');
      W.box(x0 + 2.45, y0 + 0.3, 25, 0.36, 0.24, 1.4, '#C9CED6'); W.face('x', x0 + 2.45, x0 + 2.81, y0 + 0.3, 26, 36, '#B8BEC7');
    } });
    F.desk(16.8, 11, { w: 1.2, d: 0.7, mon: false, laptop: true, mugCol: '#FFB86B', chairCol: '#3A3F47' });
    wallArt('x', 15.25, 16.95, 9, 6, 31, function () { // график ставок
      W.face('x', 15.25, 16.95, 9.07, 6, 31, '#1C1F24'); W.face('x', 15.3, 16.9, 9.072, 8, 29, '#F8F8F6');
      W.faceText('СТАВКИ', 15.36, 9.074, 26, 'x', '800 4.6px ' + FONT, '#1C1313');
      onX(15.36, 9.074, 10, function (c) { c.strokeStyle = '#E62020'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(2, -1); c.lineTo(12, -3); c.lineTo(20, -2); c.lineTo(28, -6); c.lineTo(36, -9); c.lineTo(44, -13); c.lineTo(50, -12); c.stroke(); c.fillStyle = '#E62020'; c.beginPath(); c.arc(50, -12, 1.4, 0, 7); c.fill(); });
    });
    wallArt('x', 21.2, 23.6, 9, 8, 30, function () { // вредный совет месяца, зачёркнутый
      W.face('x', 21.2, 23.6, 9.07, 8, 30, '#FFFFFF');
      W.faceText('ВРЕДНЫЙ СОВЕТ МЕСЯЦА:', 21.27, 9.074, 26, 'x', '800 4.2px ' + FONT, '#1C1313');
      W.faceText('сливайте весь бюджет', 21.27, 9.074, 19, 'x', '600 4.2px ' + FONT, '#1C1313');
      W.faceText('в первый день', 21.27, 9.074, 13, 'x', '600 4.2px ' + FONT, '#1C1313');
      onX(21.25, 9.075, 8, function (c) { c.strokeStyle = 'rgba(230,32,32,.85)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(2, -4); c.lineTo(72, -20); c.moveTo(2, -20); c.lineTo(72, -4); c.stroke(); });
    });
    F.plant(15.5, 13.45, 1, true); F.plant(23.5, 13.45, 0.9); F.plant(23.5, 9.55, 0.9);
    sofa(22.0, 13.0, 'x', 1.8, '#2F7D6D');

    // ——— бухгалтерия ———
    F.desk(2.6, 16, { w: 1.6, papers: true, mugCol: '#5E7D4E', chairCol: '#3A3F47', extra: function (c, x0, y0) {
      W.box(x0 + 1.05, y0 + 0.5, 25, 0.34, 0.24, 3, '#B3121A', { top: '#E62020' }); W.box(x0 + 1.07, y0 + 0.52, 28, 0.3, 0.2, 0.3, '#FFFFFF');
      W.cyl(x0 + 0.2, y0 + 0.62, 25, 0.04, 7, '#2F5BD3', '#2F5BD3');
    } });
    F.cabinet(0.07, 14.3, 'y', 1.25, ['ОРД', 'Акты']);
    F.cabinet(3.55, 14.07, 'x', 1.3, ['Договоры', 'Счета']);
    poster('x', 0.7, 2.4, 14, 8, 31, '#FFFFFF', [['НЕ ОПЛАТИЛИ', 6, '800 5px ' + FONT, '#B3121A'], ['Бурёнка: октябрь', 13, '600 4.2px ' + FONT, '#1C1313'], ['Саморезъ: всё', 19, '600 4.2px ' + FONT, '#1C1313']], '#B3121A');
    F.plant(0.5, 17.45, 0.9);

    // ——— вход и лаунж ———
    F.coats(5.5, 14.5);
    W.block(9, 14); W.block(10, 14);
    W.prop(10.1 + 14.5, function (c) { // велосипед у стены
      var I = W.iso.bind(W), a = I(9.6, 14.35, 9), b = I(10.75, 14.35, 9), s = I(10.05, 14.35, 22), h = I(10.55, 14.35, 24);
      c.strokeStyle = '#2A2E33'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(a[0], a[1], 9, 9.5, 0.45, 0, 7); c.stroke(); c.beginPath(); c.ellipse(b[0], b[1], 9, 9.5, 0.45, 0, 7); c.stroke();
      c.strokeStyle = '#E62020'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(s[0], s[1]); c.lineTo(h[0], h[1]); c.lineTo(b[0], b[1]); c.moveTo(s[0], s[1]); c.lineTo(I(10.2, 14.35, 9)[0], I(10.2, 14.35, 9)[1]); c.lineTo(a[0], a[1]); c.stroke();
      c.fillStyle = '#1C1313'; c.fillRect(s[0] - 4, s[1] - 3, 8, 2.5); c.fillRect(h[0] - 1, h[1] - 3, 7, 2);
    });
    sofa(17.6, 15.2, 'x', 2.4, '#E07A5F');
    F.table(17.6, 16.6, 1.3, 0.6, '#3A3F47', { leg: '#2A2E33', items: function () { W.box(17.2, 16.45, 25, 0.35, 0.25, 1.5, '#F4EFE6'); W.cyl(18.0, 16.6, 25, 0.06, 5, '#FFFFFF', '#6B4A35'); } });
    F.beanbag(19.4, 16.9, '#3D85C6');
    // телефонная будка
    W.block(23, 14); W.block(23, 15);
    W.prop(23.45 + 15.1, function () {
      W.shadow(23.45, 14.65, 0.6, 0.16);
      W.box(23.0, 14.15, 0, 0.9, 1.0, 66, '#2F5D50', { top: '#3E7565', left: '#2F5D50', right: '#244A40' });
      W.face('y', 14.3, 15.0, 23.002, 6, 58, '#244A40');
      W.face('x', 23.08, 23.82, 15.152, 4, 60, '#1F2328');
      W.face('x', 23.13, 23.77, 15.154, 7, 57, W.night ? '#E8C27A' : '#B9D4DE');
      W.face('x', 23.67, 23.71, 15.156, 26, 36, '#C9CCD1');
      W.faceText('ТИХО', 23.16, 15.156, 52, 'x', '800 5.5px ' + FONT, '#1C1313');
    });
    F.plant(12.6, 17.45, 1.1, true); F.plant(23.45, 17.45, 1, true); F.plant(5.55, 17.45, 0.9); F.plant(14.5, 17.45, 0.9);
    F.plant(0.55, 7.5, 0.9); F.plant(19.5, 8.5, 0.9);

    // ——— люди ———
    var P = function (shirt, pants, skin, hair, style, acc, seed) { return { shirt: shirt, pants: pants, skin: skin, hair: hair, style: style, acc: acc, seed: seed }; };
    var npcs = {
      stas: { id: 'stas', name: 'Стас', role: 'основатель и директор агентства', x: 3.0, y: 2.28, pose: 'sit', dk: 0.01, ax: 3.0, ay: 4.45,
        look: P('#26272C', '#4A4F57', '#EBC4A6', '#9C9C9C', 'short', 'glasses', 11),
        lines: ['Берём. Это наш шанс.', 'Сделай чуть больше, чем договорились. Клиент оценит.', 'Мы же команда. Давай без графика.'] },
      lev: { id: 'lev', name: 'Лев', role: 'креативный директор', x: 5.35, y: 10.45, pose: 'stand', face: 1, flip: -1, ax: 5.3, ay: 11.45,
        look: P('#D9822B', '#2F3540', '#F0C7A6', '#3B2A20', 'cap', null, 12),
        lines: ['Сто идей она выдаст. А кто скажет, какая из ста хорошая?', 'Мне нужна неделя на инсайт. Ладно, ночь.', 'Вирусность запланировать нельзя. Можно запланировать, чтобы потом не было стыдно.'] },
      margo: { id: 'margo', name: 'Марго', role: 'дизайнер и оператор нейросетей', x: 9.6, y: 10.28, pose: 'sit', dk: 0.01, ax: 9.6, ay: 12.45,
        look: P('#E25D8B', '#2B2F3A', '#F5D3BC', '#1E1A18', 'bob', null, 13),
        lines: ['У коровы снова шесть ног. Пятую я уже убрала.', 'Логотип на каждом кадре плывёт по-своему. Клиент заметит первым.', 'Сгенерировать быстро. Исправлять долго.'] },
      gosha: { id: 'gosha', name: 'Гоша', role: 'моушн-дизайнер', x: 11.6, y: 10.28, pose: 'sit', dk: 0.01, ax: 11.6, ay: 12.45,
        look: P('#1F2328', '#3E5A8C', '#E8B894', '#F2D16B', 'short', 'phones', 14),
        lines: ['Рендер идёт сорок минут. Правка две секунды. Потом снова рендер.', 'Видеокарта греет лучше батареи. Управляющая компания в курсе.', 'Наушники я ношу без музыки. Так ко мне реже подходят.'] },
      timur: { id: 'timur', name: 'Тимур', role: 'таргетолог', x: 20.75, y: 10.28, pose: 'sit', dk: 0.01, ax: 20.6, ay: 12.45,
        look: P('#2F7D6D', '#22262E', '#D9A982', '#1E1A18', 'short', 'glasses', 15),
        lines: ['Ставки перегрелись. Тот же клик стоит в полтора раза дороже.', 'Я лью трафик на карточку, которой нет в наличии. Это нормально? Нет.', 'Объявление на модерации. До старта сорок минут.'] },
      vera: { id: 'vera', name: 'Вера', role: 'руководитель SMM', x: 7.2, y: 1.28, pose: 'sit', dk: 0.01, ax: 7.2, ay: 3.45,
        look: P('#2F5BD3', '#2B2F3A', '#F3CDB4', '#A0522D', 'long', null, 16),
        lines: ['Мне написали из «Бурёнки в кедах». Говорят, у них по пятницам ничего не горит.', 'Я всё время занята и не понимаю, куда расту.', 'Отчёт я сделаю. Мне бы хотелось отвечать за результат.'] },
      nika: { id: 'nika', name: 'Ника', role: 'младший SMM-специалист', x: 9.8, y: 1.28, pose: 'sit', dk: 0.01, ax: 9.8, ay: 3.45, phone: true,
        look: P('#9FD356', '#3E4A6B', '#F6D7C3', '#E58FB6', 'bun', null, 17),
        lines: ['Это вайб. Но не наш вайб.', 'Напишите текстом, кружочки я не смотрю.', 'В субботу меня нет. Это часть моего лора.'] },
      lyuda: { id: 'lyuda', name: 'Людмила Сергеевна', role: 'бухгалтер и немного юрист', x: 2.6, y: 15.28, pose: 'sit', dk: 0.01, ax: 2.6, ay: 17.35,
        look: P('#6B7F4E', '#3B2F3F', '#F3CDB4', '#8A4A2C', 'bob', 'glasses', 18),
        lines: ['Без ИНН рекламодателя токен не дадут. ИНН я у них просила в октябре.', '«Бурёнка в кедах» не оплатила октябрь. Пометила красным.', 'Поменяли картинку? Значит, это новый креатив. И новый токен.'] }
    };
    var spots = {
      pc: { id: 'pc', label: 'Ваш компьютер', x: 7.2, y: 6.35, tx: 7.2, ty: 4.9, tz: 54, hx: 7.2, hy: 5.0, hr: 0.7 },
      board: { id: 'board', label: 'Доска «Клиенты: статус»', x: 13.4, y: 6.3, tx: 13.4, ty: 5.0, tz: 70, hx: 13.4, hy: 5.0, hr: 0.6 },
      screen: { id: 'screen', label: 'Экран для созвонов', x: 17.5, y: 1.35, tx: 17.5, ty: 0.1, tz: 84, hx: 17.5, hy: 0.6, hr: 0.8 },
      coffee: { id: 'coffee', label: 'Кофемашина', x: 20.85, y: 1.45, tx: 20.65, ty: 0.45, tz: 62, hx: 20.65, hy: 0.45, hr: 0.5 },
      samples: { id: 'samples', label: 'Образцы «Бурёнки»', x: 23.3, y: 6.4, tx: 23.4, ty: 5.4, tz: 36, hx: 23.4, hy: 5.4, hr: 0.5 },
      gong: { id: 'gong', label: 'Гонг', x: 21.45, y: 4.75, tx: 20.7, ty: 4.6, tz: 56, hx: 20.7, hy: 4.6, hr: 0.5, hideRing: true },
      awards: { id: 'awards', label: 'Стена наград', x: 0.9, y: 1.8, tx: 0.1, ty: 1.9, tz: 84, hx: 0.4, hy: 1.9, hr: 0.7, hideRing: true },
      flip: { id: 'flip', label: 'Флипчарт с коровой', x: 2.4, y: 11.35, tx: 2.4, ty: 10.2, tz: 72, hx: 2.4, hy: 10.2, hr: 0.35, hideRing: true },
      dog: { id: 'dog', label: 'Пёс Дедлайн', x: 5.8, y: 13.6, tx: 5.8, ty: 12.9, tz: 30, hx: 5.8, hy: 12.9, hr: 0.5, hideRing: true },
      gpu: { id: 'gpu', label: 'Тёплая видеокарта', x: 10.6, y: 12.4, tx: 10.6, ty: 11.6, tz: 34, hx: 10.6, hy: 11.6, hr: 0.3, hideRing: true },
      chart: { id: 'chart', label: 'График ставок', x: 16.1, y: 9.6, tx: 16.1, ty: 9.05, tz: 40, hx: 16.1, hy: 9.2, hr: 0.4, hideRing: true },
      ledger: { id: 'ledger', label: 'Стол бухгалтерии', x: 4.3, y: 15.7, tx: 3.4, ty: 15.9, tz: 44, hx: 3.4, hy: 16.0, hr: 0.35 },
      booth: { id: 'booth', label: 'Телефонная будка', x: 23.4, y: 16.3, tx: 23.45, ty: 14.7, tz: 84, hx: 23.45, hy: 14.7, hr: 0.6 },
      exit: { id: 'exit', label: 'Выход во двор', x: 9.2, y: 17.4, tx: 9.2, ty: 17.9, tz: 42 }
    };

    // квест может перенести людей и включить ночь
    var Qx = null;
    try { var qid = new URLSearchParams(location.search).get('q'); Qx = window.KV && KV.quests && KV.quests[qid]; } catch (e) {}
    if (Qx && Qx.side === 'agency') {
      W.night = !!Qx.night;
      var pl = Qx.places || {};
      Object.keys(pl).forEach(function (id) {
        var n = npcs[id], o = pl[id]; if (!n) return;
        Object.keys(o).forEach(function (k) { if (k === 'coat') { var lk = {}; for (var q in n.look) lk[q] = n.look[q]; lk.shirt = o.coat; n.look = lk; } else n[k] = o[k]; });
      });
    }

    return {
      cols: COLS, rows: ROWS, name: '«Финал Финал 2»', start: [7.6, 6.5], bg: '#2F2B2E',
      look: { shirt: '#8E44D8', pants: '#3E5A8C', skin: '#EBC0A0', hair: '#C9773A', style: 'curly', acc: null, seed: 10 },
      npcs: npcs, spots: spots,
      lights: [[10, 0.4, 74, 190, 'rgba(255,90,150,.42)'], [7.2, 5, 40, 120], [7.2, 2, 40, 100], [9.8, 2, 40, 100], [13.4, 5, 50, 90],
        [2.6, 3, 50, 120], [17.5, 1.2, 50, 140, 'rgba(255,246,216,.45)'], [21.5, 2, 50, 130], [3, 11, 50, 140], [10.6, 11, 40, 130],
        [19.5, 10.6, 50, 150, 'rgba(130,180,255,.45)'], [2.6, 16, 40, 110], [17.6, 15.8, 50, 130], [23.45, 15, 60, 90], [9.2, 17.6, 40, 80]],
      defaults: {
        pc: 'Ваш компьютер. На мониторе стикер: «финал_финал_2_точно_последний_v3.psd». В рабочем чате «ФФ2 | общий» сорок непрочитанных.',
        board: ['Доска «Клиенты: статус». Четыре клиента, четыре красных магнита.', 'Зелёных магнитов в офисе нет. Говорят, их ни разу не покупали.'],
        screen: ['Экран для созвонов. Проектор включается с третьего раза.', 'Раз. Два. Три. Включился и показывает «Нет сигнала».'],
        samples: ['Коробка образцов «Бурёнки в кедах» после питча: йогурты, кефир и одна бутылка «Бурёнка Протеин».', 'Когда кончается молоко для кофемашины, выручают образцы клиента. Клиент об этом не знает.'],
        gong: ['Гонг. Табличка: «Бьём за выигранный тендер. За „клиенту всё понравилось, но…“ не бьём».', 'Вы тянетесь к палочке. Табличка над гонгом смотрит строго.'],
        awards: ['Стена наград и кубок «За смелость 2017». За что именно, Стас не помнит. Но смелость была.', 'Табличка «Мы семья». Висит над диваном, на котором Стас обсуждает премии.'],
        flip: ['Флипчарт. Корова нарисована до половины, дальше надпись «А что, если…» и вопросительный знак.', 'Под коровой три стрелки и слово «инсайт», дважды зачёркнутое.'],
        dog: ['Пёс Дедлайн спит. Единственный в агентстве, кто спит по ночам.', 'Дедлайн приоткрывает глаз, видит, что вы без еды, и закрывает обратно.'],
        gpu: ['Тёплая видеокарта у стола Марго. Зимой об неё греют руки.', 'Видеокарта гудит. Похоже, рисует корове шестую ногу.'],
        chart: ['График ставок. Линия идёт вверх, как будто это хорошо.', 'Рядом плакат, зачёркнутый красным: «Вредный совет месяца: сливайте весь бюджет в первый день».'],
        ledger: ['Стол бухгалтерии. Ежедневник с красными пометками: кто не заплатил. «Бурёнка в кедах» подчёркнута дважды.', 'Папка «ОРД». Толстая. Людмила Сергеевна знает её наизусть.'],
        booth: ['Телефонная будка. Внутри тихо и пахнет чужим стрессом.', 'На стекле наклейка: «Созвоны с клиентом не дольше часа». Ниже от руки: «ха-ха».']
      }
    };
  };
})();
