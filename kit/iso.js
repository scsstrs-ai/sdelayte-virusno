/* Изометрический движок «Сделайте вирусно»: карта клеток, глубина, люди, пути, камера, ночь */
(function () {
  'use strict';
  var TW = 64, TH = 32, R2 = Math.SQRT2;

  function shade(hex, k) {
    var r, g, b;
    if (hex.charAt(0) === '#') { var n = parseInt(hex.slice(1), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
    else { var m = hex.match(/[d.]+/g) || [0, 0, 0]; r = +m[0]; g = +m[1]; b = +m[2]; }
    if (k >= 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  function hash(x, y, s) {
    var h = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function dot(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  function wrap(text, n) {
    var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) { if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur) lines.push(cur);
    return lines.slice(0, 4);
  }

  function World(o) {
    var W = this;
    W.o = o; W.cols = o.cols; W.rows = o.rows; W.ext = o.ext || 0; W.top = o.top || 160;
    W.cv = o.canvas; W.ctx = W.cv.getContext('2d'); W.stage = o.stage;
    W.solid = []; for (var y = 0; y < W.rows; y++) W.solid.push(new Array(W.cols).fill(false));
    W.props = []; W.npcs = []; W.spots = []; W.lights = []; W.bubbles = []; W.edges = {};
    W.player = { x: o.start[0], y: o.start[1], look: o.look, face: 1, flip: 1, walk: 0, path: null, pending: null, moving: false, me: true };
    W.cam = { x: 0, y: 0 }; W.zoom = 1; W.vw = 300; W.vh = 300; W.dpr = 1; W.t = 0;
    W.keys = {}; W.night = false; W.near = null; W.hoverSpot = null; W.tap = null; W.paused = false; W.chatAt = 4;
    var ex = W.ext;
    W.bounds = { x0: -(W.rows + ex) * TW / 2 - 24, x1: (W.cols + ex) * TW / 2 + 24, y0: -W.top, y1: (W.cols + W.rows + 2 * ex) * TH / 2 + 24 };
  }
  var P = World.prototype;
  P.shade = shade; P.hash = hash; P.rr = rr; P.dot = dot;
  P.iso = function (x, y, z) { return [(x - y) * TW / 2, (x + y) * TH / 2 - (z || 0)]; };
  P.inb = function (x, y) { return x >= 0 && y >= 0 && x < this.cols && y < this.rows; };
  P.walk = function (x, y) { return this.inb(x, y) && !this.solid[y][x]; };
  P.block = function (x0, y0, x1, y1) { for (var y = y0; y <= (y1 == null ? y0 : y1); y++) for (var x = x0; x <= (x1 == null ? x0 : x1); x++) if (this.inb(x, y)) this.solid[y][x] = true; };
  P.free = function (x, y, r) {
    if (!(this.walk(Math.floor(x - r), Math.floor(y - r)) && this.walk(Math.floor(x + r), Math.floor(y - r)) &&
      this.walk(Math.floor(x - r), Math.floor(y + r)) && this.walk(Math.floor(x + r), Math.floor(y + r)))) return false;
    var E = this.edges, fx = Math.floor(x), fy = Math.floor(y);
    for (var gx = fx; gx <= fx + 1; gx++) for (var gy = Math.floor(y - r) - 1; gy <= Math.floor(y + r) + 1; gy++) {
      if (E["v:" + gx + ":" + gy]) { var dy = Math.max(0, gy - y, y - (gy + 1)); if (Math.hypot(x - gx, dy) < r + 0.02) return false; }
    }
    for (gy = fy; gy <= fy + 1; gy++) for (gx = Math.floor(x - r) - 1; gx <= Math.floor(x + r) + 1; gx++) {
      if (E["h:" + gx + ":" + gy]) { var dx = Math.max(0, gx - x, x - (gx + 1)); if (Math.hypot(y - gy, dx) < r + 0.02) return false; }
    }
    return true;
  };
  P.step = function (cx, cy, dx, dy) { // можно ли шагнуть из клетки в соседнюю, не пройдя сквозь стену
    var E = this.edges;
    if (dx && dy) return this.step(cx, cy, dx, 0) && this.step(cx + dx, cy, 0, dy) && this.step(cx, cy, 0, dy) && this.step(cx, cy + dy, dx, 0);
    if (dx) return !E["v:" + (dx > 0 ? cx + 1 : cx) + ":" + cy];
    return !E["h:" + cx + ":" + (dy > 0 ? cy + 1 : cy)];
  };
  // стена по линии сетки: (x0,y0)-(x1,y1), o: {h, col, top, gaps:[начала пропусков], key}
  P.wall = function (x0, y0, x1, y1, o) {
    var W = this; o = o || {};
    var horiz = y0 === y1, a = horiz ? Math.min(x0, x1) : Math.min(y0, y1), b = horiz ? Math.max(x0, x1) : Math.max(y0, y1);
    var h = o.h || 26, col = o.col || "#EDE6DA", top = o.top || "#FFFFFF", gaps = o.gaps || [];
    for (var u = a; u < b; u++) {
      if (gaps.indexOf(u) >= 0) continue;
      var key = horiz ? "h:" + u + ":" + y0 : "v:" + x0 + ":" + u;
      if (W.edges[key]) continue;
      W.edges[key] = 1;
      (function (u) {
        if (horiz) W.prop(u + 0.5 + y0 + (o.dk || 0), function () { W.box(u, y0 - 0.06, 0, 1, 0.12, h, col, { top: top, left: col, right: shade(col, -0.14) }); });
        else W.prop(x0 + u + 0.5 + (o.dk || 0), function () { W.box(x0 - 0.06, u, 0, 0.12, 1, h, col, { top: top, left: shade(col, -0.07), right: shade(col, -0.16) }); });
      })(u);
    }
  };
  P.prop = function (k, fn) { this.props.push({ k: k, d: fn }); };

  // примитивы рисования в координатах мира
  P.poly = function (pts, fill, stroke, lw) {
    var c = this.ctx; c.beginPath();
    for (var i = 0; i < pts.length; i++) { if (i) c.lineTo(pts[i][0], pts[i][1]); else c.moveTo(pts[i][0], pts[i][1]); }
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  };
  P.box = function (x, y, z, w, d, h, col, o) {
    var I = this.iso.bind(this), top = (o && o.top) || shade(col, 0.2), left = (o && o.left) || col, right = (o && o.right) || shade(col, -0.2);
    this.poly([I(x, y + d, z), I(x + w, y + d, z), I(x + w, y + d, z + h), I(x, y + d, z + h)], left);
    this.poly([I(x + w, y, z), I(x + w, y + d, z), I(x + w, y + d, z + h), I(x + w, y, z + h)], right);
    this.poly([I(x, y, z + h), I(x + w, y, z + h), I(x + w, y + d, z + h), I(x, y + d, z + h)], top);
  };
  P.face = function (axis, a0, a1, at, z0, z1, fill) { // прямоугольник на вертикальной грани: axis 'x' — грань y=at, 'y' — грань x=at
    var I = this.iso.bind(this);
    if (axis === 'x') this.poly([I(a0, at, z0), I(a1, at, z0), I(a1, at, z1), I(a0, at, z1)], fill);
    else this.poly([I(at, a0, z0), I(at, a1, z0), I(at, a1, z1), I(at, a0, z1)], fill);
  };
  P.faceText = function (str, x, y, z, axis, font, color, align) { // axis 'x': текст вдоль +x; 'y': вдоль −y (точка x,y — левый край)
    var c = this.ctx, p = this.iso(x, y, z);
    c.save(); c.transform(1, axis === 'x' ? 0.5 : -0.5, 0, 1, p[0], p[1]);
    c.font = font; c.fillStyle = color; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillText(str, 0, 0);
    c.restore();
  };
  P.cyl = function (cx, cy, z, r, h, col, topCol) {
    var c = this.ctx, b = this.iso(cx, cy, z), t = this.iso(cx, cy, z + h), rx = r * TW / R2, ry = r * TH / R2;
    var g = c.createLinearGradient(b[0] - rx, 0, b[0] + rx, 0); g.addColorStop(0, shade(col, 0.1)); g.addColorStop(1, shade(col, -0.28));
    c.fillStyle = g; c.beginPath(); c.moveTo(t[0] - rx, t[1]); c.lineTo(t[0] + rx, t[1]); c.lineTo(b[0] + rx, b[1]);
    c.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI); c.closePath(); c.fill();
    c.fillStyle = topCol || shade(col, 0.2); c.beginPath(); c.ellipse(t[0], t[1], rx, ry, 0, 0, 7); c.fill();
  };
  P.ell = function (cx, cy, z, r, fill, stroke, lw) {
    var c = this.ctx, p = this.iso(cx, cy, z); c.beginPath(); c.ellipse(p[0], p[1], r * TW / R2, r * TH / R2, 0, 0, 7);
    if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  };
  P.shadow = function (x, y, r, a) { this.ell(x, y, 0, r, 'rgba(0,0,0,' + (a || 0.16) + ')'); };
  P.dia = function (x, y, w, h, fill) { var I = this.iso.bind(this); this.poly([I(x, y), I(x + w, y), I(x + w, y + h), I(x, y + h)], fill); };

  // человек: X,Y — точка между ступнями в координатах экрана мира
  function hair(c, L, hy, front) {
    if (!L.hair) return;
    c.fillStyle = L.hair; var s = L.style || 'short';
    if (!front) {
      dot(c, 0, hy, 9);
      if (s === 'long') { rr(c, -9, hy, 18, 16, 6); c.fill(); }
      if (s === 'bob') { rr(c, -9.4, hy - 1, 18.8, 10, 5); c.fill(); }
      if (s === 'bun') dot(c, 0, hy - 10, 4.3);
      if (s === 'cap') { c.beginPath(); c.ellipse(-3, hy - 2, 8, 2.4, 0, 0, 7); c.fill(); }
      return;
    }
    if (s === 'cap') { c.beginPath(); c.arc(0, hy - 1, 9.1, Math.PI, 0); c.closePath(); c.fill(); c.beginPath(); c.ellipse(4.5, hy - 1.6, 8.5, 2.4, 0, 0, 7); c.fill(); return; }
    c.beginPath(); c.arc(0, hy, 9.2, Math.PI, Math.PI * 2); c.lineTo(9, hy); c.quadraticCurveTo(3, hy - 5.8, -2, hy - 3.6); c.quadraticCurveTo(-6.5, hy - 1.8, -9, hy + 0.6); c.closePath(); c.fill();
    if (s === 'bun') dot(c, 0, hy - 10.5, 4.4);
    if (s === 'curly') [-7, -3.5, 0, 3.5, 7].forEach(function (dx) { dot(c, dx, hy - 6.5 + Math.abs(dx) * 0.35, 3.5); });
    if (s === 'bob') { rr(c, -9.8, hy - 3, 4, 11, 2); c.fill(); rr(c, 5.8, hy - 3, 4, 11, 2); c.fill(); }
    if (s === 'long') { rr(c, -10, hy - 3, 3.8, 18, 2); c.fill(); rr(c, 6.2, hy - 3, 3.8, 18, 2); c.fill(); }
  }
  P.person = function (c, X, Y, L, st) {
    var pose = st.pose || 'stand', mv = !!st.moving, sw = mv ? Math.sin(st.walk || 0) : 0;
    var bob = mv ? Math.abs(Math.cos(st.walk || 0)) * 1.6 : Math.sin(this.t * 2.2 + (L.seed || 0)) * 0.45;
    c.save(); c.translate(X, Y);
    c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(0, 0, 11, 4.8, 0, 0, 7); c.fill();
    if (st.ring) { c.strokeStyle = 'rgba(230,32,32,.9)'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 14, 6.5, 0, 0, 7); c.stroke(); }
    if (st.flip < 0) c.scale(-1, 1);
    var sit = pose === 'sit', hip = sit ? -12 : -14 - bob, top = hip - 17, hy = top - 8.6, front = st.face !== -1;
    if (front && (L.style === 'long' || L.style === 'bob')) { c.fillStyle = L.hair; rr(c, -9.6, hy - 8, 19.2, L.style === 'long' ? 25 : 16, 8); c.fill(); }
    c.fillStyle = L.pants;
    if (sit) {
      rr(c, -7, hip - 3, 6, 11, 3); c.fill(); rr(c, 1, hip - 3, 6, 11, 3); c.fill();
      c.fillStyle = '#2B2523'; c.beginPath(); c.ellipse(-4, hip + 8.5, 3.6, 2.2, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(4, hip + 8.5, 3.6, 2.2, 0, 0, 7); c.fill();
    } else {
      var l1 = Math.min(0, sw * 2.4), l2 = Math.min(0, -sw * 2.4);
      rr(c, -6, hip, 5, -hip - 1 + l1, 2.5); c.fill(); rr(c, 1, hip, 5, -hip - 1 + l2, 2.5); c.fill();
      c.fillStyle = '#2B2523'; c.beginPath(); c.ellipse(-3.5, -1.5 + l1, 3.7, 2.2, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(3.5, -1.5 + l2, 3.7, 2.2, 0, 0, 7); c.fill();
    }
    var g = c.createLinearGradient(-8, 0, 8, 0); g.addColorStop(0, shade(L.shirt, 0.14)); g.addColorStop(1, shade(L.shirt, -0.16));
    c.fillStyle = g; rr(c, -8, top, 16, 18, 6); c.fill();
    if (front && L.acc === 'badge') { c.fillStyle = '#FFFFFF'; c.fillRect(-6, top + 5, 4.6, 3.2); }
    if (front && L.acc === 'tie') { c.fillStyle = '#B3121A'; c.beginPath(); c.moveTo(-1.6, top + 1); c.lineTo(1.6, top + 1); c.lineTo(1, top + 11); c.lineTo(0, top + 13); c.lineTo(-1, top + 11); c.closePath(); c.fill(); }
    var a = mv ? -sw * 2.6 : 0;
    c.fillStyle = shade(L.shirt, -0.08); rr(c, -11.2, top + 1 + a, 4.3, 12, 2.1); c.fill(); rr(c, 6.9, top + 1 - a, 4.3, 12, 2.1); c.fill();
    c.fillStyle = L.skin; dot(c, -9, top + 13.6 + a, 2.25); dot(c, 9, top + 13.6 - a, 2.25);
    if (st.cup) { c.fillStyle = '#FFFFFF'; c.fillRect(7.4, top + 9.5 - a, 4.6, 5.5); c.fillStyle = '#E62020'; c.fillRect(7.4, top + 11 - a, 4.6, 1.5); }
    if (st.phone) { c.fillStyle = '#1C1313'; c.fillRect(-3, top + 9, 6, 8); c.fillStyle = '#7FB2FF'; c.fillRect(-2.2, top + 9.8, 4.4, 6.4); }
    c.fillStyle = shade(L.skin, -0.1); c.fillRect(-2.2, top - 2.6, 4.4, 3.6);
    c.fillStyle = L.skin; dot(c, 0, hy, 8.6);
    if (front) {
      c.fillStyle = '#2A1E1A'; dot(c, -3, hy + 1, 1.25); dot(c, 3, hy + 1, 1.25);
      c.fillStyle = 'rgba(255,120,120,.28)'; dot(c, -5.3, hy + 4, 1.9); dot(c, 5.3, hy + 4, 1.9);
      c.strokeStyle = '#7A3B2E'; c.lineWidth = 1.1; c.beginPath(); c.arc(0, hy + 3.4, 2, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      if (L.acc === 'glasses') {
        c.strokeStyle = '#1C1313'; c.lineWidth = 1.1;
        c.beginPath(); c.arc(-3, hy + 1, 2.7, 0, 7); c.stroke(); c.beginPath(); c.arc(3, hy + 1, 2.7, 0, 7); c.stroke();
        c.beginPath(); c.moveTo(-0.4, hy + 1); c.lineTo(0.4, hy + 1); c.stroke();
      }
    }
    hair(c, L, hy, front);
    if (L.acc === 'phones') {
      c.strokeStyle = '#1C1313'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, hy, 10.2, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
      c.fillStyle = '#E62020'; rr(c, -11.8, hy - 2.5, 4.2, 6.5, 2); c.fill(); rr(c, 7.6, hy - 2.5, 4.2, 6.5, 2); c.fill();
    }
    c.restore();
  };

  // пути: A* по клеткам и спрямление
  P.nearest = function (x, y) {
    for (var r = 1; r < 8; r++) {
      var best = null, bd = 1e9;
      for (var yy = y - r; yy <= y + r; yy++) for (var xx = x - r; xx <= x + r; xx++) {
        if (!this.walk(xx, yy)) continue;
        var d = Math.hypot(xx - x, yy - y); if (d < bd) { bd = d; best = [xx, yy]; }
      }
      if (best) return best;
    }
    return null;
  };
  P.los = function (a, b) {
    var d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.2);
    for (var i = 1; i <= n; i++) { var t = i / n; if (!this.free(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.24)) return false; }
    return true;
  };
  P.path = function (sx, sy, tx, ty) {
    var W = this, cols = W.cols, s = [Math.floor(sx), Math.floor(sy)], t = [Math.floor(tx), Math.floor(ty)];
    if (!W.walk(t[0], t[1])) { t = W.nearest(t[0], t[1]); if (!t) return null; tx = t[0] + 0.5; ty = t[1] + 0.5; }
    if (!W.walk(s[0], s[1])) return null;
    var key = function (x, y) { return y * cols + x; }, sk = key(s[0], s[1]), tk = key(t[0], t[1]);
    var open = [sk], g = {}, f = {}, came = {}, closed = {};
    var h = function (x, y) { var dx = Math.abs(x - t[0]), dy = Math.abs(y - t[1]); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    g[sk] = 0; f[sk] = h(s[0], s[1]);
    var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (open.length) {
      var bi = 0; for (var i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
      var cur = open.splice(bi, 1)[0], cx = cur % cols, cy = (cur / cols) | 0;
      if (cur === tk) {
        var pts = [], k = cur;
        while (k !== sk) { pts.unshift([(k % cols) + 0.5, ((k / cols) | 0) + 0.5]); k = came[k]; }
        if (pts.length) pts[pts.length - 1] = [tx, ty]; else pts = [[tx, ty]];
        var all = [[sx, sy]].concat(pts), out = [], a = 0;
        while (a < all.length - 1) { var j = all.length - 1; while (j > a + 1 && !W.los(all[a], all[j])) j--; out.push(all[j]); a = j; }
        return out;
      }
      closed[cur] = 1;
      for (var di = 0; di < 8; di++) {
        var dx = DIRS[di][0], dy = DIRS[di][1], nx = cx + dx, ny = cy + dy;
        if (!W.walk(nx, ny)) continue;
        if (dx && dy && (!W.walk(cx + dx, cy) || !W.walk(cx, cy + dy))) continue;
        if (!W.step(cx, cy, dx, dy)) continue;
        var nk = key(nx, ny); if (closed[nk]) continue;
        var ng = g[cur] + (dx && dy ? 1.414 : 1);
        if (g[nk] === undefined || ng < g[nk]) { g[nk] = ng; f[nk] = ng + h(nx, ny); came[nk] = cur; if (open.indexOf(nk) < 0) open.push(nk); }
      }
    }
    return null;
  };
  P.goTo = function (x, y, spot) {
    var p = this.player, path = this.path(p.x, p.y, x, y);
    if (path) { p.path = path; p.pending = spot || null; this.tap = { x: path[path.length - 1][0], y: path[path.length - 1][1], t: this.t }; }
    return !!path;
  };
  P.goSpot = function (s) {
    var p = this.player;
    if (Math.hypot(p.x - s.x, p.y - s.y) < 0.45) { this.arrive(s); return; }
    this.goTo(s.x, s.y, s);
  };
  P.arrive = function (s) { if (s && s.look) { if (this.o.onTalk) this.o.onTalk(s); else this.talk(s); } else if (this.o.onSpot) this.o.onSpot(s); };
  P.goNpc = function (n) {
    var p = this.player, ax = n.ax != null ? n.ax : null, ay = n.ay;
    if (ax == null) {
      var best = null, bd = 1e9, cx = Math.floor(n.x), cy = Math.floor(n.y);
      for (var yy = cy - 1; yy <= cy + 1; yy++) for (var xx = cx - 1; xx <= cx + 1; xx++) {
        if ((xx === cx && yy === cy) || !this.walk(xx, yy)) continue;
        var d = Math.hypot(xx + 0.5 - p.x, yy + 0.5 - p.y); if (d < bd) { bd = d; best = [xx + 0.5, yy + 0.5]; }
      }
      if (!best) { this.arrive(n); return; } ax = best[0]; ay = best[1];
    }
    if (Math.hypot(p.x - ax, p.y - ay) < 0.5 || Math.hypot(p.x - n.x, p.y - n.y) < 1.3) { this.arrive(n); return; }
    if (!this.goTo(ax, ay, n)) this.arrive(n);
  };
  P.say = function (n, text, ms) {
    this.bubbles = this.bubbles.filter(function (b) { return b.n !== n; });
    this.bubbles.push({ n: n, text: text, until: this.t + (ms || 4200) / 1000 });
  };
  P.talk = function (n) { if (!n.lines || !n.lines.length) return; n.li = ((n.li == null ? -1 : n.li) + 1) % n.lines.length; this.say(n, n.lines[n.li]); };

  // экран ↔ мир
  P.toScreen = function (X, Y) { return [(X - this.cam.x) * this.zoom + this.vw / 2, (Y - this.cam.y) * this.zoom + this.vh / 2]; };
  P.toTile = function (sx, sy) {
    var X = (sx - this.vw / 2) / this.zoom + this.cam.x, Y = (sy - this.vh / 2) / this.zoom + this.cam.y, a = X / (TW / 2), b = Y / (TH / 2);
    return [(a + b) / 2, (b - a) / 2];
  };
  P.resize = function () {
    var W = this, r = W.stage.getBoundingClientRect();
    W.vw = Math.max(200, r.width); W.vh = Math.max(200, r.height);
    W.dpr = Math.min(window.devicePixelRatio || 1, 2);
    W.cv.width = Math.round(W.vw * W.dpr); W.cv.height = Math.round(W.vh * W.dpr);
    W.cv.style.width = W.vw + 'px'; W.cv.style.height = W.vh + 'px';
    var b = W.bounds, fit = Math.min(W.vw / (b.x1 - b.x0), W.vh / (b.y1 - b.y0));
    W.zoom = Math.max(W.o.minZoom || 0.6, Math.min(W.o.maxZoom || 1.1, fit));
  };
  P.bakeGround = function (fn) {
    var W = this, gs = 2, b = W.bounds;
    W.gx = b.x0; W.gy = 0; W.gw = b.x1 - b.x0; W.gh = b.y1;
    var g = document.createElement('canvas'); g.width = Math.ceil(W.gw * gs); g.height = Math.ceil(W.gh * gs);
    var gc = g.getContext('2d'); gc.setTransform(gs, 0, 0, gs, -W.gx * gs, 0);
    var keep = W.ctx; W.ctx = gc; fn(W, gc); W.ctx = keep; W.ground = g;
  };

  // ход времени
  P.update = function (dt) {
    var W = this, p = W.player, sp = 3.3, K = W.keys, kx = 0, ky = 0, mx = 0, my = 0;
    if (K.up) { kx -= 1; ky -= 1; } if (K.down) { kx += 1; ky += 1; } if (K.left) { kx -= 1; ky += 1; } if (K.right) { kx += 1; ky -= 1; }
    if (kx || ky) { p.path = null; p.pending = null; var l = Math.hypot(kx, ky); mx = kx / l * sp * dt; my = ky / l * sp * dt; }
    else if (p.path && p.path.length) {
      var tg = p.path[0], dx = tg[0] - p.x, dy = tg[1] - p.y, d = Math.hypot(dx, dy), st = sp * dt;
      if (d <= st) {
        mx = dx; my = dy; p.path.shift();
        if (!p.path.length) { p.path = null; if (p.pending) { var s = p.pending; p.pending = null; W.arrive(s); } }
      } else { mx = dx / d * st; my = dy / d * st; }
    }
    if (mx || my) {
      var ox = p.x, oy = p.y;
      if (W.free(p.x + mx, p.y, 0.22)) p.x += mx;
      if (W.free(p.x, p.y + my, 0.22)) p.y += my;
      if (p.x === ox && p.y === oy && p.path) { p.path = null; p.pending = null; }
      p.moving = true; p.walk += dt * 11;
      var sx = mx - my, sy = mx + my;
      if (Math.abs(sx) > 1e-4) p.flip = sx > 0 ? 1 : -1;
      p.face = sy < -1e-4 ? -1 : 1;
    } else p.moving = false;
    W.npcs.forEach(function (n) {
      if (!n.orbit) return;
      var o = n.orbit, ox = n.x, oy = n.y;
      n.ang = (n.ang || 0) + o.sp * dt;
      n.x = o.cx + Math.cos(n.ang) * o.rx; n.y = o.cy + Math.sin(n.ang) * o.ry;
      var sx2 = (n.x - ox) - (n.y - oy), sy2 = (n.x - ox) + (n.y - oy);
      n.flip = sx2 > 0 ? 1 : -1; n.face = sy2 < 0 ? -1 : 1; n.moving = true; n.walk = (n.walk || 0) + dt * 9;
    });
    var near = null, nd = 1e9;
    W.spots.forEach(function (s) { if (s.off) return; var d2 = Math.hypot(p.x - s.x, p.y - s.y); if (d2 < (s.r || 1.25) && d2 < nd) { nd = d2; near = s; } });
    W.npcs.forEach(function (n) { if (!n.talkable) return; var d3 = Math.hypot(p.x - n.x, p.y - n.y); if (d3 < 1.45 && d3 < nd) { nd = d3; near = n; } });
    if (near !== W.near) { W.near = near; if (W.o.onNear) W.o.onNear(near); }
    W.chatAt -= dt;
    if (W.chatAt <= 0) {
      W.chatAt = 6 + Math.random() * 6;
      var talkers = W.npcs.filter(function (n) { return n.lines && n.lines.length; });
      if (talkers.length) W.talk(talkers[Math.floor(Math.random() * talkers.length)]);
    }
    W.bubbles = W.bubbles.filter(function (b) { return b.until > W.t; });
    var b = W.bounds, hw = W.vw / 2 / W.zoom, hh = W.vh / 2 / W.zoom, pp = W.iso(p.x, p.y, 0);
    var tx = (b.x1 - b.x0) <= 2 * hw ? (b.x0 + b.x1) / 2 : Math.max(b.x0 + hw, Math.min(b.x1 - hw, pp[0]));
    var ty = (b.y1 - b.y0) <= 2 * hh ? (b.y0 + b.y1) / 2 : Math.max(b.y0 + hh, Math.min(b.y1 - hh, pp[1] - 20));
    if (W.camInit) { var q = Math.min(1, dt * 5); W.cam.x += (tx - W.cam.x) * q; W.cam.y += (ty - W.cam.y) * q; }
    else { W.cam.x = tx; W.cam.y = ty; W.camInit = true; }
  };

  P.draw = function () {
    var W = this, c = W.ctx, z = W.zoom, d = W.dpr, p = W.player;
    c.setTransform(d, 0, 0, d, 0, 0); c.fillStyle = W.o.bg || '#5E9B49'; c.fillRect(0, 0, W.vw, W.vh);
    c.setTransform(z * d, 0, 0, z * d, (W.vw / 2 - W.cam.x * z) * d, (W.vh / 2 - W.cam.y * z) * d);
    if (W.ground) c.drawImage(W.ground, W.gx, W.gy, W.gw, W.gh);
    W.spots.forEach(function (s) {
      if (s.hideRing) return;
      var q = (W.t * 0.8 + (s.seed || 0)) % 1, hot = s === W.near || s === W.hoverSpot;
      W.ell(s.x, s.y, 0, 0.35 + q * 0.35, null, 'rgba(255,255,255,' + (hot ? 0.9 : 0.55) * (1 - q) + ')', 2);
      W.ell(s.x, s.y, 0, 0.28, hot ? 'rgba(230,32,32,.35)' : 'rgba(255,255,255,.22)');
    });
    if (W.tap && W.t - W.tap.t < 0.6) { var tq = (W.t - W.tap.t) / 0.6; W.ell(W.tap.x, W.tap.y, 0, 0.2 + tq * 0.3, null, 'rgba(255,255,255,' + (1 - tq) + ')', 2); }
    var list = W.props.slice();
    W.npcs.forEach(function (n) { if (n.pose !== 'hidden') list.push({ k: n.x + n.y + (n.dk || 0), n: n }); });
    list.push({ k: p.x + p.y, n: p });
    list.sort(function (a, b) { return a.k - b.k; });
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.n) { var pp = W.iso(it.n.x, it.n.y, it.n.z || 0); W.person(c, pp[0], pp[1], it.n.look, { walk: it.n.walk, moving: it.n.moving, face: it.n.face, flip: it.n.flip, pose: it.n.pose, ring: it.n.me, cup: it.n.cup, phone: it.n.phone }); }
      else it.d(c, W);
    }
    c.setTransform(d, 0, 0, d, 0, 0);
    if (W.night) {
      c.globalCompositeOperation = 'multiply'; c.fillStyle = '#6D74A6'; c.fillRect(0, 0, W.vw, W.vh);
      c.globalCompositeOperation = 'lighter';
      W.lights.forEach(function (L) {
        var w = W.iso(L[0], L[1], L[2]), s = W.toScreen(w[0], w[1]), r = L[3] * z;
        var g = c.createRadialGradient(s[0], s[1], 0, s[0], s[1], r);
        g.addColorStop(0, L[4] || 'rgba(255,196,110,.5)'); g.addColorStop(1, 'rgba(255,196,110,0)');
        c.fillStyle = g; c.fillRect(s[0] - r, s[1] - r, 2 * r, 2 * r);
      });
      c.globalCompositeOperation = 'source-over';
    }
    // подписи мест
    var FONT = W.o.font || "Onest, 'Segoe UI', sans-serif";
    W.spots.forEach(function (s) {
      if (s.off) return;
      if (!s.game && s.label && (s === W.near || s === W.hoverSpot || s.mark)) {
        var la = W.iso(s.tx != null ? s.tx : s.x, s.ty != null ? s.ty : s.y, s.tz || 40), ls = W.toScreen(la[0], la[1]);
        c.font = "700 11.5px " + FONT; var lw = c.measureText(s.label).width + (s.mark ? 34 : 18), lx = ls[0] - lw / 2, ly = ls[1] - 30 + Math.sin(W.t * 2.4 + (s.seed || 0) * 5) * 1.5;
        c.fillStyle = "rgba(0,0,0,.2)"; rr(c, lx + 1, ly + 2, lw, 24, 12); c.fill();
        c.fillStyle = s.mark ? "#FFD447" : "#FFFFFF"; rr(c, lx, ly, lw, 24, 12); c.fill();
        c.fillStyle = "#1C1313"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText((s.mark ? s.mark + "  " : "") + s.label, ls[0], ly + 12.5);
        s.rect = [lx, ly, lw, 30];
        return;
      }
      if (!s.game) { s.rect = null; return; }
      var a = W.iso(s.tx, s.ty, s.tz), sc = W.toScreen(a[0], a[1]), hot = s === W.near || s === W.hoverSpot;
      c.font = '700 10px ' + FONT; var w1 = c.measureText(s.place.toUpperCase()).width;
      c.font = '800 13px ' + FONT; var w2 = c.measureText(s.game).width;
      var w = Math.max(w1, w2) + 22, h = 38, x = sc[0] - w / 2, y = sc[1] - h - 8 + Math.sin(W.t * 2 + (s.seed || 0) * 6) * 1.5;
      c.fillStyle = 'rgba(0,0,0,.18)'; rr(c, x + 1, y + 3, w, h, 12); c.fill();
      c.fillStyle = hot ? '#E62020' : '#FFFFFF'; rr(c, x, y, w, h, 12); c.fill();
      c.beginPath(); c.moveTo(sc[0] - 6, y + h - 0.5); c.lineTo(sc[0] + 6, y + h - 0.5); c.lineTo(sc[0], y + h + 7); c.closePath(); c.fill();
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '700 10px ' + FONT; c.fillStyle = hot ? 'rgba(255,255,255,.85)' : '#8A7470'; c.fillText(s.place.toUpperCase(), sc[0], y + 12);
      c.font = '800 13px ' + FONT; c.fillStyle = hot ? '#FFFFFF' : '#1C1313'; c.fillText(s.game, sc[0], y + 26);
      if (s.badge) { c.fillStyle = '#FFD447'; rr(c, x + w - 16, y - 7, 22, 15, 7); c.fill(); c.fillStyle = '#1C1313'; c.font = '800 9px ' + FONT; c.fillText(s.badge, x + w - 5, y + 0.5); }
      s.rect = [x, y, w, h + 8];
    });
    // маркеры заданий над людьми
    W.npcs.forEach(function (n) {
      if (!n.mark || n.pose === "hidden") return;
      var a = W.iso(n.x, n.y, (n.z || 0) + (n.pose === "sit" ? 62 : 72)), sc = W.toScreen(a[0], a[1]), by = sc[1] - 10 + Math.sin(W.t * 3 + (n.look && n.look.seed || 0)) * 3;
      c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.arc(sc[0] + 1, by + 2, 11, 0, 7); c.fill();
      c.fillStyle = n.mark === "!" ? "#FFD447" : "#FFFFFF"; c.beginPath(); c.arc(sc[0], by, 11, 0, 7); c.fill();
      c.strokeStyle = "#E62020"; c.lineWidth = 2.5; c.stroke();
      c.fillStyle = "#E62020"; c.font = "800 14px " + FONT; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(n.mark, sc[0], by + 1);
    });
    if (W.near && W.near.look && W.near.talkable) {
      var nn = W.near, na = W.iso(nn.x, nn.y, (nn.z || 0) + (nn.pose === "sit" ? 50 : 60)), ns = W.toScreen(na[0], na[1]);
      c.font = "700 11px " + FONT; var nw = c.measureText(nn.name || "").width + 16;
      c.fillStyle = "rgba(28,19,19,.85)"; rr(c, ns[0] - nw / 2, ns[1] - (nn.mark ? 46 : 24), nw, 20, 10); c.fill();
      c.fillStyle = "#FFFFFF"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(nn.name || "", ns[0], ns[1] - (nn.mark ? 36 : 14));
    }
    // реплики
    W.bubbles.forEach(function (b) {
      var n = b.n, a = W.iso(n.x, n.y, (n.z || 0) + (n.pose === 'sit' ? 48 : n.pose === 'hidden' ? 30 : 58)), sc = W.toScreen(a[0], a[1]);
      var lines = wrap(b.text, 26); c.font = '600 12px ' + FONT;
      var w = Math.max.apply(null, lines.map(function (l) { return c.measureText(l).width; })) + 18, h = lines.length * 15 + 12;
      var x = Math.max(6, Math.min(W.vw - w - 6, sc[0] - w / 2)), y = sc[1] - h - 12;
      var fade = Math.min(1, (b.until - W.t) * 3);
      c.globalAlpha = fade;
      c.fillStyle = 'rgba(0,0,0,.16)'; rr(c, x + 1, y + 3, w, h, 10); c.fill();
      c.fillStyle = '#FFFFFF'; rr(c, x, y, w, h, 10); c.fill();
      c.beginPath(); c.moveTo(sc[0] - 5, y + h - 0.5); c.lineTo(sc[0] + 5, y + h - 0.5); c.lineTo(sc[0], y + h + 7); c.closePath(); c.fill();
      c.fillStyle = '#1C1313'; c.textAlign = 'left'; c.textBaseline = 'top';
      lines.forEach(function (l, i) { c.fillText(l, x + 9, y + 7 + i * 15); });
      if (n.name) { c.font = '700 10px ' + FONT; c.fillStyle = '#E62020'; c.fillText(n.name, x + 9, y - 13); }
      c.globalAlpha = 1;
    });
  };

  // ввод
  P.bind = function () {
    var W = this, cv = W.cv, down = null;
    function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    cv.addEventListener('pointerdown', function (e) { down = pos(e); });
    cv.addEventListener('pointerup', function (e) {
      if (!down) return; var q = pos(e), moved = Math.hypot(q[0] - down[0], q[1] - down[1]) > 10; down = null;
      if (!moved) W.click(q[0], q[1]);
    });
    cv.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var q = pos(e), s = W.spotAt(q[0], q[1]);
      W.hoverSpot = s; cv.style.cursor = s || W.npcAt(q[0], q[1]) ? 'pointer' : 'default';
    });
    var MAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    window.addEventListener('keydown', function (e) {
      if (W.o.blocked && W.o.blocked()) return;
      if (MAP[e.code]) { W.keys[MAP[e.code]] = true; e.preventDefault(); }
      if ((e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') && W.near) { e.preventDefault(); W.arrive(W.near); }
    });
    window.addEventListener('keyup', function (e) { if (MAP[e.code]) W.keys[MAP[e.code]] = false; });
  };
  P.spotAt = function (sx, sy) {
    for (var i = 0; i < this.spots.length; i++) { var s = this.spots[i], r = s.rect; if (r && sx >= r[0] && sx <= r[0] + r[2] && sy >= r[1] && sy <= r[1] + r[3]) return s; }
    var t = this.toTile(sx, sy);
    for (i = 0; i < this.spots.length; i++) { s = this.spots[i]; if (s.hx != null && Math.hypot(t[0] - s.hx, t[1] - s.hy) < s.hr) return s; }
    return null;
  };
  P.npcAt = function (sx, sy) {
    for (var i = 0; i < this.npcs.length; i++) {
      var n = this.npcs[i], a = this.iso(n.x, n.y, n.z || 0), s = this.toScreen(a[0], a[1]), h = (n.pose === 'sit' ? 46 : n.pose === 'hidden' ? 26 : 56) * this.zoom;
      if (Math.abs(sx - s[0]) < 13 * this.zoom + 4 && sy < s[1] + 4 && sy > s[1] - h) return n;
    }
    return null;
  };
  P.click = function (sx, sy) {
    if (this.o.blocked && this.o.blocked()) return;
    var n = this.npcAt(sx, sy); if (n) { if (n.talkable) this.goNpc(n); else this.talk(n); return; }
    var s = this.spotAt(sx, sy); if (s) { this.goSpot(s); return; }
    var t = this.toTile(sx, sy); this.goTo(t[0], t[1]);
  };
  P.start = function () {
    var W = this, last = performance.now();
    function f(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!W.paused) { W.t += dt; W.update(dt); }
      W.draw(); requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  };

  window.Iso = { World: World, shade: shade, hash: hash, TW: TW, TH: TH };
})();
